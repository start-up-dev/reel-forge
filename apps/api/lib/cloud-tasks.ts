import { env } from "./env.js";

/**
 * Dispatches the FFmpeg assembly job for a video to the worker service.
 * If WORKER_URL is not set (local dev without worker), the call is skipped
 * with a warning — the video stays at ASSEMBLY_PENDING.
 */
export async function dispatchAssemblyTask(videoId: string): Promise<void> {
  if (!env.WORKER_URL) {
    console.warn(
      `[worker-dispatch] WORKER_URL not configured — skipping assembly dispatch for video ${videoId}`,
    );
    return;
  }

  const res = await fetch(`${env.WORKER_URL}/assemble`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Operator-Secret": env.OPERATOR_SECRET,
    },
    body: JSON.stringify({ videoId }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Assembly dispatch failed (${res.status}): ${body}`);
  }
}
