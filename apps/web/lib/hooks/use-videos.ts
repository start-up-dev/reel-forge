"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import type { Video } from "@repo/types";
import { useApiClient } from "../api-client";

export function useVideo(id: string) {
  const { isLoaded, isSignedIn } = useAuth();
  const api = useApiClient();
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.videos.get(id);
      setVideo(res.data ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load video");
    } finally {
      setLoading(false);
    }
  }, [api, id]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    void load();
  }, [isLoaded, isSignedIn, load]);

  return { video, loading, error, refetch: load };
}
