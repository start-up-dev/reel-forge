import { useEffect, useReducer, useCallback } from "react";
import type { WorkerState, FailedClipEntry } from "../lib/messages.js";

const EMPTY_STATE: WorkerState = {
  running: false,
  connected: false,
  queueCount: 0,
  activeTabs: 0,
  lastUpdatedAt: 0,
  session: { done: 0, failed: 0, startedAt: null },
  failedClips: [],
  selectorError: null,
};

// ── Popup root ────────────────────────────────────────────────────────────────

export function Popup() {
  const [state, setState] = useReducer(
    (_prev: WorkerState, next: WorkerState) => next,
    EMPTY_STATE,
  );

  // Fetch initial state from SW on mount.
  useEffect(() => {
    chrome.runtime
      .sendMessage({ type: "GET_STATE" })
      .then((res: { state: WorkerState }) => {
        if (res?.state) setState(res.state);
      })
      .catch(() => {});

    const listener = (msg: { type: string; state?: WorkerState }) => {
      if (msg.type === "STATE_UPDATE" && msg.state) {
        setState(msg.state);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const send = useCallback((type: string, extra?: Record<string, unknown>) => {
    chrome.runtime.sendMessage({ type, ...extra }).catch(() => {});
  }, []);

  const handleStartStop = () => {
    send(state.running ? "STOP" : "START");
  };

  const handleRetry = (clipId: string) => {
    send("RETRY_CLIP", { clipId });
  };

  const sessionDuration = state.session.startedAt
    ? Math.floor((Date.now() - state.session.startedAt) / 1000)
    : 0;
  const estRemaining =
    state.queueCount > 0 && state.session.done > 0 && sessionDuration > 0
      ? Math.round((state.queueCount / state.session.done) * sessionDuration)
      : null;

  return (
    <div className="bg-bg-base text-text-primary font-sans p-4 w-[480px] min-h-[520px] flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-accent-primary flex items-center justify-center">
            <span className="text-xs font-bold text-white">RF</span>
          </div>
          <span className="font-semibold text-base">ReelForge Operator</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className={`w-2 h-2 rounded-full ${state.connected ? "bg-accent-success" : "bg-accent-danger"}`}
          />
          <span className="text-xs text-text-secondary">
            {state.connected ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>

      <div className="h-px bg-border" />

      {/* Selector error banner */}
      {state.selectorError && (
        <div className="bg-accent-danger/10 border border-accent-danger/30 rounded-lg p-3">
          <p className="text-accent-danger text-xs font-semibold mb-1">Selector Error</p>
          <p className="text-text-secondary text-xs">
            <span className="text-text-primary font-mono">{state.selectorError.name}</span> not
            found on page.
          </p>
          <p className="text-text-muted text-xs mt-1 font-mono break-all">
            {state.selectorError.selector}
          </p>
          <p className="text-text-muted text-xs mt-1">
            Update it in{" "}
            <button
              className="text-accent-primary underline"
              onClick={() => chrome.runtime.openOptionsPage()}
            >
              Settings
            </button>
          </p>
        </div>
      )}

      {/* Queue stat */}
      <div className="bg-bg-surface rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-text-muted text-xs uppercase tracking-wide mb-1">Queue</p>
          <p className="text-2xl font-bold">
            {state.queueCount}{" "}
            <span className="text-text-secondary text-sm font-normal">pending clips</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-text-muted text-xs uppercase tracking-wide mb-1">Active tabs</p>
          <p className="text-2xl font-bold text-accent-secondary">{state.activeTabs}</p>
        </div>
      </div>

      {/* Controls */}
      <Controls />

      {/* Start / Stop */}
      <button
        onClick={handleStartStop}
        className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
          state.running
            ? "bg-accent-danger/20 border border-accent-danger/40 text-accent-danger hover:bg-accent-danger/30"
            : "bg-accent-primary hover:bg-accent-primary/90 text-white"
        }`}
      >
        {state.running ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent-danger animate-pulse" />
            Stop Processing
          </span>
        ) : (
          "▶ Start Processing"
        )}
      </button>

      {/* Session stats */}
      {state.session.startedAt && (
        <div className="bg-bg-surface rounded-xl p-3 flex items-center justify-between text-sm">
          <div className="flex gap-4">
            <Stat label="Done" value={state.session.done} color="text-accent-success" />
            <Stat label="Failed" value={state.session.failed} color="text-accent-danger" />
          </div>
          {estRemaining && (
            <p className="text-text-muted text-xs">
              Est. remaining: ~{formatDuration(estRemaining)}
            </p>
          )}
        </div>
      )}

      {/* Failed clips */}
      {state.failedClips.length > 0 && (
        <FailedList clips={state.failedClips} onRetry={handleRetry} />
      )}

      {/* Footer link to options */}
      <div className="mt-auto pt-2 flex justify-end">
        <button
          onClick={() => chrome.runtime.openOptionsPage()}
          className="text-text-muted text-xs hover:text-text-secondary transition-colors"
        >
          ⚙ Settings
        </button>
      </div>
    </div>
  );
}

// ── Controls (reads / writes chrome.storage.local) ────────────────────────────

function Controls() {
  const [batchSize, setBatchSize] = useStorageValue<number>("batchSize", 30);
  const [autoClick, setAutoClick] = useStorageValue<boolean>("autoClick", true);
  const [delayMode, setDelayMode] = useStorageValue<string>("clickDelayMode", "normal");
  const [concurrentTabs, setConcurrentTabs] = useStorageValue<number>("concurrentTabs", 5);

  return (
    <div className="bg-bg-surface rounded-xl p-3 grid grid-cols-2 gap-3 text-sm">
      <label className="flex flex-col gap-1">
        <span className="text-text-muted text-xs">Batch size</span>
        <input
          type="number"
          min={1}
          max={50}
          value={batchSize}
          onChange={(e) => setBatchSize(Number(e.target.value))}
          className="bg-bg-elevated border border-border rounded-lg px-2 py-1 text-text-primary text-sm w-full"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-text-muted text-xs">Concurrent tabs</span>
        <input
          type="number"
          min={1}
          max={50}
          value={concurrentTabs}
          onChange={(e) => setConcurrentTabs(Number(e.target.value))}
          className="bg-bg-elevated border border-border rounded-lg px-2 py-1 text-text-primary text-sm w-full"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-text-muted text-xs">Auto-click</span>
        <button
          onClick={() => setAutoClick(!autoClick)}
          className={`w-full py-1 rounded-lg border text-xs font-semibold transition-colors ${
            autoClick
              ? "border-accent-success/40 text-accent-success bg-accent-success/10"
              : "border-border text-text-muted"
          }`}
        >
          {autoClick ? "ON" : "OFF"}
        </button>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-text-muted text-xs">Click delay</span>
        <select
          value={delayMode}
          onChange={(e) => setDelayMode(e.target.value)}
          className="bg-bg-elevated border border-border rounded-lg px-2 py-1 text-text-primary text-sm w-full"
        >
          <option value="fast">Fast (1–2s)</option>
          <option value="normal">Normal (2–5s)</option>
          <option value="slow">Slow (5–10s)</option>
        </select>
      </label>
    </div>
  );
}

// ── Failed clips list ─────────────────────────────────────────────────────────

function FailedList({
  clips,
  onRetry,
}: {
  clips: FailedClipEntry[];
  onRetry: (id: string) => void;
}) {
  return (
    <div className="bg-bg-surface rounded-xl p-3">
      <p className="text-text-muted text-xs uppercase tracking-wide mb-2">
        Failed clips ({clips.length})
      </p>
      <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
        {clips.map((c) => (
          <div
            key={c.clipId}
            className="flex items-start justify-between gap-2 bg-bg-elevated rounded-lg p-2"
          >
            <div className="min-w-0">
              <p className="text-xs text-text-secondary truncate">
                Scene {c.sceneIndex + 1} — video {c.videoId.slice(0, 8)}…
              </p>
              <p className="text-xs text-accent-danger mt-0.5 truncate">{c.errorMessage}</p>
            </div>
            <button
              onClick={() => onRetry(c.clipId)}
              className="shrink-0 text-xs text-accent-primary hover:text-accent-primary/80 underline whitespace-nowrap"
            >
              Retry
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div>
      <span className={`font-bold text-lg ${color}`}>{value}</span>{" "}
      <span className="text-text-muted text-xs">{label}</span>
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function useStorageValue<T>(
  key: string,
  defaultValue: T,
): [T, (val: T) => void] {
  const [value, setValue] = useReducer((_: T, next: T) => next, defaultValue);

  useEffect(() => {
    chrome.storage.local.get(key).then((res) => {
      if (res[key] !== undefined) setValue(res[key] as T);
    });
  }, [key]);

  const set = useCallback(
    (val: T) => {
      setValue(val);
      chrome.storage.local.set({ [key]: val });
    },
    [key],
  );

  return [value, set];
}
