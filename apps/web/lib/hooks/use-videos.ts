"use client";

import { useState, useEffect, useCallback } from "react";
import type { Video } from "@repo/types";
import { useApiClient } from "../api-client";

export function useVideos(projectId: string) {
  const api = useApiClient();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(
    async (pageNum = 1) => {
      if (!projectId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await api.videos.list(projectId, {
          page: pageNum,
          limit: 20,
        });
        if (pageNum === 1) {
          setVideos(res.data ?? []);
        } else {
          setVideos((prev) => [...prev, ...(res.data ?? [])]);
        }
        setHasMore(res.hasMore ?? false);
        setPage(pageNum);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load videos");
      } finally {
        setLoading(false);
      }
    },
    [api, projectId]
  );

  useEffect(() => {
    void load(1);
  }, [load]);

  return {
    videos,
    loading,
    error,
    hasMore,
    page,
    loadMore: () => load(page + 1),
    refetch: () => load(1),
  };
}

export function useVideo(id: string) {
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
    void load();
  }, [load]);

  return { video, loading, error, refetch: load };
}
