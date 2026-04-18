// Background service worker — Chrome MV3.
// State machine: idle ↔ running.
// The content script handles the full clip automation + GCS upload and only
// reports final success/failure here. The SW manages tab lifecycle and state.

import {
  claimClips,
  failClip,
  checkHealth,
  getQueueCount,
} from "../lib/api-client.js";
import type { ClaimedClip } from "../lib/api-client.js";
import type {
  WorkerState,
  FailedClipEntry,
  PopupMessage,
  ExtensionSettings,
} from "../lib/messages.js";
import { DEFAULT_SETTINGS } from "../lib/messages.js";

// ── Runtime state ─────────────────────────────────────────────────────────────

interface TabEntry {
  clipId: string;
  videoId: string;
  sceneIndex: number;
  visualPrompt: string;
  startedAt: number;
}

let running = false;
let pollTimer: ReturnType<typeof setTimeout> | null = null;

const activeTabs = new Map<number, TabEntry>();
const session = { done: 0, failed: 0, startedAt: null as number | null };
const failedClips: FailedClipEntry[] = [];
let selectorError: WorkerState["selectorError"] = null;
let lastQueueCount = 0;
let connected = false;

// ── Settings ──────────────────────────────────────────────────────────────────

async function getSettings(): Promise<ExtensionSettings> {
  const s = await chrome.storage.local.get(null);
  return {
    backendUrl: (s.backendUrl as string | undefined) ?? DEFAULT_SETTINGS.backendUrl,
    operatorSecret: (s.operatorSecret as string | undefined) ?? DEFAULT_SETTINGS.operatorSecret,
    batchSize: (s.batchSize as number | undefined) ?? DEFAULT_SETTINGS.batchSize,
    concurrentTabs: (s.concurrentTabs as number | undefined) ?? DEFAULT_SETTINGS.concurrentTabs,
    autoClick: (s.autoClick as boolean | undefined) ?? DEFAULT_SETTINGS.autoClick,
    clickDelayMode:
      (s.clickDelayMode as ExtensionSettings["clickDelayMode"] | undefined) ??
      DEFAULT_SETTINGS.clickDelayMode,
    selectors: {
      promptInput:
        (s["selectors.promptInput"] as string | undefined) ??
        DEFAULT_SETTINGS.selectors.promptInput,
      imageUpload:
        (s["selectors.imageUpload"] as string | undefined) ??
        DEFAULT_SETTINGS.selectors.imageUpload,
      generateButton:
        (s["selectors.generateButton"] as string | undefined) ??
        DEFAULT_SETTINGS.selectors.generateButton,
      outputVideo:
        (s["selectors.outputVideo"] as string | undefined) ??
        DEFAULT_SETTINGS.selectors.outputVideo,
    },
  };
}

// ── State broadcast ───────────────────────────────────────────────────────────

function buildState(): WorkerState {
  return {
    running,
    connected,
    queueCount: lastQueueCount,
    activeTabs: activeTabs.size,
    lastUpdatedAt: Date.now(),
    session: { ...session },
    failedClips: [...failedClips],
    selectorError,
  };
}

function broadcastState(): void {
  chrome.runtime.sendMessage({ type: "STATE_UPDATE", state: buildState() }).catch(() => {
    // Popup may not be open — safe to ignore.
  });
}

// ── Tab helpers ───────────────────────────────────────────────────────────────

function closeTab(tabId: number): void {
  chrome.tabs.remove(tabId).catch(() => {});
}

async function openClipTab(clip: ClaimedClip, settings: ExtensionSettings): Promise<void> {
  if (activeTabs.size >= settings.concurrentTabs) return;

  let tab: chrome.tabs.Tab;
  try {
    tab = await chrome.tabs.create({ url: "https://grok.com/imagine", active: false });
  } catch {
    await failClip(clip.id, "Failed to open tab").catch(() => {});
    return;
  }

  if (!tab.id) {
    await failClip(clip.id, "No tab ID assigned").catch(() => {});
    return;
  }

  activeTabs.set(tab.id, {
    clipId: clip.id,
    videoId: clip.videoId,
    sceneIndex: clip.sceneIndex,
    visualPrompt: clip.visualPrompt,
    startedAt: Date.now(),
  });
  broadcastState();

  // Wait for the tab to finish loading, then inject the content script message.
  const tabId = tab.id;
  const handler = (
    updatedTabId: number,
    info: chrome.tabs.TabChangeInfo,
  ): void => {
    if (updatedTabId !== tabId || info.status !== "complete") return;
    chrome.tabs.onUpdated.removeListener(handler);
    void sendClipToTab(tabId, clip, settings);
  };
  chrome.tabs.onUpdated.addListener(handler);
}

// Pre-fetch the base image in the service worker so the content script never
// has to make a cross-origin request to GCS (where CORS might block it).
async function sendClipToTab(
  tabId: number,
  clip: ClaimedClip,
  settings: ExtensionSettings,
): Promise<void> {
  let imageBytes: Uint8Array | null = null;
  let imageType = "image/jpeg";

  if (clip.baseImageUrl) {
    try {
      const res = await fetch(clip.baseImageUrl);
      if (res.ok) {
        imageBytes = new Uint8Array(await res.arrayBuffer());
        imageType = res.headers.get("content-type") || "image/jpeg";
      } else {
        console.warn(`[SW] Base image fetch failed: ${res.status}`);
      }
    } catch (err) {
      console.warn("[SW] Could not pre-fetch base image:", err);
    }
  }

  const msg = {
    type: "PROCESS_CLIP",
    clip,
    imageBytes,   // Uint8Array | null — transferred via structured clone
    imageType,
    autoClick: settings.autoClick,
    clickDelayMode: settings.clickDelayMode,
    selectors: settings.selectors,
    backendUrl: settings.backendUrl,
    operatorSecret: settings.operatorSecret,
  };

  chrome.tabs.sendMessage(tabId, msg).catch(() => {
    // Retry once after 3 s — content script may still be initialising.
    setTimeout(() => {
      chrome.tabs.sendMessage(tabId, msg).catch(() => {
        void handleTabError(tabId, clip.id, "Content script unreachable");
      });
    }, 3000);
  });
}

async function handleTabError(
  tabId: number,
  clipId: string,
  error: string,
): Promise<void> {
  const entry = activeTabs.get(tabId);
  activeTabs.delete(tabId);

  await failClip(clipId, error).catch(() => {});

  session.failed++;
  if (entry) {
    failedClips.push({
      clipId,
      videoId: entry.videoId,
      sceneIndex: entry.sceneIndex,
      visualPrompt: entry.visualPrompt,
      errorMessage: error,
      failedAt: Date.now(),
    });
  }

  closeTab(tabId);
  broadcastState();
  schedulePoll(500);
}

// ── Stale tab watchdog ────────────────────────────────────────────────────────
// 10-minute timeout: page load (~15s) + image upload (~5s) + generation
// (up to 3 min on Grok) + GCS download/upload (~60s) — 3 min was too tight.

function checkStaleTabs(): void {
  const TEN_MIN = 10 * 60 * 1000;
  const now = Date.now();
  for (const [tabId, entry] of activeTabs) {
    if (now - entry.startedAt > TEN_MIN) {
      void handleTabError(tabId, entry.clipId, "Generation timeout (10 min)");
    }
  }
}

// ── Polling loop ──────────────────────────────────────────────────────────────

async function poll(): Promise<void> {
  if (!running) return;

  checkStaleTabs();

  const settings = await getSettings();
  const freeSlots = settings.concurrentTabs - activeTabs.size;

  if (freeSlots <= 0) {
    schedulePoll(3000);
    return;
  }

  try {
    const clips = await claimClips(Math.min(freeSlots, settings.batchSize));
    connected = true;

    // After claiming, fetch the remaining queued count for accurate display.
    const remaining = await getQueueCount().catch(() => 0);
    lastQueueCount = remaining + clips.length;

    for (const clip of clips) {
      if (activeTabs.size >= settings.concurrentTabs) break;
      await openClipTab(clip, settings);
    }

    broadcastState();
    schedulePoll(clips.length === 0 ? 10_000 : 3000);
  } catch (err) {
    connected = false;
    console.error("[SW] poll error:", err);
    broadcastState();
    schedulePoll(5000);
  }
}

function schedulePoll(ms: number): void {
  if (!running) return;
  if (pollTimer) clearTimeout(pollTimer);
  pollTimer = setTimeout(() => {
    void poll();
  }, ms);
}

// ── Start / Stop ──────────────────────────────────────────────────────────────

async function start(): Promise<void> {
  if (running) return;
  running = true;
  session.done = 0;
  session.failed = 0;
  session.startedAt = Date.now();
  failedClips.length = 0;
  selectorError = null;
  connected = await checkHealth();
  broadcastState();
  void poll();
}

function stop(): void {
  running = false;
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
  broadcastState();
}

// ── Messages from popup ───────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(
  (message: PopupMessage, _sender, sendResponse) => {
    switch (message.type) {
      case "START":
        void start();
        sendResponse({ ok: true });
        break;

      case "STOP":
        stop();
        sendResponse({ ok: true });
        break;

      case "GET_STATE":
        sendResponse({ type: "STATE_RESPONSE", state: buildState() });
        break;

      case "REFRESH_QUEUE":
        void checkHealth()
          .then((ok) => {
            connected = ok;
            if (ok && !running) {
              return getQueueCount().then((n) => {
                lastQueueCount = n;
              });
            }
          })
          .catch(() => {
            connected = false;
          })
          .finally(() => broadcastState());
        sendResponse({ ok: true });
        break;

      case "RETRY_CLIP": {
        const idx = failedClips.findIndex((f) => f.clipId === message.clipId);
        const entry = idx !== -1 ? failedClips[idx] : undefined;
        if (entry) {
          failedClips.splice(idx, 1);
          void getSettings().then((settings) => {
            void openClipTab(
              {
                id: entry.clipId,
                videoId: entry.videoId,
                sceneIndex: entry.sceneIndex,
                visualPrompt: entry.visualPrompt,
                baseImageUrl: "",
              },
              settings,
            );
          });
        }
        sendResponse({ ok: true });
        break;
      }
    }
    return true;
  },
);

// ── Messages from content script ──────────────────────────────────────────────

type ContentMsg =
  | { type: "CLIP_DONE"; clipId: string }
  | { type: "CLIP_FAILED"; clipId: string; error: string }
  | { type: "SELECTOR_ERROR"; clipId: string; selectorName: string; selectorValue: string }
  | { type: "UPLOAD_VIDEO"; clipId: string; videoUrl: string; backendUrl: string; operatorSecret: string }
  | { type: "ATTACH_IMAGE"; clipId: string; imageBytes: Uint8Array; imageType: string };

chrome.runtime.onMessage.addListener(
  (message: ContentMsg, sender, sendResponse) => {
    const tabId = sender.tab?.id;
    if (!tabId) return;

    switch (message.type) {
      case "CLIP_DONE": {
        activeTabs.delete(tabId);
        session.done++;
        closeTab(tabId);
        broadcastState();
        schedulePoll(500);
        sendResponse({ ok: true });
        break;
      }

      case "CLIP_FAILED": {
        void handleTabError(tabId, message.clipId, message.error);
        sendResponse({ ok: true });
        break;
      }

      case "SELECTOR_ERROR": {
        selectorError = {
          selector: message.selectorValue,
          name: message.selectorName,
        };
        void handleTabError(
          tabId,
          message.clipId,
          `Selector "${message.selectorName}" not found`,
        );
        sendResponse({ ok: true });
        break;
      }

      // Content script found the generated video URL and hands off to SW.
      // SW injects a downloader into the page's MAIN world so the request carries
      // Origin: https://grok.com and the user's Grok session cookies — the only
      // way to get a 200 from assets.grok.com.
      case "UPLOAD_VIDEO": {
        const { clipId, videoUrl, backendUrl, operatorSecret } = message;
        sendResponse({ ok: true }); // ack immediately

        void (async () => {
          try {
            // 1. Get the signed GCS upload URL from our backend (SW has no CORS issues).
            const urlRes = await fetch(
              `${backendUrl}/api/operator/clips/${clipId}/upload-url`,
              {
                method: "POST",
                headers: {
                  "X-Operator-Secret": operatorSecret,
                },
              },
            );
            if (!urlRes.ok) throw new Error(`upload-url: ${urlRes.status}`);
            const { data } = (await urlRes.json()) as {
              data: { uploadUrl: string; gcsPath: string };
            };

            // 2. Inject into the page's MAIN world: fetch video (Origin = grok.com,
            //    cookies attached) → PUT to GCS signed URL (no auth needed).
            const results = await chrome.scripting.executeScript({
              target: { tabId },
              world: "MAIN",
              func: async (vUrl: string, uploadUrl: string): Promise<void> => {
                const videoRes = await fetch(vUrl, { credentials: "include" });
                if (!videoRes.ok)
                  throw new Error(`Video download failed: ${videoRes.status}`);
                const blob = await videoRes.blob();

                // Retry GCS upload up to 3 times.
                let lastErr = "";
                for (let i = 0; i < 3; i++) {
                  try {
                    const up = await fetch(uploadUrl, {
                      method: "PUT",
                      body: blob,
                      headers: { "Content-Type": "video/mp4" },
                    });
                    if (!up.ok) throw new Error(`GCS: ${up.status}`);
                    return;
                  } catch (e) {
                    lastErr = e instanceof Error ? e.message : String(e);
                    if (i < 2) await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
                  }
                }
                throw new Error(lastErr || "GCS upload failed after retries");
              },
              args: [videoUrl, data.uploadUrl],
            });

            // executeScript rejects if the func throws; this line only runs on success.
            void results; // result is void[]

            // 3. Mark the clip complete in the backend.
            const completeRes = await fetch(
              `${backendUrl}/api/operator/clips/${clipId}/complete`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-Operator-Secret": operatorSecret,
                },
                body: JSON.stringify({ gcsPath: data.gcsPath }),
              },
            );
            if (!completeRes.ok)
              throw new Error(`completeClip: ${completeRes.status}`);

            // 4. Clean up tab — same as CLIP_DONE.
            activeTabs.delete(tabId);
            session.done++;
            closeTab(tabId);
            broadcastState();
            schedulePoll(500);
          } catch (err) {
            const error = err instanceof Error ? err.message : String(err);
            console.error(`[SW] UPLOAD_VIDEO failed for clip ${clipId}:`, error);
            void handleTabError(tabId, clipId, error);
          }
        })();
        break;
      }

      // Inject file attachment into MAIN world so Grok's React synthetic onChange fires.
      case "ATTACH_IMAGE": {
        const { imageBytes, imageType } = message;
        const byteArray = Array.from(imageBytes);

        void (async () => {
          try {
            await chrome.scripting.executeScript({
              target: { tabId },
              world: "MAIN",
              func: (bytes: number[], mimeType: string): void => {
                const uint8 = new Uint8Array(bytes);
                const blob = new Blob([uint8], { type: mimeType });
                const file = new File([blob], "base_image.jpg", { type: mimeType });
                const input = document.querySelector<HTMLInputElement>('input[type="file"]');
                if (!input) throw new Error("No file input found in MAIN world");
                const dt = new DataTransfer();
                dt.items.add(file);
                input.files = dt.files;
                input.dispatchEvent(new Event("change", { bubbles: true }));
                input.dispatchEvent(new Event("input", { bubbles: true }));
              },
              args: [byteArray, imageType],
            });
            sendResponse({ ok: true });
          } catch (err) {
            sendResponse({ ok: false, error: err instanceof Error ? err.message : String(err) });
          }
        })();
        break;
      }
    }

    return true;
  },
);

// ── Tab crash detection ───────────────────────────────────────────────────────

chrome.tabs.onRemoved.addListener((tabId) => {
  const entry = activeTabs.get(tabId);
  if (!entry) return;
  activeTabs.delete(tabId);
  session.failed++;
  failedClips.push({
    clipId: entry.clipId,
    videoId: entry.videoId,
    sceneIndex: entry.sceneIndex,
    visualPrompt: entry.visualPrompt,
    errorMessage: "Tab closed unexpectedly",
    failedAt: Date.now(),
  });
  void failClip(entry.clipId, "Tab closed unexpectedly").catch(() => {});
  broadcastState();
  schedulePoll(500);
});

// Initial state ping.
broadcastState();
