"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import type { ClipProgressEvent, ClipStatusMap } from "@repo/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const MAX_BACKOFF_MS = 30_000;

export function useClipProgress(
  videoId: string | null,
): { clips: ClipStatusMap; connected: boolean } {
  const { getToken } = useAuth();
  const [clips, setClips] = useState<ClipStatusMap>({});
  const [connected, setConnected] = useState(false);
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  useEffect(() => {
    if (!videoId) {
      setClips({});
      setConnected(false);
      return;
    }

    let active = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let backoffMs = 1000;
    const controller = new AbortController();

    function applyEvent(event: ClipProgressEvent) {
      switch (event.type) {
        case "SNAPSHOT":
          setClips(
            Object.fromEntries(event.clips.map((c) => [c.sceneIndex, c])),
          );
          break;
        case "CLIP_PROCESSING":
          setClips((prev) => ({
            ...prev,
            [event.sceneIndex]: {
              ...(prev[event.sceneIndex] ?? {}),
              sceneIndex: event.sceneIndex,
              status: "processing",
            },
          }));
          break;
        case "CLIP_DONE":
          setClips((prev) => ({
            ...prev,
            [event.sceneIndex]: {
              sceneIndex: event.sceneIndex,
              status: "done",
              clipUrl: event.clipUrl,
            },
          }));
          break;
        case "CLIP_FAILED":
          setClips((prev) => ({
            ...prev,
            [event.sceneIndex]: {
              sceneIndex: event.sceneIndex,
              status: "failed",
              error: event.error,
            },
          }));
          break;
        case "HEARTBEAT":
          break;
      }
    }

    async function connect() {
      if (!active) return;

      try {
        const token = await getTokenRef.current();
        const res = await fetch(`${API_BASE}/api/videos/${videoId}/progress`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          signal: controller.signal,
        });

        if (!res.ok || !res.body) throw new Error(`SSE connect failed: ${res.status}`);

        setConnected(true);
        backoffMs = 1000;

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done || !active) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            const line = part.trim();
            if (!line.startsWith("data:")) continue;
            try {
              const event = JSON.parse(line.slice(5).trim()) as ClipProgressEvent;
              applyEvent(event);
            } catch { /* ignore malformed events */ }
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        console.error("[useClipProgress] stream error:", err);
      }

      if (active) {
        setConnected(false);
        timeoutId = setTimeout(() => void connect(), backoffMs);
        backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS);
      }
    }

    void connect();

    return () => {
      active = false;
      controller.abort();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [videoId]);

  return { clips, connected };
}
