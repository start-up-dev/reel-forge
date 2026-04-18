// Message contracts between popup/options and the background service worker.

export interface FailedClipEntry {
  clipId: string;
  videoId: string;
  sceneIndex: number;
  visualPrompt: string;
  errorMessage: string;
  failedAt: number;
}

export interface WorkerState {
  running: boolean;
  connected: boolean;
  queueCount: number;
  activeTabs: number;
  lastUpdatedAt: number;
  session: {
    done: number;
    failed: number;
    startedAt: number | null;
  };
  failedClips: FailedClipEntry[];
  selectorError: { selector: string; name: string } | null;
}

export type PopupMessage =
  | { type: "START" }
  | { type: "STOP" }
  | { type: "RETRY_CLIP"; clipId: string }
  | { type: "GET_STATE" }
  | { type: "REFRESH_QUEUE" };

export type WorkerMessage =
  | { type: "STATE_UPDATE"; state: WorkerState }
  | { type: "STATE_RESPONSE"; state: WorkerState };

// Settings stored in chrome.storage.local / chrome.storage.sync

export interface ExtensionSettings {
  backendUrl: string;
  operatorSecret: string;
  batchSize: number;
  concurrentTabs: number;
  autoClick: boolean;
  clickDelayMode: "fast" | "normal" | "slow";
  selectors: DomSelectors;
}

export interface DomSelectors {
  promptInput: string;
  imageUpload: string;
  generateButton: string;
  outputVideo: string;
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  backendUrl: "http://localhost:4000",
  operatorSecret: "",
  batchSize: 30,
  concurrentTabs: 5,
  autoClick: true,
  clickDelayMode: "normal",
  selectors: {
    promptInput: 'textarea[placeholder*="prompt"], textarea[data-testid="prompt-input"]',
    imageUpload: 'input[type="file"][accept*="image"]',
    generateButton: 'button[type="submit"], button[aria-label*="Generate"], button[data-testid="generate-btn"]',
    outputVideo: "video[src], video source",
  },
};

export const DELAY_RANGES: Record<ExtensionSettings["clickDelayMode"], [number, number]> = {
  fast: [1000, 2000],
  normal: [2000, 5000],
  slow: [5000, 10000],
};
