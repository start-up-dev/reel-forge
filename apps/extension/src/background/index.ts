// Background service worker — Chrome MV3.
// State machine: idle ↔ running.
// The content script handles the full clip automation + GCS upload and only
// reports final success/failure here. The SW manages tab lifecycle and state.

import {
  claimClips,
  failClip,
  checkHealth,
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
    tab = await chrome.tabs.create({ url: "https://grok.com/", active: false });
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
    sendClipToTab(tabId, clip, settings);
  };
  chrome.tabs.onUpdated.addListener(handler);
}

function sendClipToTab(
  tabId: number,
  clip: ClaimedClip,
  settings: ExtensionSettings,
): void {
  const msg = {
    type: "PROCESS_CLIP",
    clip,
    autoClick: settings.autoClick,
    clickDelayMode: settings.clickDelayMode,
    selectors: settings.selectors,
    backendUrl: settings.backendUrl,
    operatorSecret: settings.operatorSecret,
  };

  chrome.tabs.sendMessage(tabId, msg).catch(() => {
    // Retry once after 2 s — content script may still be initialising.
    setTimeout(() => {
      chrome.tabs.sendMessage(tabId, msg).catch(() => {
        void handleTabError(tabId, clip.id, "Content script unreachable");
      });
    }, 2000);
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

// ── Stale tab watchdog (3-minute timeout) ────────────────────────────────────

function checkStaleTabs(): void {
  const THREE_MIN = 3 * 60 * 1000;
  const now = Date.now();
  for (const [tabId, entry] of activeTabs) {
    if (now - entry.startedAt > THREE_MIN) {
      void handleTabError(tabId, entry.clipId, "Generation timeout (3 min)");
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
    lastQueueCount = clips.length;

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

      case "RETRY_CLIP": {
        const idx = failedClips.findIndex((f) => f.clipId === message.clipId);
        if (idx !== -1) {
          const entry = failedClips[idx];
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
  | { type: "SELECTOR_ERROR"; clipId: string; selectorName: string; selectorValue: string };

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
