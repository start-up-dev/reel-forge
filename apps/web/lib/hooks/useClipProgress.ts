"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import type { ClipProgressEvent, ClipStatusMap } from "@repo/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const MAX_BACKOFF_MS = 30_000;
const WATCHDOG_MS = 45_000;

export type ConnectionStatus = "connected" | "reconnecting" | "lost";

export function useClipProgress(
  videoId: string | null,
): { clips: ClipStatusMap; connected: boolean; connectionStatus: ConnectionStatus; queuePosition: number; retryConnection: () => void } {
  const { getToken } = useAuth();
  const [clips, setClips] = useState<ClipStatusMap>({});
  const [connected, setConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("reconnecting");
  const [queuePosition, setQueuePosition] = useState(0);
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const retryRef = useRef<(() => void) | null>(null);

  function retryConnection() {
    retryRef.current?.();
  }

  useEffect(() => {
    if (!videoId) {
      setClips({});
      setConnected(false);
      setConnectionStatus("reconnecting");
      setQueuePosition(0);
      return;
    }

    let active = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let watchdogId: ReturnType<typeof setTimeout> | null = null;
    let backoffMs = 1000;
    let retryCount = 0;
    const MAX_RETRIES = 10;
    const controller = new AbortController();

    function resetWatchdog() {
      if (watchdogId) clearTimeout(watchdogId);
      watchdogId = setTimeout(() => {
        if (!active) return;
        console.warn("[useClipProgress] watchdog fired — reconnecting");
        scheduleReconnect();
      }, WATCHDOG_MS);
    }

    function scheduleReconnect() {
      if (!active) return;
      setConnected(false);
      if (retryCount >= MAX_RETRIES) {
        setConnectionStatus("lost");
        return;
      }
      setConnectionStatus("reconnecting");
      timeoutId = setTimeout(() => void connect(), backoffMs);
      backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS);
      retryCount++;
    }

    retryRef.current = () => {
      if (!active) return;
      retryCount = 0;
      backoffMs = 1000;
      if (timeoutId) clearTimeout(timeoutId);
      setConnectionStatus("reconnecting");
      void connect();
    };

    function applyEvent(event: ClipProgressEvent) {
      resetWatchdog();
      switch (event.type) {
        case "SNAPSHOT":
          setClips(
            Object.fromEntries(event.clips.map((c) => [c.sceneIndex, c])),
          );
          setQueuePosition(event.queuePosition ?? 0);
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
        case "QUEUE_POSITION":
          setQueuePosition(event.queuePosition);
          break;
        case "HEARTBEAT":
          break;
      }
    }

    async function connect() {
      if (!active) return;

      // Always fetch a fresh token on every connect attempt (14.2)
      const token = await getTokenRef.current({ skipCache: true });

      try {
        const res = await fetch(`${API_BASE}/api/videos/${videoId}/progress`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          signal: controller.signal,
        });

        if (!res.ok || !res.body) throw new Error(`SSE connect failed: ${res.status}`);

        setConnected(true);
        setConnectionStatus("connected");
        retryCount = 0;
        backoffMs = 1000;
        resetWatchdog();

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

      if (watchdogId) clearTimeout(watchdogId);
      if (active) scheduleReconnect();
    }

    void connect();

    return () => {
      active = false;
      controller.abort();
      if (timeoutId) clearTimeout(timeoutId);
      if (watchdogId) clearTimeout(watchdogId);
      retryRef.current = null;
    };
  }, [videoId]);

  return { clips, connected, connectionStatus, queuePosition, retryConnection };
}
