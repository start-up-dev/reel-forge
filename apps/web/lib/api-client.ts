import { useAuth } from "@clerk/nextjs";
import { useMemo } from "react";
import { toast } from "sonner";
import type {
  ApiResponse,
  PaginatedResponse,
  Project,
  RenderStyle,
  Scene,
  SubtitleStyle,
  User,
  Video,
} from "@repo/types";

export interface VoiceInfo {
  id: string;
  name: string;
  language: string;
  gender: string | null;
  previewUrl: string | null;
}

export type VideoDetail = Video & {
  scenes: Scene[];
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string }
): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    ...(fetchOptions.body ? { "Content-Type": "application/json" } : {}),
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...fetchOptions,
    headers,
  });

  if (res.status === 401) {
    // Throw — Clerk middleware handles the actual redirect at the route level.
    // Never do window.location.href here: the session may simply not be loaded
    // yet, which would cause an infinite redirect loop with the sign-in page.
    throw new ApiError(401, "Unauthorized");
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      message = body.message ?? body.error?.message ?? body.error ?? message;
      // Quota errors send a redirect hint — send the user to billing instead of toasting.
      if (res.status === 402 && body.error?.redirect) {
        window.location.href = "/billing";
        throw new ApiError(402, message);
      }
    } catch (e) {
      if (e instanceof ApiError) throw e;
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return null as T;
  return res.json() as Promise<T>;
}

/* ── Factory: creates a typed client bound to a Clerk token getter ──────── */

export function createApiClient(getToken: () => Promise<string | null>) {
  async function authedRequest<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await getToken();
    return request<T>(path, { ...options, token: token ?? undefined });
  }

  async function authedBlobUrl(path: string): Promise<string> {
    const token = await getToken();
    const res = await fetch(`${API_BASE}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new ApiError(res.status, `Failed to fetch audio (${res.status})`);
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  }

  return {
    // ── Projects ──────────────────────────────────────────────────────────
    projects: {
      list(): Promise<ApiResponse<Project[]>> {
        return authedRequest("/api/projects");
      },
      get(id: string): Promise<ApiResponse<Project>> {
        return authedRequest(`/api/projects/${id}`);
      },
      create(
        data: Pick<Project, "name" | "platforms" | "niche" | "tone"> & Partial<Pick<Project, "voiceId" | "language" | "targetAudience" | "videoStyle">>
      ): Promise<ApiResponse<Project>> {
        return authedRequest("/api/projects", {
          method: "POST",
          body: JSON.stringify(data),
        });
      },
      update(
        id: string,
        data: Partial<Pick<Project, "name" | "platforms" | "niche" | "voiceId" | "tone" | "language" | "targetAudience" | "videoStyle">>
      ): Promise<ApiResponse<Project>> {
        return authedRequest(`/api/projects/${id}`, {
          method: "PUT",
          body: JSON.stringify(data),
        });
      },
      delete(id: string): Promise<ApiResponse<null>> {
        return authedRequest(`/api/projects/${id}`, { method: "DELETE" });
      },
    },

    // ── Videos ────────────────────────────────────────────────────────────
    videos: {
      list(
        projectId: string,
        params?: { page?: number; limit?: number }
      ): Promise<PaginatedResponse<Video>> {
        const qs = new URLSearchParams();
        if (params?.page) qs.set("page", String(params.page));
        if (params?.limit) qs.set("limit", String(params.limit));
        const query = qs.toString() ? `?${qs}` : "";
        return authedRequest(`/api/projects/${projectId}/videos${query}`);
      },
      get(id: string): Promise<ApiResponse<VideoDetail>> {
        return authedRequest(`/api/videos/${id}`);
      },
      create(
        projectId: string,
        data?: { title?: string; targetDurationSeconds?: number }
      ): Promise<ApiResponse<Video>> {
        return authedRequest(`/api/projects/${projectId}/videos`, {
          method: "POST",
          body: JSON.stringify(data ?? {}),
        });
      },
      patch(
        id: string,
        data: Partial<
          Pick<
            Video,
            | "title"
            | "idea"
            | "script"
            | "subtitleStyle"
            | "bgmEnabled"
            | "bgmAssetId"
            | "bgmVolume"
            | "voiceId"
            | "targetDurationSeconds"
            | "renderStyle"
          >
        > & { renderStyle?: RenderStyle | null }
      ): Promise<ApiResponse<Video>> {
        return authedRequest(`/api/videos/${id}`, {
          method: "PATCH",
          body: JSON.stringify(data),
        });
      },
      delete(id: string): Promise<ApiResponse<null>> {
        return authedRequest(`/api/videos/${id}`, { method: "DELETE" });
      },
      submit(id: string): Promise<ApiResponse<Video>> {
        return authedRequest(`/api/videos/${id}/submit`, { method: "POST" });
      },
      brainstorm(
        id: string,
        data: { topic: string }
      ): Promise<ApiResponse<{ ideas: Array<{ title: string; body: string }> }>> {
        return authedRequest(`/api/videos/${id}/brainstorm`, {
          method: "POST",
          body: JSON.stringify(data),
        });
      },
      generateScript(
        id: string,
        data: { idea: string }
      ): Promise<ApiResponse<Video>> {
        return authedRequest(`/api/videos/${id}/script`, {
          method: "POST",
          body: JSON.stringify(data),
        });
      },
      generateVoice(id: string): Promise<ApiResponse<Video>> {
        return authedRequest(`/api/videos/${id}/voice`, { method: "POST" });
      },
      generateScenes(id: string): Promise<ApiResponse<VideoDetail>> {
        return authedRequest(`/api/videos/${id}/scenes`, { method: "POST" });
      },
    },

    // ── Scenes ────────────────────────────────────────────────────────────
    scenes: {
      regenerate(
        videoId: string,
        sceneIndex: number
      ): Promise<ApiResponse<Scene>> {
        return authedRequest(
          `/api/videos/${videoId}/scenes/${sceneIndex}/regenerate`,
          { method: "POST" }
        );
      },
      uploadUrl(
        videoId: string,
        sceneIndex: number
      ): Promise<ApiResponse<{ uploadUrl: string; path: string }>> {
        return authedRequest(
          `/api/videos/${videoId}/scenes/${sceneIndex}/upload-url`,
          { method: "POST" }
        );
      },
      update(
        videoId: string,
        sceneIndex: number,
        data: Partial<
          Pick<
            Scene,
            | "baseImageUrl"
            | "baseImagePath"
            | "visualPrompt"
            | "motionPrompt"
            | "approved"
          >
        >
      ): Promise<ApiResponse<Scene>> {
        return authedRequest(`/api/videos/${videoId}/scenes/${sceneIndex}`, {
          method: "PATCH",
          body: JSON.stringify(data),
        });
      },
      updateSubtitleStyle(
        videoId: string,
        style: SubtitleStyle
      ): Promise<ApiResponse<Video>> {
        return authedRequest(`/api/videos/${videoId}`, {
          method: "PATCH",
          body: JSON.stringify({ subtitleStyle: style }),
        });
      },
    },

    // ── Users ─────────────────────────────────────────────────────────────
    users: {
      me(): Promise<ApiResponse<User>> {
        return authedRequest("/api/users/me");
      },
      update(
        data: Partial<
          Pick<
            User,
            "firstName" | "lastName" | "onboardingComplete"
          > & { emailNotifyReady?: boolean; emailNotifyFailed?: boolean }
        >
      ): Promise<ApiResponse<User>> {
        return authedRequest("/api/users/me", {
          method: "PATCH",
          body: JSON.stringify(data),
        });
      },
    },

    // ── Assets ────────────────────────────────────────────────────────────
    assets: {
      bgm(): Promise<ApiResponse<unknown[]>> {
        return authedRequest("/api/assets/bgm");
      },
      voices(language?: string): Promise<ApiResponse<VoiceInfo[]>> {
        const qs = language ? `?language=${encodeURIComponent(language)}` : "";
        return authedRequest(`/api/assets/voices${qs}`);
      },
      voicePreviewBlobUrl(voiceId: string, language?: string): Promise<string> {
        const qs = language ? `?language=${encodeURIComponent(language)}` : "";
        return authedBlobUrl(`/api/assets/voices/${voiceId}/preview${qs}`);
      },
    },

    // ── Billing ───────────────────────────────────────────────────────────
    billing: {
      trialCheckout(): Promise<ApiResponse<{ url: string }>> {
        return authedRequest("/api/billing/trial-checkout", { method: "POST" });
      },
      subscribe(plan: "starter" | "pro"): Promise<ApiResponse<{ url: string }>> {
        return authedRequest("/api/billing/subscribe", {
          method: "POST",
          body: JSON.stringify({ plan }),
        });
      },
      portal(): Promise<ApiResponse<{ url: string }>> {
        return authedRequest("/api/billing/portal");
      },
      devSimulate(plan: string): Promise<ApiResponse<{ ok: boolean }>> {
        return authedRequest("/api/billing/dev-simulate", {
          method: "POST",
          body: JSON.stringify({ plan }),
        });
      },
    },

    // ── Library (all videos across projects) ──────────────────────────────
    library: {
      list(params?: {
        page?: number;
        limit?: number;
        projectId?: string;
        status?: string;
        search?: string;
      }): Promise<PaginatedResponse<Video>> {
        const qs = new URLSearchParams();
        if (params?.page) qs.set("page", String(params.page));
        if (params?.limit) qs.set("limit", String(params.limit));
        if (params?.projectId) qs.set("projectId", params.projectId);
        if (params?.status) qs.set("status", params.status);
        if (params?.search) qs.set("search", params.search);
        const query = qs.toString() ? `?${qs}` : "";
        return authedRequest(`/api/videos${query}`);
      },
    },
  };
}

/* ── Hook: useApiClient ─────────────────────────────────────────────────── */

export function useApiClient() {
  const { getToken } = useAuth();
  // Memoize so the returned object is stable across re-renders.
  // Without this, every render produces a new `api` reference, which causes
  // useCallback/useEffect dependencies to fire in an infinite loop.
  return useMemo(() => createApiClient(() => getToken()), [getToken]);
}

/* ── Utility: wrap an API call with toast error handling ────────────────── */

export async function withToast<T>(
  fn: () => Promise<T>,
  errorMessage = "Something went wrong"
): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    const message =
      err instanceof ApiError ? err.message : errorMessage;
    toast.error(message);
    return null;
  }
}
