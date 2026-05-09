import { useEffect, useReducer, useCallback, useState, useRef } from "react";
import type { WorkerState, StoredClipStatus, StoredClipStatusMap } from "../lib/messages.js";

type StatusFilter = "all" | StoredClipStatus["status"];

const STATUS_ORDER: Record<StoredClipStatus["status"], number> = {
  failed: 0,
  processing: 1,
  queued: 2,
  done: 3,
};

// ── Sound notifications ───────────────────────────────────────────────────────

let _audioCtx: AudioContext | null = null;
function getAudioCtx(): AudioContext {
  if (!_audioCtx || _audioCtx.state === "closed") _audioCtx = new AudioContext();
  return _audioCtx;
}

function tone(
  ctx: AudioContext,
  freq: number,
  dur: number,
  type: OscillatorType = "sine",
  vol = 0.25,
): Promise<void> {
  return new Promise((resolve) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start();
    osc.stop(ctx.currentTime + dur);
    osc.onended = () => resolve();
  });
}

async function soundStart(): Promise<void> {
  const ctx = getAudioCtx();
  await tone(ctx, 440, 0.06);
  await tone(ctx, 587, 0.10);
}

async function soundDone(): Promise<void> {
  const ctx = getAudioCtx();
  await tone(ctx, 523, 0.07);
  await tone(ctx, 784, 0.14);
}

async function soundFailed(): Promise<void> {
  const ctx = getAudioCtx();
  await tone(ctx, 311, 0.10, "sawtooth", 0.18);
  await tone(ctx, 208, 0.18, "sawtooth", 0.12);
}

async function soundAllDone(): Promise<void> {
  const ctx = getAudioCtx();
  await tone(ctx, 523, 0.08);
  await tone(ctx, 659, 0.08);
  await tone(ctx, 784, 0.08);
  await tone(ctx, 1047, 0.28);
}

async function soundStop(): Promise<void> {
  const ctx = getAudioCtx();
  await tone(ctx, 349, 0.08);
  await tone(ctx, 261, 0.14);
}

function useSoundNotifications(
  state: WorkerState,
  clipCounts: Record<StoredClipStatus["status"], number>,
  soundEnabled: boolean,
): void {
  const prev = useRef({ done: 0, failed: 0, running: false, seeded: false });

  useEffect(() => {
    if (!prev.current.seeded) {
      prev.current = { done: clipCounts.done, failed: clipCounts.failed, running: state.running, seeded: true };
      return;
    }
    const { done: prevDone, failed: prevFailed, running: wasRunning } = prev.current;
    prev.current = { done: clipCounts.done, failed: clipCounts.failed, running: state.running, seeded: true };
    if (!soundEnabled) return;

    if (!wasRunning && state.running) { void soundStart(); return; }
    if (wasRunning && !state.running && state.queueCount === 0 && state.activeTabs === 0) { void soundAllDone(); return; }
    if (wasRunning && !state.running) { void soundStop(); return; }
    if (clipCounts.failed > prevFailed) { void soundFailed(); }
    else if (clipCounts.done > prevDone) { void soundDone(); }
  }, [clipCounts.done, clipCounts.failed, state.running, state.queueCount, state.activeTabs, soundEnabled]);
}

const EMPTY_STATE: WorkerState = {
  running: false,
  connected: false,
  queueCount: 0,
  activeTabs: 0,
  lastUpdatedAt: 0,
  session: { done: 0, failed: 0, startedAt: null },
  failedClips: [],
  selectorError: null,
  clipStatuses: {},
};

// ── Popup root ────────────────────────────────────────────────────────────────

export function Popup() {
  // window.innerWidth > 600 means we're opened as a tab, not a popup
  const [isFullPage] = useState(() => window.innerWidth > 600);

  const [state, setState] = useReducer(
    (_prev: WorkerState, next: WorkerState) => next,
    EMPTY_STATE,
  );
  const [soundEnabled, setSoundEnabled] = useStorageValue<boolean>("soundEnabled", true);

  useEffect(() => {
    chrome.runtime
      .sendMessage({ type: "GET_STATE" })
      .then((res: { state: WorkerState }) => { if (res?.state) setState(res.state); })
      .catch(() => {});
    chrome.runtime.sendMessage({ type: "REFRESH_QUEUE" }).catch(() => {});

    const listener = (msg: { type: string; state?: WorkerState }) => {
      if (msg.type === "STATE_UPDATE" && msg.state) setState(msg.state);
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const send = useCallback((type: string, extra?: Record<string, unknown>) => {
    chrome.runtime.sendMessage({ type, ...extra }).catch(() => {});
  }, []);

  const handleRetry = (clipId: string) => send("RETRY_CLIP", { clipId });

  const clipCounts = Object.values(state.clipStatuses).reduce(
    (acc, c) => { acc[c.status] = (acc[c.status] ?? 0) + 1; return acc; },
    { done: 0, failed: 0, processing: 0, queued: 0 } as Record<StoredClipStatus["status"], number>,
  );

  useSoundNotifications(state, clipCounts, soundEnabled);

  const header = (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-accent-primary flex items-center justify-center">
          <span className="text-xs font-bold text-white">RF</span>
        </div>
        <span className="font-semibold text-base">ReelForge Operator</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${state.connected ? "bg-accent-success" : "bg-accent-danger"}`} />
          <span className="text-xs text-text-secondary">{state.connected ? "Connected" : "Disconnected"}</span>
        </div>
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`text-sm transition-colors ${soundEnabled ? "text-accent-primary hover:text-accent-primary/70" : "text-text-muted hover:text-text-secondary"}`}
          title={soundEnabled ? "Sound on" : "Sound off"}
        >
          {soundEnabled ? "🔔" : "🔕"}
        </button>
        <button
          onClick={() => send("REFRESH_QUEUE")}
          className="text-text-muted hover:text-text-secondary text-xs transition-colors"
          title="Refresh"
        >
          ↻
        </button>
        {!isFullPage && (
          <button
            onClick={() => chrome.tabs.create({ url: chrome.runtime.getURL("popup/index.html") })}
            className="text-text-muted hover:text-text-secondary text-xs transition-colors"
            title="Open in full tab"
          >
            ⤢
          </button>
        )}
      </div>
    </div>
  );

  const queueCard = (
    <div className="bg-bg-surface rounded-xl p-4 flex items-center justify-between">
      <div>
        <p className="text-text-muted text-xs uppercase tracking-wide mb-1">Queue</p>
        <p className="text-2xl font-bold">
          {state.queueCount}{" "}
          <span className="text-text-secondary text-sm font-normal">pending</span>
        </p>
      </div>
      <div className="text-right">
        <p className="text-text-muted text-xs uppercase tracking-wide mb-1">Active tabs</p>
        <p className="text-2xl font-bold text-accent-secondary">{state.activeTabs}</p>
      </div>
    </div>
  );

  const startStopBtn = (
    <button
      onClick={() => send(state.running ? "STOP" : "START")}
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
  );

  const selectorError = state.selectorError && (
    <div className="bg-accent-danger/10 border border-accent-danger/30 rounded-lg p-3">
      <p className="text-accent-danger text-xs font-semibold mb-1">Selector Error</p>
      <p className="text-text-secondary text-xs">
        <span className="text-text-primary font-mono">{state.selectorError.name}</span> not found.
      </p>
      <p className="text-text-muted text-xs mt-1">
        <button className="text-accent-primary underline" onClick={() => chrome.runtime.openOptionsPage()}>
          Open Settings
        </button>
      </p>
    </div>
  );

  const settingsFooter = (
    <div className="pt-1 flex justify-end">
      <button
        onClick={() => chrome.runtime.openOptionsPage()}
        className="text-text-muted text-xs hover:text-text-secondary transition-colors"
      >
        ⚙ Settings
      </button>
    </div>
  );

  if (isFullPage) {
    return (
      <div className="bg-bg-base text-text-primary font-sans p-6 w-full min-h-screen flex flex-col gap-4">
        {header}
        <div className="h-px bg-border" />
        {selectorError}
        <div className="grid grid-cols-[340px_1fr] gap-6 flex-1 min-h-0">
          {/* Left column */}
          <div className="flex flex-col gap-4">
            {queueCard}
            <Controls />
            {startStopBtn}
            {settingsFooter}
          </div>
          {/* Right column — clips fill full height */}
          <div className="flex flex-col min-h-0">
            <ClipStatusBoard statuses={state.clipStatuses} onRetry={handleRetry} isFullPage />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-base text-text-primary font-sans p-4 w-[480px] min-h-[520px] flex flex-col gap-4">
      {header}
      <div className="h-px bg-border" />
      {selectorError}
      {queueCard}
      <Controls />
      {startStopBtn}
      <ClipStatusBoard statuses={state.clipStatuses} onRetry={handleRetry} isFullPage={false} />
      {settingsFooter}
    </div>
  );
}

// ── Controls ──────────────────────────────────────────────────────────────────

function Controls() {
  const [batchSize, setBatchSize] = useStorageValue<number>("batchSize", 30);
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
    </div>
  );
}

// ── Clip Status Board ─────────────────────────────────────────────────────────

function StatusPill({ status }: { status: StoredClipStatus["status"] }) {
  const styles: Record<StoredClipStatus["status"], string> = {
    queued:     "bg-bg-elevated text-text-muted",
    processing: "bg-accent-warning/20 text-accent-warning animate-pulse",
    done:       "bg-accent-success/20 text-accent-success",
    failed:     "bg-accent-danger/20 text-accent-danger",
  };
  const labels: Record<StoredClipStatus["status"], string> = {
    queued: "Queued", processing: "Processing", done: "Done", failed: "Failed",
  };
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function ClipStatusBoard({
  statuses,
  onRetry,
  isFullPage,
}: {
  statuses: StoredClipStatusMap;
  onRetry: (id: string) => void;
  isFullPage: boolean;
}) {
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [retrying, setRetrying] = useState<Set<string>>(new Set());

  const allEntries = Object.values(statuses).sort((a, b) => {
    const d = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (d !== 0) return d;
    if (a.status === "failed") return (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
    return (a.videoTitle ?? "").localeCompare(b.videoTitle ?? "") || a.sceneIndex - b.sceneIndex;
  });

  const counts = allEntries.reduce(
    (acc, e) => { acc[e.status]++; return acc; },
    { failed: 0, processing: 0, queued: 0, done: 0 } as Record<StoredClipStatus["status"], number>,
  );

  const filtered = filter === "all" ? allEntries : allEntries.filter((e) => e.status === filter);

  const groups = filtered.reduce<Record<string, StoredClipStatus[]>>((acc, e) => {
    (acc[e.videoId] ??= []).push(e);
    return acc;
  }, {});

  const handleRetry = (clipId: string) => {
    setRetrying((prev) => new Set([...prev, clipId]));
    onRetry(clipId);
    setTimeout(() => {
      setRetrying((prev) => { const next = new Set(prev); next.delete(clipId); return next; });
    }, 10_000);
  };

  const filterTabs: { key: StatusFilter; label: string; count: number }[] = [
    { key: "all",        label: "All",        count: allEntries.length },
    { key: "failed",     label: "Failed",     count: counts.failed },
    { key: "processing", label: "Active",     count: counts.processing },
    { key: "queued",     label: "Queued",     count: counts.queued },
    { key: "done",       label: "Done",       count: counts.done },
  ];

  const listCls = isFullPage
    ? "flex flex-col gap-3 overflow-y-auto flex-1 min-h-0 pr-1"
    : "flex flex-col gap-3 max-h-72 overflow-y-auto";

  return (
    <div className={`bg-bg-surface rounded-xl p-3 ${isFullPage ? "flex flex-col flex-1 min-h-0" : ""}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-text-muted text-xs uppercase tracking-wide">
          Clips{allEntries.length > 0 ? ` (${allEntries.length})` : ""}
        </p>
      </div>

      {allEntries.length > 0 && (
        <div className="flex gap-1 mb-2 flex-wrap">
          {filterTabs.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                filter === key
                  ? key === "failed"
                    ? "bg-accent-danger/20 border-accent-danger/40 text-accent-danger"
                    : key === "processing"
                      ? "bg-accent-warning/20 border-accent-warning/40 text-accent-warning"
                      : key === "done"
                        ? "bg-accent-success/20 border-accent-success/40 text-accent-success"
                        : "bg-accent-primary/20 border-accent-primary/40 text-accent-primary"
                  : "border-border text-text-muted hover:text-text-secondary"
              }`}
            >
              {label}{count > 0 ? ` (${count})` : ""}
            </button>
          ))}
        </div>
      )}

      {allEntries.length === 0 ? (
        <p className="text-text-muted text-xs text-center py-4">No clips yet</p>
      ) : filtered.length === 0 ? (
        <p className="text-text-muted text-xs text-center py-4">No {filter} clips</p>
      ) : (
        <div className={listCls}>
          {Object.entries(groups).map(([videoId, clips]) => (
            <div key={videoId}>
              <p className="text-[10px] text-text-muted uppercase tracking-wide mb-1.5 truncate">
                {clips[0]?.videoTitle ?? videoId.slice(0, 8) + "…"}
              </p>
              <div className="flex flex-col gap-1">
                {clips.map((clip) => (
                  <div
                    key={clip.clipId}
                    className="flex items-center gap-2 bg-bg-elevated rounded-lg px-2 py-1.5"
                  >
                    <span className="text-xs text-text-muted w-14 shrink-0">
                      Scene {clip.sceneIndex + 1}
                    </span>
                    <span className="text-xs text-text-secondary truncate flex-1 min-w-0">
                      {clip.motionPrompt.slice(0, isFullPage ? 80 : 40)}
                      {clip.motionPrompt.length > (isFullPage ? 80 : 40) ? "…" : ""}
                    </span>
                    <StatusPill status={clip.status} />
                    {clip.status === "failed" && clip.error && (
                      <span className="text-[10px] text-accent-danger truncate max-w-[100px]">
                        {clip.error}
                      </span>
                    )}
                    {clip.status === "failed" && (
                      <button
                        onClick={() => handleRetry(clip.clipId)}
                        disabled={retrying.has(clip.clipId)}
                        className="shrink-0 text-[10px] text-accent-primary hover:text-accent-primary/80 underline disabled:opacity-50"
                      >
                        {retrying.has(clip.clipId) ? "…" : "Retry"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function useStorageValue<T>(key: string, defaultValue: T): [T, (val: T) => void] {
  const [value, setValue] = useReducer((_: T, next: T) => next, defaultValue);

  useEffect(() => {
    chrome.storage.local.get(key).then((res) => {
      if (res[key] !== undefined) setValue(res[key] as T);
    });
  }, [key]);

  const set = useCallback((val: T) => {
    setValue(val);
    chrome.storage.local.set({ [key]: val });
  }, [key]);

  return [value, set];
}
