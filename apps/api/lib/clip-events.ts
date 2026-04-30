import type { ClipProgressEvent } from "@repo/types";

export type ClipEventSubscriber = (event: ClipProgressEvent) => void;

export const clipEventBus: Map<string, Set<ClipEventSubscriber>> = new Map();

export function subscribeToVideo(
  videoId: string,
  cb: ClipEventSubscriber,
): () => void {
  let subs = clipEventBus.get(videoId);
  if (!subs) {
    subs = new Set();
    clipEventBus.set(videoId, subs);
  }
  subs.add(cb);
  return () => {
    subs!.delete(cb);
    if (subs!.size === 0) clipEventBus.delete(videoId);
  };
}

export function emitClipEvent(event: ClipProgressEvent): void {
  if (event.type === "HEARTBEAT" || event.type === "SNAPSHOT") return;
  const subs = clipEventBus.get(event.videoId);
  if (!subs) return;
  for (const cb of subs) cb(event);
}
