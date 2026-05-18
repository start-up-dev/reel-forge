/**
 * Test helper: builds a minimal Fastify instance with mocked Clerk auth and
 * a mocked database so tests can run without a live Neon/R2/Stripe connection.
 *
 * Usage:
 *   const { app, mockUser } = await buildTestApp()
 *   const res = await app.inject({ method: 'GET', url: '/api/projects' })
 */
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import type { UserRow } from "../../lib/db/schema.js";

export const MOCK_USER: UserRow = {
  id: "user-uuid-1234",
  clerkId: "user_clerk_1234",
  email: "test@example.com",
  firstName: "Test",
  lastName: "User",
  plan: "none",
  stripeCustomerId: null,
  trialPaid: false,
  trialVideoRemaining: 1,
  videosToday: 0,
  videosThisMonth: 0,
  dailyLimit: 0,
  monthlyLimit: 0,
  onboardingComplete: false,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

export async function buildTestApp(
  overrideUser?: Partial<UserRow>,
): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  // Inject currentUser on every request (simulates requireAuth passing)
  app.addHook("onRequest", async (request) => {
    request.currentUser = { ...MOCK_USER, ...overrideUser };
  });

  return app;
}
