import { env } from "./env.js";

async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: env.RESEND_FROM_EMAIL, to, subject, html }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend API error ${res.status}: ${body}`);
  }
}

export async function sendVideoReadyEmail(
  toEmail: string,
  firstName: string | null,
  videoTitle: string,
  videoUrl: string,
): Promise<void> {
  const name = firstName ?? "there";
  const subject = `Your video "${videoTitle}" is ready! 🎬`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #13131A; color: #F4F4F8; padding: 40px; border-radius: 12px;">
      <h1 style="color: #7C5CFC; margin-bottom: 8px;">ReelForge</h1>
      <h2 style="margin-top: 0;">Hey ${name}, your video is ready!</h2>
      <p style="color: #9898B0;">
        <strong style="color: #F4F4F8;">"${videoTitle}"</strong> has finished processing and is ready to download.
      </p>
      <a href="${videoUrl}" style="
        display: inline-block;
        background: #7C5CFC;
        color: white;
        text-decoration: none;
        padding: 14px 28px;
        border-radius: 8px;
        font-weight: bold;
        margin: 16px 0;
      ">View &amp; Download Video</a>
      <p style="color: #5A5A72; font-size: 13px; margin-top: 32px;">
        The download link expires in 7 days. You can always access your videos from your ReelForge library.
      </p>
    </div>
  `;
  await sendEmail(toEmail, subject, html);
}

export async function sendVideoFailedEmail(
  toEmail: string,
  firstName: string | null,
  videoTitle: string,
  retryUrl: string,
): Promise<void> {
  const name = firstName ?? "there";
  const subject = `Something went wrong with "${videoTitle}"`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #13131A; color: #F4F4F8; padding: 40px; border-radius: 12px;">
      <h1 style="color: #7C5CFC; margin-bottom: 8px;">ReelForge</h1>
      <h2 style="margin-top: 0;">Hey ${name}, your video hit a snag.</h2>
      <p style="color: #9898B0;">
        We ran into a problem while assembling <strong style="color: #F4F4F8;">"${videoTitle}"</strong>.
        Don't worry — your clips are safe. You can retry the assembly from your dashboard.
      </p>
      <a href="${retryUrl}" style="
        display: inline-block;
        background: #F87171;
        color: white;
        text-decoration: none;
        padding: 14px 28px;
        border-radius: 8px;
        font-weight: bold;
        margin: 16px 0;
      ">View Video &amp; Retry</a>
      <p style="color: #5A5A72; font-size: 13px; margin-top: 32px;">
        If the problem persists, contact us at support@reelforge.com.
      </p>
    </div>
  `;
  await sendEmail(toEmail, subject, html);
}
