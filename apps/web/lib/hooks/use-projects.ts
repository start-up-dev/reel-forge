"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import type { Project } from "@repo/types";
import { useApiClient } from "../api-client";

export function useProjects() {
  const { isLoaded, isSignedIn } = useAuth();
  const api = useApiClient();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.projects.list();
      setProjects(res.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    // Wait for Clerk to finish loading before making authenticated requests.
    // Without this guard, getToken() returns null and the API returns 401.
    if (!isLoaded || !isSignedIn) return;
    void load();
  }, [isLoaded, isSignedIn, load]);

  return { projects, loading, error, refetch: load };
}

export function useProject(id: string) {
  const { isLoaded, isSignedIn } = useAuth();
  const api = useApiClient();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.projects.get(id);
      setProject(res.data ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load project");
    } finally {
      setLoading(false);
    }
  }, [api, id]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    void load();
  }, [isLoaded, isSignedIn, load]);

  return { project, loading, error, refetch: load };
}
