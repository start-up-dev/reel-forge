// Background service worker — Chrome MV3.
// State machine: idle ↔ running.
// The content script handles the full clip automation + GCS upload and only
// reports final success/failure here. The SW manages tab lifecycle and state.

import {
  claimClips,
  failClip,
  checkHealth,
  getQueueCount,
  retryClip,
  fetchClipStatuses,
} from "../lib/api-client.js";
import type { ClaimedClip } from "../lib/api-client.js";
import type {
  WorkerState,
  FailedClipEntry,
  PopupMessage,
  ExtensionSettings,
  StoredClipStatus,
  StoredClipStatusMap,
} from "../lib/messages.js";
import { DEFAULT_SETTINGS } from "../lib/messages.js";

// ── Runtime state ─────────────────────────────────────────────────────────────

interface TabEntry {
  clipId: string;
  videoId: string;
  videoTitle: string;
  sceneIndex: number;
  visualPrompt: string;
  motionPrompt: string;
  textExcerpt: string | null;
  videoType: string | null;
  characterSheetUrl: string | null;
  characterSheetBytes: number[] | null;
  characterSheetType: string;
  startedAt: number;
}

const DL_RETRIES = 3;
const DL_RETRY_DELAY_MS = 15_000;

let running = false;
let pollTimer: ReturnType<typeof setTimeout> | null = null;

const activeTabs = new Map<number, TabEntry>();
const session = { done: 0, failed: 0, startedAt: null as number | null };
const failedClips: FailedClipEntry[] = [];
let selectorError: WorkerState["selectorError"] = null;
let lastQueueCount = 0;
let connected = false;
let clipStatuses: StoredClipStatusMap = {};

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function pruneOldClipStatuses(): void {
  const cutoff = Date.now() - SEVEN_DAYS_MS;
  for (const key of Object.keys(clipStatuses)) {
    if ((clipStatuses[key]?.updatedAt ?? 0) < cutoff) {
      delete clipStatuses[key];
    }
  }
}

function saveClipStatus(entry: StoredClipStatus): void {
  clipStatuses[entry.clipId] = entry;
  chrome.storage.local.set({ clipStatuses }).catch(() => {});
}

function saveFailedClips(): void {
  chrome.storage.local.set({ failedClips: [...failedClips] }).catch(() => {});
}

// Load persisted clip statuses and failed clips on startup
chrome.storage.local.get(["clipStatuses", "failedClips"]).then((result) => {
  const stored = result.clipStatuses as StoredClipStatusMap | undefined;
  if (stored) {
    clipStatuses = stored;
    pruneOldClipStatuses();
  }
  const storedFailed = result.failedClips as FailedClipEntry[] | undefined;
  if (storedFailed?.length) {
    failedClips.push(...storedFailed);
  }
  broadcastState();
}).catch(() => {});

// ── Settings ──────────────────────────────────────────────────────────────────

async function getSettings(): Promise<ExtensionSettings> {
  const s = await chrome.storage.local.get(null);
  return {
    backendUrl: (s.backendUrl as string | undefined) ?? DEFAULT_SETTINGS.backendUrl,
    operatorSecret: (s.operatorSecret as string | undefined) ?? DEFAULT_SETTINGS.operatorSecret,
    batchSize: (s.batchSize as number | undefined) ?? DEFAULT_SETTINGS.batchSize,
    concurrentTabs: (s.concurrentTabs as number | undefined) ?? DEFAULT_SETTINGS.concurrentTabs,
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
    clipStatuses: { ...clipStatuses },
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
    videoTitle: clip.videoTitle,
    sceneIndex: clip.sceneIndex,
    visualPrompt: clip.visualPrompt,
    motionPrompt: clip.motionPrompt,
    textExcerpt: clip.textExcerpt ?? null,
    videoType: clip.videoType ?? null,
    characterSheetUrl: clip.characterSheetUrl ?? null,
    characterSheetBytes: null,
    characterSheetType: "image/png",
    startedAt: Date.now(),
  });

  saveClipStatus({
    clipId: clip.id,
    videoId: clip.videoId,
    videoTitle: clip.videoTitle,
    sceneIndex: clip.sceneIndex,
    motionPrompt: clip.motionPrompt,
    status: "processing",
    error: null,
    updatedAt: Date.now(),
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

async function sendClipToTab(
  tabId: number,
  clip: ClaimedClip,
  settings: ExtensionSettings,
): Promise<void> {
  // Pre-fetch character sheet so the content script can attach it synchronously
  let characterSheetBytes: number[] | null = null;
  let characterSheetType = "image/png";
  if (clip.characterSheetUrl) {
    try {
      const res = await fetch(clip.characterSheetUrl);
      if (res.ok) {
        const arr = new Uint8Array(await res.arrayBuffer());
        characterSheetBytes = Array.from(arr);
        characterSheetType = res.headers.get("content-type") ?? "image/png";
      }
    } catch (err) {
      console.warn("[SW] Character sheet fetch failed:", err);
      // Non-fatal — proceed without character sheet
    }
  }

  // Store bytes in tab entry for reference
  const entry = activeTabs.get(tabId);
  if (entry) {
    entry.characterSheetBytes = characterSheetBytes;
    entry.characterSheetType = characterSheetType;
  }

  const msg = {
    type: "PROCESS_CLIP",
    clip,
    visualPrompt: clip.visualPrompt,
    backendUrl: settings.backendUrl,
    operatorSecret: settings.operatorSecret,
    textExcerpt: clip.textExcerpt ?? null,
    videoType: clip.videoType ?? null,
    characterSheetBytes,
    characterSheetType,
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

// ── Error handling ────────────────────────────────────────────────────────────

async function handleTabError(
  tabId: number,
  clipId: string,
  error: string,
): Promise<void> {
  const entry = activeTabs.get(tabId);
  activeTabs.delete(tabId);
  closeTab(tabId);

  // Always fail immediately — operator retries manually from the popup.
  await failClip(clipId, error).catch(() => {});

  session.failed++;
  if (entry) {
    failedClips.push({
      clipId,
      videoId: entry.videoId,
      videoTitle: entry.videoTitle,
      sceneIndex: entry.sceneIndex,
      visualPrompt: entry.visualPrompt,
      motionPrompt: entry.motionPrompt,
      textExcerpt: entry.textExcerpt,
      videoType: entry.videoType,
      errorMessage: error,
      failedAt: Date.now(),
    });
    saveFailedClips();

    saveClipStatus({
      clipId,
      videoId: entry.videoId,
      videoTitle: entry.videoTitle,
      sceneIndex: entry.sceneIndex,
      motionPrompt: entry.motionPrompt,
      status: "failed",
      error,
      updatedAt: Date.now(),
    });
  }

  broadcastState();
  schedulePoll(500);
}

// ── Stale tab watchdog ────────────────────────────────────────────────────────
// 30-minute timeout: operator manually generates image + video, which takes
// longer than automated flow. Cancelled tabs are caught by onRemoved listener.

function checkStaleTabs(): void {
  const THIRTY_MIN = 30 * 60 * 1000;
  const now = Date.now();
  for (const [tabId, entry] of activeTabs) {
    if (now - entry.startedAt > THIRTY_MIN) {
      void handleTabError(tabId, entry.clipId, "Generation timeout (30 min)");
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

  if (connected) {
    try {
      const apiStatuses = await fetchClipStatuses();
      const now = Date.now();
      for (const entry of apiStatuses) {
        const processedAtMs = entry.processedAt ? new Date(entry.processedAt).getTime() : 0;
        const existing = clipStatuses[entry.clipId];
        // Local entry wins only if it was updated more recently than the API's processedAt
        if (!existing || existing.updatedAt <= processedAtMs) {
          clipStatuses[entry.clipId] = {
            clipId: entry.clipId,
            videoId: entry.videoId,
            videoTitle: entry.videoTitle,
            sceneIndex: entry.sceneIndex,
            motionPrompt: entry.motionPrompt,
            status: entry.status,
            error: entry.error,
            updatedAt: processedAtMs || now,
          };
        }
      }
      chrome.storage.local.set({ clipStatuses }).catch(() => {});
    } catch { /* non-fatal — continue with local state */ }
  }

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
        const clipId = message.clipId;

        // Look up in failedClips first; fall back to clipStatuses so retries
        // work even after a service-worker restart wipes in-memory state.
        const failedIdx = failedClips.findIndex((f) => f.clipId === clipId);
        const failedEntry = failedIdx !== -1 ? failedClips[failedIdx] : undefined;
        const statusEntry = clipStatuses[clipId];

        if (!failedEntry && !statusEntry) {
          console.warn("[SW] RETRY_CLIP: clip not found:", clipId);
          sendResponse({ ok: false, error: "Clip not found" });
          break;
        }

        void (async () => {
          try {
            await retryClip(clipId);
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            console.error("[SW] retryClip backend reset failed:", errMsg);
            if (failedEntry) {
              failedClips.push({
                ...failedEntry,
                errorMessage: `Backend retry reset failed: ${errMsg}`,
                failedAt: Date.now(),
              });
              saveFailedClips();
            }
            broadcastState();
            sendResponse({ ok: false, error: errMsg });
            return;
          }

          // Remove from failedClips if present
          if (failedIdx !== -1) {
            failedClips.splice(failedIdx, 1);
            saveFailedClips();
          }

          const base = failedEntry ?? statusEntry!;
          saveClipStatus({
            clipId,
            videoId: base.videoId,
            videoTitle: base.videoTitle,
            sceneIndex: base.sceneIndex,
            motionPrompt: base.motionPrompt,
            status: "queued",
            error: null,
            updatedAt: Date.now(),
          });

          // Clip is back to queued — the normal poll loop will claim and open it.
          broadcastState();
          schedulePoll(500);
          sendResponse({ ok: true });
        })();
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
        const doneEntry = activeTabs.get(tabId);
        activeTabs.delete(tabId);
        session.done++;
        if (doneEntry) {
          saveClipStatus({
            clipId: message.clipId,
            videoId: doneEntry.videoId,
            videoTitle: doneEntry.videoTitle,
            sceneIndex: doneEntry.sceneIndex,
            motionPrompt: doneEntry.motionPrompt,
            status: "done",
            error: null,
            updatedAt: Date.now(),
          });
        }
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

      // Content script requests image attachment via file input injection (MAIN world).
      // The SW executes the injection script so it runs with the page's JS context.
      case "ATTACH_IMAGE": {
        const { clipId, imageBytes, imageType } = message;
        void (async () => {
          try {
            const results = await chrome.scripting.executeScript({
              target: { tabId },
              world: "MAIN",
              func: (bytes: number[], type: string, id: string): { ok: boolean; reason: string } => {
                const input = document.querySelector<HTMLInputElement>('input[type="file"]');
                if (!input) return { ok: false, reason: `No file input found for clip ${id}` };

                const uint8 = new Uint8Array(bytes);
                const blob = new Blob([uint8], { type });
                const file = new File([blob], "character_sheet.png", { type });

                const dt = new DataTransfer();
                dt.items.add(file);
                input.files = dt.files;

                input.dispatchEvent(new Event("change", { bubbles: true }));
                input.dispatchEvent(new Event("input", { bubbles: true }));

                // Trigger React fiber onChange if present
                const fiberKey = Object.keys(input).find((k) => k.startsWith("__reactFiber"));
                if (fiberKey) {
                  let fiber = (input as unknown as Record<string, { memoizedProps?: { onChange?: (e: Event) => void } } | null>)[fiberKey];
                  while (fiber) {
                    if (fiber.memoizedProps?.onChange) {
                      fiber.memoizedProps.onChange(new Event("change", { bubbles: true }));
                      break;
                    }
                    fiber = (fiber as unknown as { return?: typeof fiber }).return ?? null;
                  }
                }

                return { ok: true, reason: "" };
              },
              args: [imageBytes, imageType, clipId],
            });

            const result = results[0]?.result;
            if (result?.ok) {
              sendResponse({ ok: true });
            } else {
              sendResponse({ ok: false, reason: result?.reason ?? "Attachment failed" });
            }
          } catch (err) {
            sendResponse({ ok: false, reason: err instanceof Error ? err.message : String(err) });
          }
        })();
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
            // Reject Grok's default "dancing bear" placeholder. It is always served
            // from imagine-public.x.ai/imagine-public/share-videos/ — real generated
            // clips come from assets.grok.com/users/{id}/generated/. If we see the
            // placeholder URL, fail immediately so the clip auto-retries.
            if (videoUrl.includes("imagine-public.x.ai/imagine-public/share-videos/")) {
              throw new Error(
                "Grok returned the default placeholder video (dancing bear) — retrying",
              );
            }

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

            // 2. Download the video.
            //
            // Grok's generated videos are served from imagine-public.x.ai, a
            // different origin from grok.com. Fetching from MAIN world (origin =
            // grok.com) gets CORS-blocked. The SW fetches directly — host_permissions
            // for *.x.ai bypass CORS without needing session cookies.
            //
            // For blob: URLs or grok.com-authenticated URLs we fall back to an
            // executeScript MAIN world fetch which has access to page cookies and
            // the browser's blob store.
            //
            const isPublicCdn =
              !videoUrl.startsWith("blob:") && !/grok\.com|x\.com/i.test(videoUrl);

            console.log(
              `[SW] Download strategy: ${isPublicCdn ? "SW-direct (public CDN)" : "MAIN-world fetch"}`,
              videoUrl.substring(0, 80),
            );

            let videoBytes: Uint8Array | undefined;

            for (let dlAttempt = 0; dlAttempt < DL_RETRIES; dlAttempt++) {
              if (dlAttempt > 0) {
                console.log(
                  `[SW] Retrying video download in ${DL_RETRY_DELAY_MS / 1000}s ` +
                    `(attempt ${dlAttempt + 1}/${DL_RETRIES})`,
                );
                await new Promise((r) => setTimeout(r, DL_RETRY_DELAY_MS));
              }

              if (isPublicCdn) {
                // SW-direct fetch: host_permissions for *.x.ai bypass CORS.
                // No session cookies needed for public CDN URLs.
                try {
                  const res = await fetch(videoUrl);
                  console.log(
                    `[SW] Direct fetch attempt ${dlAttempt + 1}: status=${res.status}`,
                    `Content-Length=${res.headers.get("content-length") ?? "?"}`,
                  );
                  if (res.ok) {
                    const buf = await res.arrayBuffer();
                    if (buf.byteLength > 0) {
                      videoBytes = new Uint8Array(buf);
                      console.log(`[SW] Video downloaded — ${videoBytes.byteLength} bytes (SW-direct)`);
                      break;
                    }
                    console.warn(`[SW] SW-direct fetch returned 0 bytes`);
                  }
                } catch (e) {
                  console.warn("[SW] SW-direct fetch error:", e);
                }
              } else {
                // MAIN world executeScript: needed for blob: URLs or grok.com URLs
                // that require session cookies. Logs are returned in the payload
                // (tab console is closed on failure — this surfaces them in SW).
                const dlResults = await chrome.scripting.executeScript({
                  target: { tabId },
                  world: "MAIN",
                  func: async (url: string): Promise<{ bytes: number[]; logs: string[] }> => {
                    const logs: string[] = [];
                    const log = (...a: unknown[]): void => {
                      const msg = a
                        .map((x) => (typeof x === "object" ? JSON.stringify(x) : String(x)))
                        .join(" ");
                      console.log("[RF-DL]", msg);
                      logs.push(msg);
                    };

                    log(`URL type: ${url.startsWith("blob:") ? "BLOB" : "HTTPS"} len=${url.length}`, url.substring(0, 100));

                    const allVideos = Array.from(document.querySelectorAll("video"));
                    for (const v of allVideos) {
                      log(
                        `video readyState=${v.readyState} duration=${v.duration}`,
                        `networkState=${v.networkState}`,
                        `error=${v.error ? v.error.code + "/" + v.error.message : "none"}`,
                        `src=${v.currentSrc.substring(0, 80)}`,
                      );
                    }

                    async function fetchBytes(fetchUrl: string, label: string): Promise<number[]> {
                      let res: Response;
                      try {
                        res = await fetch(fetchUrl, { credentials: "include" });
                      } catch (e) {
                        log(`Network error [${label}]:`, String(e));
                        return [];
                      }
                      log(
                        `Response [${label}]: ${res.status}`,
                        `len=${res.headers.get("content-length") ?? "?"}`,
                        `type=${res.headers.get("content-type") ?? "?"}`,
                      );
                      if (!res.ok) return [];
                      const buf = await res.arrayBuffer();
                      log(`Bytes [${label}]:`, buf.byteLength);
                      return Array.from(new Uint8Array(buf));
                    }

                    let bytes = await fetchBytes(url, "primary");
                    if (bytes.length > 0) return { bytes, logs };

                    // If primary returned 0, scan performance entries for the real URL.
                    const entries = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
                    const candidates = entries
                      .filter(
                        (e) =>
                          e.name !== url &&
                          (/\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(e.name) || e.initiatorType === "video"),
                      )
                      .sort((a, b) => b.startTime - a.startTime)
                      .slice(0, 3);
                    log("Perf candidates:", candidates.map((e) => e.name.substring(0, 80)));

                    for (const entry of candidates) {
                      bytes = await fetchBytes(entry.name, "perf");
                      if (bytes.length > 0) return { bytes, logs };
                    }

                    log("All sources returned 0 bytes");
                    return { bytes: [], logs };
                  },
                  args: [videoUrl],
                });

                const result = dlResults[0]?.result;
                if (result?.logs) {
                  for (const line of result.logs) console.log(`[RF-DL] ${line}`);
                }
                if (result?.bytes && result.bytes.length > 0) {
                  videoBytes = new Uint8Array(result.bytes);
                  console.log(`[SW] Video downloaded — ${videoBytes.byteLength} bytes (MAIN-world)`);
                  break;
                }
              }

              console.warn(`[SW] Download attempt ${dlAttempt + 1} returned 0 bytes`);
            }

            if (!videoBytes || videoBytes.byteLength === 0)
              throw new Error("Video download returned empty bytes after retries");

            // 3. PUT to GCS from the SW. Extension host_permissions for
            //    storage.googleapis.com bypass the CORS preflight check.
            const blob = new Blob([videoBytes.buffer as ArrayBuffer], { type: "video/mp4" });
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
            const uploadDoneEntry = activeTabs.get(tabId);
            activeTabs.delete(tabId);
            session.done++;
            if (uploadDoneEntry) {
              saveClipStatus({
                clipId,
                videoId: uploadDoneEntry.videoId,
                videoTitle: uploadDoneEntry.videoTitle,
                sceneIndex: uploadDoneEntry.sceneIndex,
                motionPrompt: uploadDoneEntry.motionPrompt,
                status: "done",
                error: null,
                updatedAt: Date.now(),
              });
            }
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

    }

    return true;
  },
);

// ── Tab crash detection ───────────────────────────────────────────────────────
// retryable=false: user manually closed the tab — don't re-open it.

chrome.tabs.onRemoved.addListener((tabId) => {
  if (!activeTabs.has(tabId)) return;
  const clipId = activeTabs.get(tabId)!.clipId;
  void handleTabError(tabId, clipId, "Tab closed unexpectedly");
});

// Initial state ping.
broadcastState();
