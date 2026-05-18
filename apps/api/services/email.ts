import { Resend } from "resend";
import { env } from "../lib/env.js";
import { db } from "../lib/db/index.js";
import { contentPlans, users } from "../lib/db/schema.js";
import { eq } from "drizzle-orm";

const resend = new Resend(env.RESEND_API_KEY);

export async function sendBatchCompleteEmail(
  userId: string,
  planId: string,
  successCount: number,
  failCount: number,
): Promise<void> {
  const [user] = await db
    .select({ email: users.email, firstName: users.firstName })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return;

  const [plan] = await db
    .select({ brandProfileId: contentPlans.brandProfileId, weekStartDate: contentPlans.weekStartDate })
    .from(contentPlans)
    .where(eq(contentPlans.id, planId))
    .limit(1);

  const brandId = plan?.brandProfileId ?? "";
  const weekLabel = plan?.weekStartDate ? `Week of ${plan.weekStartDate}` : "Your content";
  const appUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const planUrl = `${appUrl}/brands/${brandId}/plan/${planId}`;
  const firstName = user.firstName ?? "there";

  const failLine =
    failCount > 0
      ? `<p style="color:#F87171;">${failCount} video${failCount > 1 ? "s" : ""} failed to generate.</p>`
      : "";

  await resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to: user.email,
    subject: `${weekLabel} is ready! (${successCount} video${successCount !== 1 ? "s" : ""})`,
    html: `
<div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#09090b;color:#F4F4F8;">
  <h1 style="font-size:22px;font-weight:700;margin:0 0 8px;">Hey ${firstName}, your content is ready!</h1>
  <p style="color:#a1a1aa;margin:0 0 24px;">
    ${successCount} video${successCount !== 1 ? "s" : ""} from your Week 1 content plan ${successCount !== 1 ? "have" : "has"} been assembled and ${successCount !== 1 ? "are" : "is"} ready to review.
  </p>
  ${failLine}
  <a href="${planUrl}" style="display:inline-block;background:#f55c2a;color:#fff;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none;margin-bottom:24px;">
    Review &amp; Schedule Posts →
  </a>
  <p style="color:#52525b;font-size:12px;margin:0;">
    You're receiving this email because you have an active ReelForge account.
  </p>
</div>`,
  });
}
