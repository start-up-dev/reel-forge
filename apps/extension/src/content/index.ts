// Content script — injected into grok.com tabs.
// Receives a PROCESS_CLIP message from the service worker, automates the Grok
// Imagine UI, captures the generated video, uploads it to GCS, and reports
// success or failure back to the service worker.

import type { DomSelectors, ExtensionSettings } from "../lib/messages.js";
import type { ClaimedClip } from "../lib/api-client.js";

interface ProcessClipMsg {
  type: "PROCESS_CLIP";
  clip: ClaimedClip;
  autoClick: boolean;
  clickDelayMode: ExtensionSettings["clickDelayMode"];
  selectors: DomSelectors;
  backendUrl: string;
  operatorSecret: string;
}

const DELAY_RANGES: Record<ExtensionSettings["clickDelayMode"], [number, number]> = {
  fast: [1000, 2000],
  normal: [2000, 5000],
  slow: [5000, 10000],
};

// ── Entry point ───────────────────────────────────────────────────────────────

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

// ── Main automation flow ──────────────────────────────────────────────────────

async function processClip(msg: ProcessClipMsg): Promise<void> {
  const { clip, autoClick, clickDelayMode, selectors, backendUrl, operatorSecret } = msg;

  // 1. Wait for the page to be ready (prompt input visible).
  const promptEl = await waitForSelector<HTMLTextAreaElement>(
    selectors.promptInput,
    30_000,
    clip.id,
    "promptInput",
    selectors.promptInput,
  );

  // 2. Download base image from signed URL and set it on the file input.
  if (clip.baseImageUrl) {
    const imageBlob = await fetchBlob(clip.baseImageUrl);
    const fileInput = findElement<HTMLInputElement>(selectors.imageUpload);
    if (!fileInput) {
      reportSelectorError(clip.id, "imageUpload", selectors.imageUpload);
      return;
    }
    const file = new File([imageBlob], "base_image.jpg", { type: imageBlob.type || "image/jpeg" });
    const dt = new DataTransfer();
    dt.items.add(file);
    fileInput.files = dt.files;
    fileInput.dispatchEvent(new Event("change", { bubbles: true }));
    await sleep(500);
  }

  // 3. Type the visual prompt.
  promptEl.focus();
  promptEl.value = clip.visualPrompt;
  promptEl.dispatchEvent(new Event("input", { bubbles: true }));
  promptEl.dispatchEvent(new Event("change", { bubbles: true }));
  await sleep(300);

  // 4. Click Generate (or highlight and wait for operator click).
  const generateBtn = findElement<HTMLButtonElement>(selectors.generateButton);
  if (!generateBtn) {
    reportSelectorError(clip.id, "generateButton", selectors.generateButton);
    return;
  }

  if (autoClick) {
    const [min, max] = DELAY_RANGES[clickDelayMode];
    await sleep(randomBetween(min, max));
    generateBtn.click();
  } else {
    // Highlight the button and wait for the operator to click it manually.
    highlightElement(generateBtn);
    await waitForClick(generateBtn, 120_000);
    removeHighlight(generateBtn);
  }

  // 5. Poll DOM for the generated video element (up to 3 minutes).
  const videoEl = await waitForSelector<HTMLVideoElement>(
    selectors.outputVideo,
    180_000,
    clip.id,
    "outputVideo",
    selectors.outputVideo,
  );

  // 6. Capture the video blob from the src URL.
  const videoSrc = videoEl.src || videoEl.querySelector("source")?.src;
  if (!videoSrc) {
    throw new Error("Video element found but has no src");
  }
  const videoBlob = await fetchBlob(videoSrc);

  // 7. Get signed upload URL from backend.
  const uploadRes = await fetch(`${backendUrl}/api/operator/clips/${clip.id}/upload-url`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Operator-Secret": operatorSecret,
    },
  });
  if (!uploadRes.ok) {
    throw new Error(`Failed to get upload URL: ${uploadRes.status}`);
  }
  const { data } = (await uploadRes.json()) as { data: { uploadUrl: string; gcsPath: string } };

  // 8. Upload to GCS with retry.
  await uploadWithRetry(data.uploadUrl, videoBlob);

  // 9. Mark clip complete.
  const completeRes = await fetch(`${backendUrl}/api/operator/clips/${clip.id}/complete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Operator-Secret": operatorSecret,
    },
    body: JSON.stringify({ gcsPath: data.gcsPath }),
  });
  if (!completeRes.ok) {
    throw new Error(`completeClip failed: ${completeRes.status}`);
  }

  // 10. Notify service worker — tab will be closed.
  chrome.runtime.sendMessage({ type: "CLIP_DONE", clipId: clip.id });
}

// ── DOM helpers ───────────────────────────────────────────────────────────────

function findElement<T extends Element>(selector: string): T | null {
  // Support comma-separated selectors by trying each in order.
  for (const s of selector.split(",").map((s) => s.trim())) {
    const el = document.querySelector<T>(s);
    if (el) return el;
  }
  return null;
}

function waitForSelector<T extends Element>(
  selector: string,
  timeoutMs: number,
  clipId: string,
  selectorName: string,
  selectorValue: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const check = (): T | null => findElement<T>(selector);
    const found = check();
    if (found) { resolve(found); return; }

    const deadline = Date.now() + timeoutMs;
    const observer = new MutationObserver(() => {
      const el = check();
      if (el) {
        observer.disconnect();
        clearInterval(interval);
        resolve(el);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const interval = setInterval(() => {
      const el = check();
      if (el) {
        observer.disconnect();
        clearInterval(interval);
        resolve(el);
        return;
      }
      if (Date.now() > deadline) {
        observer.disconnect();
        clearInterval(interval);
        chrome.runtime.sendMessage({
          type: "SELECTOR_ERROR",
          clipId,
          selectorName,
          selectorValue,
        });
        reject(new Error(`Selector "${selectorName}" timed out`));
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

    function onClicked(): void {
      clearTimeout(timer);
      resolve();
    }
    el.addEventListener("click", onClicked, { once: true });
  });
}

function highlightElement(el: HTMLElement): void {
  el.style.outline = "3px solid #34D399";
  el.style.boxShadow = "0 0 12px rgba(52, 211, 153, 0.6)";
}

function removeHighlight(el: HTMLElement): void {
  el.style.outline = "";
  el.style.boxShadow = "";
}

function reportSelectorError(clipId: string, name: string, value: string): void {
  chrome.runtime.sendMessage({ type: "SELECTOR_ERROR", clipId, selectorName: name, selectorValue: value });
}

// ── Network helpers ───────────────────────────────────────────────────────────

async function fetchBlob(url: string): Promise<Blob> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch blob from ${url}: ${res.status}`);
  return res.blob();
}

async function uploadWithRetry(signedUrl: string, blob: Blob, maxRetries = 3): Promise<void> {
  let lastErr: Error | null = null;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(signedUrl, {
        method: "PUT",
        body: blob,
        headers: { "Content-Type": "video/mp4" },
      });
      if (!res.ok) throw new Error(`GCS upload returned ${res.status}`);
      return;
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      if (i < maxRetries - 1) await sleep(1000 * 2 ** i);
    }
  }
  throw lastErr!;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
