"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface VideoProgressEntry {
  title: string;
  status: string;
  message: string;
}

export interface PlanProgressState {
  videoStatuses: Map<string, VideoProgressEntry>;
  completedCount: number;
  failedCount: number;
  totalCount: number;
  isBatchComplete: boolean;
  planStatus: string | null;
}

export function usePlanProgress(planId: string, totalVideos: number): PlanProgressState {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [state, setState] = useState<PlanProgressState>({
    videoStatuses: new Map(),
    completedCount: 0,
    failedCount: 0,
    totalCount: totalVideos,
    isBatchComplete: false,
    planStatus: null,
  });

  useEffect(() => {
    setState((prev) => ({ ...prev, totalCount: totalVideos }));
  }, [totalVideos]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function connect() {
      const token = await getTokenRef.current({ skipCache: true });
      if (!active) return;

      try {
        const res = await fetch(`${API_BASE}/api/content-plans/${planId}/progress`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          signal: controller.signal,
        });

        if (!res.ok || !res.body) return;

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
              const event = JSON.parse(line.slice(5).trim()) as Record<string, unknown>;
              handleEvent(event);
            } catch { /* ignore */ }
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
      }
    }

    function handleEvent(event: Record<string, unknown>) {
      if (!active) return;

      if (event.type === "SNAPSHOT") {
        setState((prev) => ({ ...prev, planStatus: event.planStatus as string }));
        return;
      }

      if (event.type === "VIDEO_UPDATE" || event.type === "ERROR") {
        const videoId = event.videoId as string;
        const title = (event.title as string) ?? "";
        const status = (event.status as string) ?? "";
        const message = (event.message as string) ?? "";

        setState((prev) => {
          const next = new Map(prev.videoStatuses);
          next.set(videoId, { title, status, message });
          const completedCount = [...next.values()].filter((v) => v.status === "COMPLETE").length;
          const failedCount = [...next.values()].filter((v) => v.status === "FAILED").length;
          return { ...prev, videoStatuses: next, completedCount, failedCount };
        });
        return;
      }

      if (event.type === "BATCH_COMPLETE") {
        setState((prev) => ({
          ...prev,
          isBatchComplete: true,
          totalCount: (event.totalVideos as number) ?? prev.totalCount,
          completedCount: (event.successCount as number) ?? prev.completedCount,
          failedCount: (event.failCount as number) ?? prev.failedCount,
        }));
      }
    }

    void connect();

    return () => {
      active = false;
      controller.abort();
    };
  }, [planId, totalVideos]);

  return state;
}
