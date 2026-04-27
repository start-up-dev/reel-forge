// Content script — injected into grok.com tabs.
//
// Two modes:
//   • PROCESS_CLIP  — normal automation (service worker message)
//   • Teach mode    — URL param ?rf_teach=1, interactive selector capture

import type { DomSelectors, ExtensionSettings } from "../lib/messages.js";
import type { ClaimedClip } from "../lib/api-client.js";

interface ProcessClipMsg {
  type: "PROCESS_CLIP";
  clip: ClaimedClip;
  /** Base image pre-fetched by the SW, sent as number[] to survive Chrome JSON serialization. */
  imageBytes: number[] | null;
  imageType: string;
  autoClick: boolean;
  clickDelayMode: ExtensionSettings["clickDelayMode"];
  selectors: DomSelectors;
  backendUrl: string;
  operatorSecret: string;
  textExcerpt: string | null;
  videoType: string | null;
}

const DELAY_RANGES: Record<ExtensionSettings["clickDelayMode"], [number, number]> = {
  fast: [1000, 2000],
  normal: [2000, 5000],
  slow: [5000, 10000],
};

// ── Teach mode — check URL on load ───────────────────────────────────────────

if (new URLSearchParams(location.search).get("rf_teach") === "1") {
  void runTeachMode();
}

// ── Clip processing ───────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(
  (message: ProcessClipMsg, _sender, sendResponse) => {
    if (message.type !== "PROCESS_CLIP") return;
    sendResponse({ ok: true }); // ack immediately so SW doesn't time out

    void processClip(message).catch((err: unknown) => {
      chrome.runtime.sendMessage({
        type: "CLIP_FAILED",
        clipId: message.clip.id,
        error: err instanceof Error ? err.message : String(err),
      });
    });
  },
);

async function processClip(msg: ProcessClipMsg): Promise<void> {
  const { clip, imageType, autoClick, clickDelayMode, selectors, backendUrl, operatorSecret } = msg;

  // imageBytes arrives as number[] (plain array survives Chrome JSON serialization).
  const imageBytes: Uint8Array | null =
    msg.imageBytes && msg.imageBytes.length > 0 ? new Uint8Array(msg.imageBytes) : null;

  // For talking videos, prepend the exact spoken words so Grok generates accurate
  // lipsync. The character must visibly say these words in the generated clip.
  const isTalking = msg.videoType === "talking";
  const basePrompt = clip.motionPrompt || clip.visualPrompt;

  // 1. Wait for the prompt input to appear (Grok SPA needs time to hydrate).
  await waitForResolved<HTMLElement>(
    () => resolvePromptInput(selectors.promptInput),
    30_000,
    clip.id,
    "promptInput",
    selectors.promptInput,
  );

  // 2. Snapshot ALL video srcs currently on the page BEFORE we touch anything.
  //    Anything that appears after this point is treated as newly generated.
  const preExistingVideoSrcs = snapshotVideoSrcs();

  // 3. Attach the reference image — required for every clip.
  console.log("[RF] imageBytes:", imageBytes ? `${imageBytes.byteLength} bytes` : "null");
  if (!imageBytes || imageBytes.byteLength === 0) {
    throw new Error("No base image bytes received — clip cannot be processed without reference image");
  }
  await attachImageViaMainWorld(clip.id, imageBytes, imageType);
  // Sleep gives Grok time to upload the file to their servers.
  // Grok re-renders the UI after processing the image, so promptEl is now stale.
  await sleep(3000);

  // 4. Re-resolve prompt input — Grok unmounts/remounts the textarea after image upload.
  const freshPromptEl = await waitForResolved<HTMLElement>(
    () => resolvePromptInput(selectors.promptInput),
    10_000,
    clip.id,
    "promptInput",
    selectors.promptInput,
  );

  // 5. Clear any existing text first, then set our prompt.
  //    This prevents Grok from auto-submitting with stale text when the image
  //    is attached (image + pre-existing prompt can trigger auto-generation).
  const promptText =
    isTalking && msg.textExcerpt
      ? `SAY EXACTLY: "${msg.textExcerpt}"\n\n${basePrompt}`
      : basePrompt;

  setReactValue(freshPromptEl, "");
  await sleep(200);
  setReactValue(freshPromptEl, promptText);

  // Brief pause — give Grok time to react to the input events before we check
  // whether generation has already started.
  await sleep(500);

  // 6. Find the generate button.
  const generateBtn = resolveGenerateButton(selectors.generateButton);
  if (!generateBtn) {
    reportSelectorError(clip.id, "generateButton", selectors.generateButton);
    return;
  }

  // 7. Only click if Grok isn't already generating.
  //    Setting React value on the prompt can trigger Grok's own auto-submit
  //    (e.g. "press Enter" or debounced form submit), causing a double generation.
  if (isAlreadyGenerating(generateBtn)) {
    console.log("[RF] Grok is already generating — skipping button click to prevent double submission");
  } else if (autoClick) {
    const [min, max] = DELAY_RANGES[clickDelayMode];
    await sleep(randomBetween(min, max));
    generateBtn.click();
  } else {
    highlightElement(generateBtn);
    await waitForClick(generateBtn, 120_000);
    removeHighlight(generateBtn);
  }

  // 8. Refresh the pre-existing snapshot to exclude any demo/preview videos that
  //    Grok loaded during image upload and prompt setup. We wait 1 s so React
  //    finishes reacting to the button click before we capture the new baseline.
  await sleep(1000);
  const refreshedVideoSrcs = snapshotVideoSrcs();
  const allPreExisting = new Set([...preExistingVideoSrcs, ...refreshedVideoSrcs]);

  const videoEl = await waitForNewVideo(allPreExisting, 8 * 60 * 1000, clip.id, selectors.outputVideo);

  // 9. Wait for the video to be fully generated before capturing the src.
  //    Grok shows a video element early (even at ~10% generation progress) with a
  //    streaming URL. Downloading at that point returns empty bytes. We wait until
  //    the src stabilises and the browser can read video metadata (duration).
  await waitForVideoReady(videoEl, 5 * 60 * 1000);

  // currentSrc is what the browser is actually playing (may differ from the src
  // attribute after React re-renders); prefer it over video.src.
  const videoSrc =
    videoEl.currentSrc ||
    videoEl.src ||
    videoEl.querySelector("source")?.src;
  if (!videoSrc) throw new Error("Video element found but src is empty");

  const isBlob = videoSrc.startsWith("blob:");
  console.log(
    `[RF] Video ready: ${isBlob ? "blob" : "https"} url, ` +
      `duration=${videoEl.duration.toFixed(1)}s readyState=${videoEl.readyState}`,
    videoSrc.substring(0, 80),
  );

  // 10. Hand off to the service worker.
  //     The SW injects a downloader into the page MAIN world (Origin = grok.com,
  //     full cookies) — the only way assets.grok.com returns 200.
  //     The SW then uploads to GCS and marks the clip complete.
  chrome.runtime.sendMessage({
    type: "UPLOAD_VIDEO",
    clipId: clip.id,
    videoUrl: videoSrc,
    backendUrl,
    operatorSecret,
  });
}

// ── Already-generating detection ──────────────────────────────────────────────
// Returns true if Grok has started a generation run without our button click.
// A disabled/busy generate button after we've set a prompt + image is the
// clearest signal — Grok disables it while a request is in flight.

function isAlreadyGenerating(btn: HTMLElement): boolean {
  if (btn instanceof HTMLButtonElement && btn.disabled) return true;
  if (btn.getAttribute("aria-disabled") === "true") return true;
  if (btn.getAttribute("aria-busy") === "true") return true;
  // Loading spinner inside the button
  if (btn.querySelector('[class*="load"], [class*="spin"], [class*="progress"]')) return true;
  return false;
}

// ── Video readiness wait ──────────────────────────────────────────────────────
// Polls until the video's src URL is stable AND the browser has loaded enough
// metadata to confirm the file is accessible (readyState ≥ 2, duration > 0).
// Falls through on timeout so the SW download retry can take over.

async function waitForVideoReady(
  videoEl: HTMLVideoElement,
  timeoutMs: number,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastSrc = videoEl.currentSrc || videoEl.src || videoEl.querySelector("source")?.src || "";
  let srcStableSince = Date.now();

  while (Date.now() < deadline) {
    await sleep(1000);

    // Grok returned a hard error for this clip — no point waiting or downloading.
    if (videoEl.error) {
      throw new Error(
        `Video element error: code=${videoEl.error.code} — ${videoEl.error.message}`,
      );
    }

    const currentSrc =
      videoEl.currentSrc || videoEl.src || videoEl.querySelector("source")?.src || "";

    if (currentSrc !== lastSrc) {
      lastSrc = currentSrc;
      srcStableSince = Date.now();
      continue;
    }

    const msSrcStable = Date.now() - srcStableSince;
    const hasMetadata =
      currentSrc.length > 0 &&
      !isNaN(videoEl.duration) &&
      videoEl.duration > 0 &&
      videoEl.readyState >= 2;

    if (msSrcStable >= 3000 && hasMetadata) {
      console.log(
        `[RF] Video ready — duration=${videoEl.duration.toFixed(1)}s, ` +
          `readyState=${videoEl.readyState}, networkState=${videoEl.networkState}`,
      );
      return;
    }
  }

  // Timed out — log state and proceed; SW download has its own retry loop.
  const src = videoEl.currentSrc || videoEl.src || "";
  console.warn(
    `[RF] waitForVideoReady timed out — proceeding anyway.`,
    `src=${src.substring(0, 80)} duration=${videoEl.duration}`,
    `readyState=${videoEl.readyState} networkState=${videoEl.networkState}`,
    `error=${videoEl.error ? `${videoEl.error.code}/${videoEl.error.message}` : "none"}`,
  );
}

// ── Video snapshot & new-video detection ─────────────────────────────────────

function snapshotVideoSrcs(): Set<string> {
  const srcs = new Set<string>();
  document.querySelectorAll<HTMLVideoElement>("video").forEach((v) => {
    if (v.src) srcs.add(v.src);
    v.querySelectorAll("source").forEach((s) => { if (s.src) srcs.add(s.src); });
  });
  return srcs;
}

/**
 * Waits for a video element whose src was NOT in preExistingVideoSrcs.
 * Uses both MutationObserver (childList + attribute changes) and periodic polling.
 */
function waitForNewVideo(
  preExisting: Set<string>,
  timeoutMs: number,
  clipId: string,
  selectorValue: string,
): Promise<HTMLVideoElement> {
  return new Promise<HTMLVideoElement>((resolve, reject) => {
    function findNew(): HTMLVideoElement | null {
      for (const v of document.querySelectorAll<HTMLVideoElement>("video")) {
        const src = v.src || v.querySelector("source")?.src || "";
        if (src && !preExisting.has(src)) return v;
      }
      return null;
    }

    const already = findNew();
    if (already) { resolve(already); return; }

    const deadline = Date.now() + timeoutMs;

    const observer = new MutationObserver(() => {
      const el = findNew();
      if (el) { observer.disconnect(); clearInterval(iv); resolve(el); }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src"],
    });

    // Polling fallback — MutationObserver can miss blob-src changes in some React renders.
    const iv = setInterval(() => {
      const el = findNew();
      if (el) {
        observer.disconnect();
        clearInterval(iv);
        resolve(el);
        return;
      }
      if (Date.now() > deadline) {
        observer.disconnect();
        clearInterval(iv);
        chrome.runtime.sendMessage({
          type: "SELECTOR_ERROR",
          clipId,
          selectorName: "outputVideo",
          selectorValue,
        });
        reject(new Error(`No new video appeared after ${timeoutMs / 60000} min`));
      }
    }, 1000);
  });
}

// ── Smart element resolution ──────────────────────────────────────────────────
// Try configured CSS selectors first, then fall back to semantic heuristics.

function resolvePromptInput(configured: string): HTMLElement | null {
  const fromConfig = findBySelectorList<HTMLElement>(configured);
  if (fromConfig) return fromConfig;

  const textareas = visibleAll<HTMLTextAreaElement>("textarea");
  for (const ta of textareas) {
    const hint = attrs(ta, "placeholder", "aria-label", "aria-placeholder");
    if (/prompt|descri|imagin|enter|type|create|message|write/i.test(hint)) return ta;
  }
  if (textareas.length) {
    return [...textareas].sort(
      (a, b) => b.getBoundingClientRect().height - a.getBoundingClientRect().height,
    )[0] ?? null;
  }

  for (const el of visibleAll<HTMLElement>('[contenteditable="true"]')) {
    if (el.getBoundingClientRect().height > 30) return el;
  }

  return null;
}

function resolveImageUpload(configured: string): HTMLElement | null {
  const fromConfig = findBySelectorList<HTMLElement>(configured);
  if (fromConfig) return fromConfig;

  // Prefer a real file input (hidden or not) — we set files on it programmatically.
  for (const inp of document.querySelectorAll<HTMLInputElement>('input[type="file"]')) {
    if (/image|photo|picture|\*/i.test(inp.accept || "")) return inp;
  }
  const anyFile = document.querySelector<HTMLInputElement>('input[type="file"]');
  if (anyFile) return anyFile;

  for (const el of visibleAll<HTMLElement>('button, [role="button"], label')) {
    const label = attrs(el, "aria-label", "title") + " " + (el.textContent?.trim() ?? "");
    if (/upload|attach|image|photo|picture|add.?image/i.test(label)) return el;
  }

  return null;
}

function resolveGenerateButton(configured: string): HTMLElement | null {
  const fromConfig = findBySelectorList<HTMLElement>(configured);
  if (fromConfig) return fromConfig;

  for (const el of visibleAll<HTMLElement>('button, [role="button"]')) {
    const text = (attrs(el, "aria-label", "title") + " " + (el.textContent?.trim() ?? ""))
      .trim()
      .toLowerCase();
    if (/^(generate|create|make|run|go|send|submit)$/.test(text)) return el;
    if (/generate|create video|generate video/i.test(text)) return el;
  }

  return visibleAll<HTMLElement>('button[type="submit"]')[0] ?? null;
}

// ── React-compatible value setter ─────────────────────────────────────────────

function setReactValue(el: HTMLElement, value: string): void {
  if (el.getAttribute("contenteditable") === "true") {
    el.focus();
    el.textContent = value;
    el.dispatchEvent(new InputEvent("input", { bubbles: true, data: value }));
    return;
  }

  // Use the native prototype setter so React's synthetic onChange fires.
  const proto =
    el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const nativeSetter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (nativeSetter) {
    nativeSetter.call(el, value);
  } else {
    (el as HTMLInputElement).value = value;
  }
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

// ── File attachment ───────────────────────────────────────────────────────────

function attachImageViaMainWorld(
  clipId: string,
  imageBytes: Uint8Array,
  imageType: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      // Send as number[] — same serialization reason as PROCESS_CLIP.
      { type: "ATTACH_IMAGE", clipId, imageBytes: Array.from(imageBytes), imageType },
      (response: { ok: boolean; error?: string } | undefined) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message ?? "ATTACH_IMAGE: runtime error"));
          return;
        }
        if (!response?.ok) {
          reject(new Error(response?.error ?? "ATTACH_IMAGE failed"));
          return;
        }
        resolve();
      },
    );
  });
}

async function setFileOnElement(el: HTMLElement, blob: Blob): Promise<void> {
  const file = new File([blob], "base_image.jpg", { type: blob.type || "image/jpeg" });

  const fileInput =
    el instanceof HTMLInputElement && el.type === "file"
      ? el
      : findNearestFileInput(el);

  if (fileInput) {
    const dt = new DataTransfer();
    dt.items.add(file);
    fileInput.files = dt.files;
    fileInput.dispatchEvent(new Event("change", { bubbles: true }));
    fileInput.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }

  // Fallback: drag-and-drop event on the element (works for drop-zone UIs).
  const dt = new DataTransfer();
  dt.items.add(file);
  el.dispatchEvent(new DragEvent("dragenter", { bubbles: true, dataTransfer: dt }));
  await sleep(100);
  el.dispatchEvent(new DragEvent("dragover", { bubbles: true, dataTransfer: dt }));
  await sleep(100);
  el.dispatchEvent(new DragEvent("drop", { bubbles: true, dataTransfer: dt }));
}

function findNearestFileInput(el: HTMLElement): HTMLInputElement | null {
  let cur: Element | null = el;
  for (let i = 0; i < 5 && cur; i++) {
    const found = cur.querySelector<HTMLInputElement>('input[type="file"]');
    if (found) return found;
    cur = cur.parentElement;
  }
  return document.querySelector<HTMLInputElement>('input[type="file"]');
}

// ── Teach mode ────────────────────────────────────────────────────────────────

const TEACH_STEPS: { key: keyof DomSelectors; label: string; hint: string }[] = [
  {
    key: "promptInput",
    label: "Prompt textarea",
    hint: "The text box where you type what to generate",
  },
  {
    key: "imageUpload",
    label: "Image upload button or area",
    hint: "Click the button / area used to attach a reference image",
  },
  {
    key: "generateButton",
    label: "Generate button",
    hint: "The button that starts generation",
  },
];

async function runTeachMode(): Promise<void> {
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:2147483647;pointer-events:none;";
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: "open" });

  const banner = document.createElement("div");
  shadow.appendChild(banner);

  const captured: Partial<Record<string, string>> = {};

  for (let i = 0; i < TEACH_STEPS.length; i++) {
    const step = TEACH_STEPS[i]!;
    showBanner(banner, step, i, TEACH_STEPS.length);

    const clickedSelector = await pickElement(shadow);

    if (clickedSelector !== null) {
      if (step.key === "imageUpload") {
        // Always prefer the actual file input for programmatic file setting.
        const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]');
        captured["selectors.imageUpload"] = fileInput
          ? generateSelector(fileInput)
          : clickedSelector;
      } else {
        captured[`selectors.${step.key}`] = clickedSelector;
      }
    }
  }

  if (Object.keys(captured).length > 0) {
    await chrome.storage.local.set(captured);
  }

  showBannerRaw(banner, "✓ Selectors saved! Close this tab and reload extension options.", "#34D399", "#0A0A0F");
  setTimeout(() => host.remove(), 5000);
}

function pickElement(shadow: ShadowRoot): Promise<string | null> {
  return new Promise<string | null>((resolve) => {
    let hovered: Element | null = null;
    const OUTLINE = "3px solid #7C5CFC";

    function applyOutline(el: Element, v: string): void {
      if (el instanceof HTMLElement) { el.style.outline = v; el.style.outlineOffset = "2px"; }
    }

    function onOver(e: MouseEvent): void {
      const el = e.target as Element;
      if (shadow.contains(el) || el === document.body) return;
      if (hovered && hovered !== el) applyOutline(hovered, "");
      hovered = el;
      applyOutline(el, OUTLINE);
    }

    function onOut(e: MouseEvent): void {
      const el = e.target as Element;
      if (hovered === el) { applyOutline(el, ""); hovered = null; }
    }

    function onClick(e: MouseEvent): void {
      const el = e.target as Element;
      if (shadow.contains(el)) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      if (hovered) applyOutline(hovered, "");
      cleanup(generateSelector(el));
    }

    function cleanup(result: string | null): void {
      document.removeEventListener("mouseover", onOver, true);
      document.removeEventListener("mouseout", onOut, true);
      document.removeEventListener("click", onClick, true);
      resolve(result);
    }

    const skipBtn = shadow.querySelector<HTMLElement>("#rf-skip");
    if (skipBtn) {
      skipBtn.style.pointerEvents = "all";
      skipBtn.onclick = () => { if (hovered) applyOutline(hovered, ""); cleanup(null); };
    }

    document.addEventListener("mouseover", onOver, true);
    document.addEventListener("mouseout", onOut, true);
    document.addEventListener("click", onClick, true);
  });
}

function showBanner(
  banner: HTMLElement,
  step: { label: string; hint: string },
  idx: number,
  total: number,
): void {
  const pct = Math.round((idx / total) * 100);
  banner.innerHTML = `
    <div style="background:#7C5CFC;color:#fff;padding:10px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;box-shadow:0 2px 12px rgba(0,0,0,.5);pointer-events:all;font-family:system-ui,sans-serif">
      <span style="font-size:13px;line-height:1.4">
        <strong>ReelForge (${idx + 1}/${total})</strong> — click the
        <strong style="text-decoration:underline">${step.label}</strong>
        <span style="opacity:.75;font-size:11px;margin-left:6px">${step.hint}</span>
      </span>
      <button id="rf-skip" style="background:rgba(255,255,255,.2);border:none;color:#fff;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:12px;white-space:nowrap;pointer-events:all">Skip →</button>
    </div>
    <div style="height:3px;background:rgba(255,255,255,.25)">
      <div style="height:100%;width:${pct}%;background:rgba(255,255,255,.7);transition:width .3s"></div>
    </div>
  `;
}

function showBannerRaw(banner: HTMLElement, msg: string, bg: string, color: string): void {
  banner.innerHTML = `<div style="background:${bg};color:${color};padding:10px 16px;font-family:system-ui,sans-serif;font-size:13px;font-weight:600;box-shadow:0 2px 12px rgba(0,0,0,.4);pointer-events:all">${msg}</div>`;
}

function generateSelector(el: Element): string {
  if (el.id && !/^\d/.test(el.id)) return `#${CSS.escape(el.id)}`;
  const testId = el.getAttribute("data-testid");
  if (testId) return `[data-testid="${testId}"]`;
  const ariaLabel = el.getAttribute("aria-label");
  if (ariaLabel) return `${el.tagName.toLowerCase()}[aria-label="${ariaLabel}"]`;
  if (el instanceof HTMLTextAreaElement && el.placeholder)
    return `textarea[placeholder="${el.placeholder}"]`;
  if (el instanceof HTMLInputElement) {
    if (el.placeholder) return `input[placeholder="${el.placeholder}"]`;
    if (el.name) return `input[name="${el.name}"]`;
    if (el.type !== "text") return `input[type="${el.type}"]`;
  }
  const role = el.getAttribute("role");
  if (role) return `${el.tagName.toLowerCase()}[role="${role}"]`;
  return cssPath(el);
}

function cssPath(el: Element): string {
  const parts: string[] = [];
  let cur: Element | null = el;
  while (cur && cur !== document.body) {
    if (cur.id && !/^\d/.test(cur.id)) { parts.unshift(`#${CSS.escape(cur.id)}`); break; }
    const tag = cur.tagName.toLowerCase();
    const siblings = cur.parentElement
      ? [...cur.parentElement.children].filter((c) => c.tagName === cur!.tagName)
      : [];
    const idx = siblings.indexOf(cur) + 1;
    parts.unshift(siblings.length > 1 ? `${tag}:nth-of-type(${idx})` : tag);
    cur = cur.parentElement;
  }
  return parts.join(" > ");
}

// ── Generic DOM helpers ───────────────────────────────────────────────────────

function findBySelectorList<T extends Element>(selector: string): T | null {
  for (const s of selector.split(",").map((x) => x.trim()).filter(Boolean)) {
    const el = document.querySelector<T>(s);
    if (el) return el;
  }
  return null;
}

function visibleAll<T extends Element>(selector: string): T[] {
  return [...document.querySelectorAll<T>(selector)].filter((el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none";
  });
}

function attrs(el: Element, ...names: string[]): string {
  return names.map((n) => el.getAttribute(n) ?? "").join(" ");
}

// ── Waiting helpers ───────────────────────────────────────────────────────────

function waitForResolved<T extends Element>(
  resolve: () => T | null,
  timeoutMs: number,
  clipId: string,
  selectorName: string,
  selectorValue: string,
): Promise<T> {
  return new Promise<T>((promiseResolve, reject) => {
    const found = resolve();
    if (found) { promiseResolve(found); return; }

    const deadline = Date.now() + timeoutMs;

    const observer = new MutationObserver(() => {
      const el = resolve();
      if (el) { observer.disconnect(); clearInterval(interval); promiseResolve(el); }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const interval = setInterval(() => {
      const el = resolve();
      if (el) { observer.disconnect(); clearInterval(interval); promiseResolve(el); return; }
      if (Date.now() > deadline) {
        observer.disconnect();
        clearInterval(interval);
        chrome.runtime.sendMessage({ type: "SELECTOR_ERROR", clipId, selectorName, selectorValue });
        reject(new Error(`"${selectorName}" not found after ${timeoutMs / 1000}s`));
      }
    }, 500);
  });
}

function waitForClick(el: HTMLElement, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      el.removeEventListener("click", onClicked);
      reject(new Error("Operator did not click Generate within timeout"));
    }, timeoutMs);

    function onClicked(): void { clearTimeout(timer); resolve(); }
    el.addEventListener("click", onClicked, { once: true });
  });
}

// ── Visual feedback ───────────────────────────────────────────────────────────

function highlightElement(el: HTMLElement): void {
  el.style.outline = "3px solid #34D399";
  el.style.boxShadow = "0 0 12px rgba(52,211,153,.6)";
}

function removeHighlight(el: HTMLElement): void {
  el.style.outline = "";
  el.style.boxShadow = "";
}

function reportSelectorError(clipId: string, name: string, value: string): void {
  chrome.runtime.sendMessage({ type: "SELECTOR_ERROR", clipId, selectorName: name, selectorValue: value });
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
