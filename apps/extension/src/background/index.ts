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

  console.log(`[SW] baseImageUrl for clip ${clip.id}:`, clip.baseImageUrl || "(empty)");
  if (clip.baseImageUrl) {
    try {
      const res = await fetch(clip.baseImageUrl);
      if (res.ok) {
        imageBytes = new Uint8Array(await res.arrayBuffer());
        imageType = res.headers.get("content-type") || "image/jpeg";
        console.log(`[SW] Base image fetched OK — ${imageBytes.byteLength} bytes, type: ${imageType}`);
      } else {
        console.warn(`[SW] Base image fetch failed: ${res.status} — imageBytes will be null`);
      }
    } catch (err) {
      console.warn("[SW] Could not pre-fetch base image:", err);
    }
  } else {
    console.warn(`[SW] Clip ${clip.id} has no baseImageUrl — skipping image attachment`);
  }

  const msg = {
    type: "PROCESS_CLIP",
    clip,
    // Convert to plain number[] — Chrome JSON-serializes Uint8Array as {"0":1,...}
    // which loses the `length` property and arrives as 0 bytes on the other side.
    imageBytes: imageBytes ? Array.from(imageBytes) : null,
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
  | { type: "ATTACH_IMAGE"; clipId: string; imageBytes: number[]; imageType: string };

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
      // Download happens in MAIN world (needs Origin: grok.com + session cookies).
      // GCS PUT happens in the SW — extension host_permissions for storage.googleapis.com
      // bypass CORS entirely, avoiding the preflight failure seen from the page origin.
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

            // 2. Download video in MAIN world (Origin = grok.com, cookies attached).
            //    Return raw bytes to SW — the SW does the GCS PUT so CORS is not an issue.
            const dlResults = await chrome.scripting.executeScript({
              target: { tabId },
              world: "MAIN",
              func: async (vUrl: string): Promise<Uint8Array> => {
                const videoRes = await fetch(vUrl, { credentials: "include" });
                if (!videoRes.ok)
                  throw new Error(`Video download failed: ${videoRes.status}`);
                return new Uint8Array(await videoRes.arrayBuffer());
              },
              args: [videoUrl],
            });

            const videoBytes = dlResults[0]?.result;
            if (!videoBytes || videoBytes.byteLength === 0)
              throw new Error("Video download returned empty bytes");

            // 3. PUT to GCS from the SW. Extension host_permissions for
            //    storage.googleapis.com bypass the CORS preflight check.
            const blob = new Blob([videoBytes.slice()], { type: "video/mp4" });
            let lastErr = "";
            for (let i = 0; i < 3; i++) {
              try {
                const up = await fetch(data.uploadUrl, {
                  method: "PUT",
                  body: blob,
                  headers: { "Content-Type": "video/mp4" },
                });
                if (!up.ok) throw new Error(`GCS PUT: ${up.status}`);
                lastErr = "";
                break;
              } catch (e) {
                lastErr = e instanceof Error ? e.message : String(e);
                if (i < 2) await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
              }
            }
            if (lastErr) throw new Error(lastErr);

            // 4. Mark the clip complete in the backend.
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

            // 5. Clean up tab — same as CLIP_DONE.
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

      // Inject file attachment into MAIN world.
      // Strategy: set files + events + React fiber + upload-trigger click.
      // Then wait up to 8 s for Grok's UI to confirm (new img element).
      // Returns ok:false if not confirmed — content script will fail the clip.
      case "ATTACH_IMAGE": {
        const { imageBytes: byteArray, imageType } = message; // already number[]

        void (async () => {
          try {
            const results = await chrome.scripting.executeScript({
              target: { tabId },
              world: "MAIN",
              func: async (bytes: number[], mimeType: string): Promise<{ ok: boolean; reason: string }> => {
                const rf = (...a: unknown[]) => console.log("[RF-MAIN]", ...a);

                const uint8 = new Uint8Array(bytes);
                const blob = new Blob([uint8], { type: mimeType });
                const file = new File([blob], "base_image.jpg", { type: mimeType });
                rf("File ready:", file.size, "bytes");

                const input = document.querySelector<HTMLInputElement>('input[type="file"]');
                if (!input) {
                  rf("No file input on page");
                  return { ok: false, reason: "No file input on page" };
                }
                rf("Input found — accept:", input.accept, "id:", input.id);

                // ── Attach the file ────────────────────────────────────────────
                const dt = new DataTransfer();
                dt.items.add(file);
                input.files = dt.files;

                // Confirm BEFORE dispatching events — Grok's sync onChange handler
                // may clear input.files immediately, making a post-event check useless.
                const confirmed = !!(input.files && input.files.length > 0);
                rf("Files set on input:", confirmed, "count:", input.files?.length);

                if (!confirmed) {
                  return { ok: false, reason: "Browser rejected DataTransfer file assignment" };
                }

                // Dispatch events so React's delegated listener processes the change.
                input.dispatchEvent(new Event("change", { bubbles: true }));
                input.dispatchEvent(new Event("input", { bubbles: true }));

                // React fiber — call onChange directly if present.
                const inputAny = input as unknown as Record<string, unknown>;
                const fKey = Object.keys(inputAny).find(
                  (k) => k.startsWith("__reactFiber") || k.startsWith("__reactInternalInstance"),
                );
                if (fKey) {
                  let fiber = inputAny[fKey] as Record<string, unknown> | null;
                  while (fiber) {
                    const props = (fiber["memoizedProps"] ?? fiber["pendingProps"]) as Record<string, unknown> | null;
                    if (typeof props?.["onChange"] === "function") {
                      rf("Calling React onChange via fiber");
                      try {
                        (props["onChange"] as (e: unknown) => void)({
                          target: input, currentTarget: input,
                          nativeEvent: new Event("change"),
                          preventDefault: () => {}, stopPropagation: () => {},
                        });
                      } catch (e) { rf("Fiber error:", e); }
                      break;
                    }
                    fiber = fiber["return"] as Record<string, unknown> | null;
                  }
                }
                // Note: we do NOT click any upload trigger button — it can call
                // input.click() internally which resets the FileList we just set.

                rf("Attachment result:", confirmed ? "SUCCESS" : "FAILED");
                return {
                  ok: confirmed,
                  reason: confirmed ? "ok" : "Grok did not confirm upload after 8 s",
                };
              },
              args: [byteArray, imageType],
            });

            const result = results[0]?.result;
            console.log("[SW] ATTACH_IMAGE:", JSON.stringify(result));
            sendResponse(result?.ok
              ? { ok: true }
              : { ok: false, error: result?.reason ?? "Image attachment failed" },
            );
          } catch (err) {
            const error = err instanceof Error ? err.message : String(err);
            console.error("[SW] ATTACH_IMAGE failed:", error);
            sendResponse({ ok: false, error });
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
