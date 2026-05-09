// Message contracts between popup/options and the background service worker.

export interface FailedClipEntry {
  clipId: string;
  videoId: string;
  videoTitle: string;
  sceneIndex: number;
  visualPrompt: string;
  motionPrompt: string;
  textExcerpt: string | null;
  videoType: string | null;
  errorMessage: string;
  failedAt: number;
}

export interface StoredClipStatus {
  clipId: string;
  videoId: string;
  videoTitle: string;
  sceneIndex: number;
  motionPrompt: string;
  status: "queued" | "processing" | "done" | "failed";
  error: string | null;
  updatedAt: number;
}

export type StoredClipStatusMap = Record<string, StoredClipStatus>;

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
  clipStatuses: StoredClipStatusMap;
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

// Settings stored in chrome.storage.local

export interface ExtensionSettings {
  backendUrl: string;
  operatorSecret: string;
  batchSize: number;
  concurrentTabs: number;
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  backendUrl: "http://localhost:4000",
  operatorSecret: "",
  batchSize: 30,
  concurrentTabs: 5,
};
