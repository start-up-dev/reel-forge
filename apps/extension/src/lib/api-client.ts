// Typed API client for the ReelForge backend operator endpoints.
// Reads backendUrl and operatorSecret from chrome.storage.local on each call
// so settings changes take effect immediately without reloading the extension.

import type { ExtensionSettings } from "./messages.js";

export interface ClaimedClip {
  id: string;
  videoId: string;
  sceneIndex: number;
  visualPrompt: string;
  baseImageUrl: string;
}

async function loadSettings(): Promise<Pick<ExtensionSettings, "backendUrl" | "operatorSecret">> {
  const result = await chrome.storage.local.get(["backendUrl", "operatorSecret"]);
  return {
    backendUrl: (result.backendUrl as string | undefined) ?? "http://localhost:4000",
    operatorSecret: (result.operatorSecret as string | undefined) ?? "",
  };
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const { backendUrl, operatorSecret } = await loadSettings();

  const response = await fetch(`${backendUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Operator-Secret": operatorSecret,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw new Error(`${response.status} ${path}: ${text}`);
  }

  return response.json() as Promise<T>;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function claimClips(batchSize: number): Promise<ClaimedClip[]> {
  const result = await request<{ data: ClaimedClip[] }>(
    `/api/operator/queue?batch_size=${batchSize}`,
  );
  return result.data;
}

export async function getUploadUrl(
  clipId: string,
): Promise<{ uploadUrl: string; gcsPath: string }> {
  const result = await request<{ data: { uploadUrl: string; gcsPath: string } }>(
    `/api/operator/clips/${clipId}/upload-url`,
    { method: "POST" },
  );
  return result.data;
}

export async function completeClip(clipId: string, gcsPath: string): Promise<void> {
  await request(`/api/operator/clips/${clipId}/complete`, {
    method: "POST",
    body: JSON.stringify({ gcsPath }),
  });
}

export async function failClip(clipId: string, error: string): Promise<void> {
  await request(`/api/operator/clips/${clipId}/fail`, {
    method: "POST",
    body: JSON.stringify({ error }),
  });
}

export async function getQueueCount(): Promise<number> {
  try {
    // Use batch_size=0 as a probe — backend returns empty array but we can
    // read the queue depth from a dedicated count endpoint if added.
    // For now we rely on session state tracked in the service worker.
    return 0;
  } catch {
    return 0;
  }
}

// ── Upload helper with retry ──────────────────────────────────────────────────

export async function uploadToGcs(
  signedUrl: string,
  blob: Blob,
  maxRetries = 3,
): Promise<void> {
  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt < maxRetries) {
    try {
      const response = await fetch(signedUrl, {
        method: "PUT",
        body: blob,
        headers: { "Content-Type": "video/mp4" },
      });
      if (!response.ok) {
        throw new Error(`GCS upload failed: ${response.status}`);
      }
      return;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      attempt++;
      if (attempt < maxRetries) {
        await sleep(1000 * 2 ** attempt); // exponential backoff: 2s, 4s
      }
    }
  }

  throw lastError ?? new Error("GCS upload failed after retries");
}

// ── Health check ─────────────────────────────────────────────────────────────

export async function checkHealth(): Promise<boolean> {
  try {
    const { backendUrl, operatorSecret } = await loadSettings();
    const response = await fetch(`${backendUrl}/health`, {
      headers: { "X-Operator-Secret": operatorSecret },
    });
    return response.ok;
  } catch {
    return false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
