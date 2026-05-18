export interface FacebookUploadOptions {
  draft: boolean;
  scheduledAt?: Date;
}

export async function uploadReelToFacebook(
  pageId: string,
  pageAccessToken: string,
  videoBuffer: Buffer,
  description: string,
  options: FacebookUploadOptions,
): Promise<string> {
  const blob = new Blob([new Uint8Array(videoBuffer)], { type: "video/mp4" });

  const fd = new FormData();
  fd.append("source", blob, "video.mp4");
  fd.append("description", description);
  fd.append("content_category", "BEAUTY_FASHION");

  if (options.draft) {
    fd.append("published", "false");
  } else if (options.scheduledAt) {
    const tenMinutesFromNow = Date.now() + 10 * 60 * 1000;
    const effectiveTime = Math.max(
      Math.floor(options.scheduledAt.getTime() / 1000),
      Math.floor(tenMinutesFromNow / 1000),
    );
    fd.append("published", "false");
    fd.append("scheduled_publish_time", String(effectiveTime));
  } else {
    fd.append("published", "true");
  }

  const url = `https://graph-video.facebook.com/v19.0/${pageId}/videos?access_token=${pageAccessToken}`;
  const res = await fetch(url, { method: "POST", body: fd });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Facebook upload failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { id?: string; error?: { message: string } };
  if (data.error) {
    throw new Error(`Facebook API error: ${data.error.message}`);
  }
  if (!data.id) {
    throw new Error("Facebook API returned no video ID");
  }
  return data.id;
}
