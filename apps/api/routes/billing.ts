import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import Stripe from "stripe";
import { requireAuth } from "../lib/auth.js";
import { db } from "../lib/db/index.js";
import { users } from "../lib/db/schema.js";
import { env } from "../lib/env.js";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-02-24.acacia",
});

// Maps Stripe price ID → plan config
const PLAN_CONFIG: Record<
  string,
  { plan: "starter" | "pro"; dailyLimit: number; monthlyLimit: number }
> = {
  [env.STRIPE_STARTER_PRICE_ID]: { plan: "starter", dailyLimit: 3, monthlyLimit: 30 },
  [env.STRIPE_PRO_PRICE_ID]: { plan: "pro", dailyLimit: 10, monthlyLimit: 100 },
};

export async function billingRoutes(fastify: FastifyInstance): Promise<void> {
  // Capture raw request body as a Buffer so Stripe webhook signature
  // verification can work. We override the JSON content-type parser within
  // this plugin's scope only — all other routes are unaffected.
  fastify.addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    (_req, body, done) => {
      (_req as unknown as { rawBody: Buffer }).rawBody = body as Buffer;
      try {
        done(null, (body as Buffer).length > 0 ? JSON.parse((body as Buffer).toString()) : {});
      } catch (e) {
        done(e as Error);
      }
    },
  );

  // ─── Public: Stripe webhook ───────────────────────────────────────────────
  fastify.post("/webhook", async (request, reply) => {
      const sig = request.headers["stripe-signature"];
      if (!sig) {
        return reply.status(400).send({ error: "Missing stripe-signature header." });
      }

      let event: Stripe.Event;
      try {
        const rawBody = (request as unknown as { rawBody: Buffer }).rawBody;
        event = stripe.webhooks.constructEvent(rawBody, sig, env.STRIPE_WEBHOOK_SECRET);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        fastify.log.warn(`Stripe signature verification failed: ${msg}`);
        return reply.status(400).send({ error: `Webhook Error: ${msg}` });
      }

      try {
        await handleStripeEvent(event);
      } catch (err) {
        fastify.log.error(err, "Stripe webhook handler error");
        return reply.status(500).send({ error: "Webhook handler failed." });
      }

      return reply.send({ received: true });
    },
  );

  // ─── Authenticated: trial checkout ───────────────────────────────────────
  fastify.post(
    "/trial-checkout",
    { preHandler: requireAuth },
    async (request, reply) => {
      const user = request.currentUser!;

      if (user.trialPaid) {
        return reply.status(409).send({
          error: { code: "ALREADY_PAID", message: "Trial already purchased." },
        });
      }

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [{ price: env.STRIPE_TRIAL_PRICE_ID, quantity: 1 }],
        customer_email: user.email,
        metadata: { userId: user.id },
        success_url: `${env.NEXT_PUBLIC_APP_URL}/billing?trial_success=1`,
        cancel_url: `${env.NEXT_PUBLIC_APP_URL}/billing`,
      });

      return reply.send({ data: { url: session.url } });
    },
  );

  // ─── Authenticated: subscription checkout ────────────────────────────────
  fastify.post<{ Body: { priceId?: string } }>(
    "/subscribe",
    { preHandler: requireAuth },
    async (request, reply) => {
      const user = request.currentUser!;
      const { priceId } = request.body ?? {};

      if (
        !priceId ||
        ![env.STRIPE_STARTER_PRICE_ID, env.STRIPE_PRO_PRICE_ID].includes(priceId)
      ) {
        return reply.status(400).send({
          error: { code: "INVALID_PRICE", message: "Invalid price ID." },
        });
      }

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        customer_email: user.email,
        metadata: { userId: user.id },
        success_url: `${env.NEXT_PUBLIC_APP_URL}/billing?subscribed=1`,
        cancel_url: `${env.NEXT_PUBLIC_APP_URL}/billing`,
      });

      return reply.send({ data: { url: session.url } });
    },
  );

  // ─── Authenticated: Stripe billing portal ────────────────────────────────
  fastify.get("/portal", { preHandler: requireAuth }, async (request, reply) => {
    const user = request.currentUser!;

    if (!user.stripeCustomerId) {
      return reply.status(409).send({
        error: { code: "NO_STRIPE_CUSTOMER", message: "No billing account found." },
      });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${env.NEXT_PUBLIC_APP_URL}/billing`,
    });

    return reply.send({ data: { url: portalSession.url } });
  });
}

// ─── Stripe event handlers ────────────────────────────────────────────────────

async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      if (!userId) return;

      if (session.mode === "payment") {
        // $2 trial payment — unlock 1 trial video
        await db
          .update(users)
          .set({
            trialPaid: true,
            trialVideoRemaining: 1,
            stripeCustomerId: session.customer as string | null,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));
      }
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const priceId = sub.items.data[0]?.price.id;
      if (!priceId) return;

      const config = PLAN_CONFIG[priceId];
      if (!config) return;

      const customerId =
        typeof sub.customer === "string" ? sub.customer : sub.customer.id;

      const [user] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.stripeCustomerId, customerId))
        .limit(1);

      if (!user) return;

      const isActive = sub.status === "active" || sub.status === "trialing";

      await db
        .update(users)
        .set({
          plan: isActive ? config.plan : "none",
          dailyLimit: isActive ? config.dailyLimit : 0,
          monthlyLimit: isActive ? config.monthlyLimit : 0,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId =
        typeof sub.customer === "string" ? sub.customer : sub.customer.id;

      const [user] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.stripeCustomerId, customerId))
        .limit(1);

      if (!user) return;

      await db
        .update(users)
        .set({ plan: "none", dailyLimit: 0, monthlyLimit: 0, updatedAt: new Date() })
        .where(eq(users.id, user.id));
      break;
    }
  }
}
