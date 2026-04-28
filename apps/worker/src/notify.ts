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
    body: JSON.stringify({ from: `ReelForge <${env.RESEND_FROM_EMAIL}>`, to, subject, html }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend API error ${res.status}: ${body}`);
  }
}

function displayName(firstName: string | null, lastName: string | null, email: string): string {
  if (firstName) return firstName;
  if (lastName) return lastName;
  return email.split("@")[0] ?? email;
}

function emailWrapper(content: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:40px 16px;">
        <tr><td align="center">
          <table width="100%" style="max-width:580px;">
            <!-- Header -->
            <tr>
              <td style="padding:0 0 24px 0;">
                <span style="font-size:22px;font-weight:800;color:#f4f4f8;letter-spacing:-0.5px;">Reel<span style="color:#f55c2a;">Forge</span></span>
              </td>
            </tr>
            <!-- Card -->
            <tr>
              <td style="background:#111113;border:1px solid #27272a;border-radius:12px;padding:36px 36px 32px;">
                ${content}
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="padding:24px 0 0;text-align:center;">
                <p style="margin:0;color:#52525b;font-size:12px;line-height:1.6;">
                  You're receiving this because you have notifications enabled in your ReelForge account.<br>
                  <a href="https://viralshortai.app/settings/notifications" style="color:#a1a1aa;text-decoration:underline;">Manage notification preferences</a>
                </p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;
}

export async function sendVideoReadyEmail(
  toEmail: string,
  firstName: string | null,
  lastName: string | null,
  videoTitle: string,
  videoUrl: string,
): Promise<void> {
  const name = displayName(firstName, lastName, toEmail);
  const subject = `Your video "${videoTitle}" is ready! 🎬`;
  const html = emailWrapper(`
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#f4f4f8;">
      Hey ${name}, your video is ready!
    </h2>
    <p style="margin:0 0 20px;color:#a1a1aa;font-size:15px;line-height:1.6;">
      <strong style="color:#f4f4f8;">"${videoTitle}"</strong> has finished processing and is ready to download.
    </p>
    <a href="${videoUrl}" style="
      display:inline-block;
      background:#f55c2a;
      color:#ffffff;
      text-decoration:none;
      padding:13px 28px;
      border-radius:8px;
      font-weight:700;
      font-size:15px;
      margin-bottom:28px;
    ">View &amp; Download Video &rarr;</a>
    <p style="margin:0;color:#52525b;font-size:13px;line-height:1.6;border-top:1px solid #27272a;padding-top:20px;">
      The download link expires in 7 days. You can always access your videos from your
      <a href="${videoUrl.split("/videos/")[0]}/library" style="color:#a1a1aa;text-decoration:underline;">ReelForge library</a>.
    </p>
  `);
  await sendEmail(toEmail, subject, html);
}

export async function sendVideoFailedEmail(
  toEmail: string,
  firstName: string | null,
  lastName: string | null,
  videoTitle: string,
  retryUrl: string,
): Promise<void> {
  const name = displayName(firstName, lastName, toEmail);
  const subject = `Something went wrong with "${videoTitle}"`;
  const html = emailWrapper(`
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#f4f4f8;">
      Hey ${name}, your video hit a snag.
    </h2>
    <p style="margin:0 0 20px;color:#a1a1aa;font-size:15px;line-height:1.6;">
      We ran into a problem while assembling <strong style="color:#f4f4f8;">"${videoTitle}"</strong>.
      Don't worry — your clips are safe. You can retry the assembly from your dashboard.
    </p>
    <a href="${retryUrl}" style="
      display:inline-block;
      background:#f87171;
      color:#ffffff;
      text-decoration:none;
      padding:13px 28px;
      border-radius:8px;
      font-weight:700;
      font-size:15px;
      margin-bottom:28px;
    ">View Video &amp; Retry &rarr;</a>
    <p style="margin:0;color:#52525b;font-size:13px;line-height:1.6;border-top:1px solid #27272a;padding-top:20px;">
      If the problem persists, contact us at
      <a href="mailto:hello@viralshortai.app" style="color:#a1a1aa;text-decoration:underline;">hello@viralshortai.app</a>.
    </p>
  `);
  await sendEmail(toEmail, subject, html);
}
