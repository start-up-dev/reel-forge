// Content script — injected into grok.com tabs.
// Shows a floating overlay with prompts for manual copy/paste.
// Watches for the generated video; the operator clicks Download to trigger upload.

import type { ClaimedClip } from "../lib/api-client.js";

interface ProcessClipMsg {
  type: "PROCESS_CLIP";
  clip: ClaimedClip;
  visualPrompt: string;
  backendUrl: string;
  operatorSecret: string;
  textExcerpt: string | null;
  videoType: string | null;
  characterSheetBytes: number[] | null;
  characterSheetType: string;
}

// ── Entry point ───────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(
  (message: ProcessClipMsg, _sender, sendResponse) => {
    if (message.type !== "PROCESS_CLIP") return;
    sendResponse({ ok: true });
    void processClip(message).catch((err: unknown) => {
      chrome.runtime.sendMessage({
        type: "CLIP_FAILED",
        clipId: message.clip.id,
        error: err instanceof Error ? err.message : String(err),
      });
    });
  },
);

function attachImageViaMainWorld(
  clipId: string,
  imageBytes: Uint8Array,
  imageType: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        type: "ATTACH_IMAGE",
        clipId,
        imageBytes: Array.from(imageBytes),
        imageType,
      },
      (response: { ok: boolean; reason?: string } | undefined) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (response?.ok) {
          resolve();
        } else {
          reject(new Error(response?.reason ?? "ATTACH_IMAGE failed"));
        }
      },
    );
  });
}

async function processClip(msg: ProcessClipMsg): Promise<void> {
  const { clip, visualPrompt, backendUrl, operatorSecret, characterSheetBytes, characterSheetType } = msg;

  // ── Phase 0: attach character sheet (if present) ──────────────────────────
  if (characterSheetBytes && characterSheetBytes.length > 0) {
    try {
      const bytes = new Uint8Array(characterSheetBytes);
      await attachImageViaMainWorld(clip.id, bytes, characterSheetType);
      // Wait for Grok's UI to process the file upload
      await sleep(800);
    } catch (err) {
      console.warn("[RF] Character sheet attachment failed:", err);
      // Non-fatal — continue without character sheet
    }
  }

  const preExistingVideoSrcs = snapshotVideoSrcs();
  const videoSrc = await showOverlay(clip, visualPrompt, preExistingVideoSrcs);
  chrome.runtime.sendMessage({
    type: "UPLOAD_VIDEO",
    clipId: clip.id,
    videoUrl: videoSrc,
    backendUrl,
    operatorSecret,
  });
}

// ── Overlay ───────────────────────────────────────────────────────────────────

function showOverlay(
  clip: ClaimedClip,
  visualPrompt: string,
  preExisting: Set<string>,
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const host = document.createElement("div");
    host.style.cssText =
      "position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647;overflow:visible;";
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: "open" });

    shadow.innerHTML = buildOverlayHTML(clip, visualPrompt);

    const statusEl  = shadow.getElementById("rf-status")!;
    const dotEl     = shadow.getElementById("rf-dot")!;
    const dlBtn     = shadow.getElementById("rf-download") as HTMLButtonElement;
    const cancelBtn = shadow.getElementById("rf-cancel") as HTMLButtonElement;

    function setStatus(
      text: string,
      type: "waiting" | "detecting" | "ready" | "uploading" | "error",
    ): void {
      const colors: Record<string, string> = {
        waiting:   "#a1a1aa",
        detecting: "#FBBF24",
        ready:     "#34D399",
        uploading: "#4a90e2",
        error:     "#F87171",
      };
      const c = colors[type] ?? "#a1a1aa";
      statusEl.textContent = text;
      statusEl.style.color = c;
      dotEl.style.background = c;
    }

    shadow.getElementById("rf-copy-visual")?.addEventListener("click", () => {
      void flashCopy(visualPrompt, shadow.getElementById("rf-copy-visual") as HTMLButtonElement);
    });

    let resolvedVideoSrc: string | null = null;
    let stopWatching = (): void => {};
    let watchStarted = false;

    function startWatching(): void {
      if (watchStarted) return;
      watchStarted = true;

      // Snapshot at this moment — user has just copied the motion prompt and
      // is about to generate. Any video in the DOM right now is pre-existing.
      const freshPreExisting = snapshotVideoSrcs();
      for (const src of preExisting) freshPreExisting.add(src);

      setStatus("Watching for generated video…", "waiting");

      stopWatching = watchForVideo(freshPreExisting, async (videoEl) => {
        setStatus("Video detected — checking readiness…", "detecting");
        try {
          await waitForVideoReady(videoEl, 5 * 60 * 1000);
        } catch {
          // Timed out — proceed; SW download handles its own retries.
        }
        const src =
          videoEl.currentSrc ||
          videoEl.src ||
          videoEl.querySelector("source")?.src;
        if (!src) {
          setStatus("Video found but URL is empty — try again", "error");
          return;
        }
        resolvedVideoSrc = src;
        setStatus("Video ready — click Download to upload", "ready");
        dlBtn.disabled = false;
        dlBtn.style.background = "#34D399";
        dlBtn.style.color = "#09090b";
        dlBtn.style.opacity = "1";
        dlBtn.style.cursor = "pointer";
      });
    }

    shadow.getElementById("rf-copy-motion")?.addEventListener("click", () => {
      void flashCopy(
        clip.motionPrompt,
        shadow.getElementById("rf-copy-motion") as HTMLButtonElement,
      );
      startWatching();
    });

    dlBtn.addEventListener("click", () => {
      if (!resolvedVideoSrc) return;
      stopWatching();
      setStatus("Uploading… tab will close when done", "uploading");
      dlBtn.disabled = true;
      dlBtn.style.background = "#27272a";
      dlBtn.style.color = "#52525b";
      dlBtn.style.opacity = "0.45";
      dlBtn.style.cursor = "not-allowed";
      cancelBtn.disabled = true;
      cancelBtn.style.opacity = "0.45";
      cancelBtn.style.cursor = "not-allowed";
      resolve(resolvedVideoSrc);
    });

    cancelBtn.addEventListener("click", () => {
      stopWatching();
      host.remove();
      reject(new Error("Operator cancelled clip"));
    });
  });
}

function buildOverlayHTML(clip: ClaimedClip, visualPrompt: string): string {
  const title      = esc(clip.videoTitle ?? "Untitled");
  const sceneLabel = `Scene ${clip.sceneIndex + 1}`;
  const vp         = esc(visualPrompt);
  const mp         = esc(clip.motionPrompt ?? "");

  const copyBtnStyle =
    "border:none;border-radius:5px;padding:6px 10px;font-size:12px;font-family:inherit;" +
    "cursor:pointer;width:100%;text-align:left;background:#27272a;color:#F4F4F8;margin-top:6px;";

  return `
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 2px; }
</style>
<div style="position:fixed;top:16px;right:16px;width:296px;background:#111113;border:1px solid #27272a;border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,.75);font-family:system-ui,-apple-system,sans-serif;font-size:13px;color:#F4F4F8;overflow:hidden;pointer-events:all;">

  <div style="background:#f55c2a;padding:10px 14px;">
    <div style="font-size:9px;font-weight:700;letter-spacing:1.2px;opacity:.75;text-transform:uppercase;">ReelForge</div>
    <div style="font-size:13px;font-weight:600;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${title}">
      ${sceneLabel} — ${title}
    </div>
  </div>

  <div style="padding:8px 14px;background:#1a1a1e;border-bottom:1px solid #27272a;font-size:10px;color:#71717a;line-height:1.7;">
    ① Copy visual prompt → paste in Grok → generate image<br>
    ② Open lightbox → click video icon → copy motion prompt → generate<br>
    ③ Click <strong style="color:#a1a1aa;">Download</strong> below when the video appears
  </div>

  <div style="padding:10px 14px;border-bottom:1px solid #27272a;">
    <div style="font-size:9px;font-weight:700;color:#a1a1aa;letter-spacing:.8px;text-transform:uppercase;margin-bottom:6px;">Visual Prompt (image)</div>
    <div style="background:#1a1a1e;border-radius:6px;padding:8px 10px;font-size:11px;line-height:1.5;max-height:80px;overflow-y:auto;word-break:break-word;white-space:pre-wrap;color:#e4e4e7;">${vp}</div>
    <button id="rf-copy-visual" style="${copyBtnStyle}">Copy Visual Prompt</button>
  </div>

  <div style="padding:10px 14px;border-bottom:1px solid #27272a;">
    <div style="font-size:9px;font-weight:700;color:#a1a1aa;letter-spacing:.8px;text-transform:uppercase;margin-bottom:6px;">Motion Prompt (video)</div>
    <div style="background:#1a1a1e;border-radius:6px;padding:8px 10px;font-size:11px;line-height:1.5;max-height:80px;overflow-y:auto;word-break:break-word;white-space:pre-wrap;color:#e4e4e7;">${mp}</div>
    <button id="rf-copy-motion" style="${copyBtnStyle}">Copy Motion Prompt</button>
  </div>

  <div style="padding:10px 14px;">
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
      <div id="rf-dot" style="width:6px;height:6px;border-radius:50%;flex-shrink:0;background:#a1a1aa;"></div>
      <div id="rf-status" style="font-size:11px;color:#a1a1aa;">Copy Motion Prompt to begin watching</div>
    </div>
    <div style="display:flex;gap:6px;">
      <button id="rf-download" disabled style="flex:1;border:none;border-radius:5px;padding:6px 10px;font-size:12px;font-family:inherit;font-weight:600;background:#27272a;color:#52525b;opacity:.45;cursor:not-allowed;">Download & Upload</button>
      <button id="rf-cancel" style="border:none;border-radius:5px;padding:6px 10px;font-size:12px;font-family:inherit;cursor:pointer;background:#27272a;color:#F87171;">Cancel</button>
    </div>
  </div>
</div>`;
}

async function flashCopy(text: string, btn: HTMLButtonElement): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    return;
  }
  const orig = btn.textContent ?? "";
  btn.textContent = "✓ Copied!";
  btn.style.background = "#34D399";
  btn.style.color = "#09090b";
  await sleep(1500);
  btn.textContent = orig;
  btn.style.background = "#27272a";
  btn.style.color = "#F4F4F8";
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Video watching ────────────────────────────────────────────────────────────

function watchForVideo(
  preExisting: Set<string>,
  onFound: (v: HTMLVideoElement) => Promise<void>,
): () => void {
  let stopped = false;
  let triggered = false;

  function isNew(v: HTMLVideoElement): boolean {
    const src = v.src || v.querySelector("source")?.src || "";
    // Mirror the SW's placeholder check: Grok's default dancing-bear video is
    // always served from imagine-public.x.ai/imagine-public/share-videos/.
    // Real generated clips come from assets.grok.com/users/{id}/generated/.
    return !!(
      src &&
      !preExisting.has(src) &&
      !src.includes("imagine-public.x.ai/imagine-public/share-videos/")
    );
  }

  function findNew(): HTMLVideoElement | null {
    for (const v of document.querySelectorAll<HTMLVideoElement>("video")) {
      if (isNew(v)) return v;
    }
    return null;
  }

  function tryFound(v: HTMLVideoElement): void {
    if (stopped || triggered) return;
    triggered = true;
    observer.disconnect();
    clearInterval(iv);
    void onFound(v);
  }

  const observer = new MutationObserver((mutations) => {
    if (stopped || triggered) return;
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLVideoElement && isNew(node)) { tryFound(node); return; }
        if (node instanceof Element) {
          for (const v of node.querySelectorAll<HTMLVideoElement>("video")) {
            if (isNew(v)) { tryFound(v); return; }
          }
        }
      }
      if (
        mutation.type === "attributes" &&
        mutation.target instanceof HTMLVideoElement &&
        isNew(mutation.target)
      ) { tryFound(mutation.target); return; }
    }
    const el = findNew();
    if (el) tryFound(el);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["src"],
  });

  const iv = setInterval(() => {
    if (stopped || triggered) { clearInterval(iv); return; }
    const el = findNew();
    if (el) tryFound(el);
  }, 1000);

  return () => {
    stopped = true;
    observer.disconnect();
    clearInterval(iv);
  };
}

// ── Video readiness poll ──────────────────────────────────────────────────────

async function waitForVideoReady(videoEl: HTMLVideoElement, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastSrc =
    videoEl.currentSrc || videoEl.src || videoEl.querySelector("source")?.src || "";
  let srcStableSince = Date.now();

  while (Date.now() < deadline) {
    await sleep(1000);

    if (videoEl.error) {
      throw new Error(`Video element error: code=${videoEl.error.code}`);
    }

    const currentSrc =
      videoEl.currentSrc || videoEl.src || videoEl.querySelector("source")?.src || "";

    if (currentSrc !== lastSrc) {
      lastSrc = currentSrc;
      srcStableSince = Date.now();
      continue;
    }

    const hasMetadata =
      currentSrc.length > 0 &&
      !isNaN(videoEl.duration) &&
      videoEl.duration > 0 &&
      videoEl.readyState >= 2;

    if (Date.now() - srcStableSince >= 3000 && hasMetadata) return;
  }
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function snapshotVideoSrcs(): Set<string> {
  const srcs = new Set<string>();
  document.querySelectorAll<HTMLVideoElement>("video").forEach((v) => {
    if (v.src) srcs.add(v.src);
    v.querySelectorAll("source").forEach((s) => { if (s.src) srcs.add(s.src); });
  });
  return srcs;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
