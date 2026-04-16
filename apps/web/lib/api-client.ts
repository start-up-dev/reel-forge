import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import type {
  ApiResponse,
  PaginatedResponse,
  Project,
  Video,
} from "@repo/types";

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
    "Content-Type": "application/json",
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
    // Redirect to sign-in — handled by Clerk middleware, but just in case
    window.location.href = "/sign-in";
    throw new ApiError(401, "Unauthorized");
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      message = body.message ?? body.error ?? message;
    } catch {
      // ignore parse errors
    }
    throw new ApiError(res.status, message);
  }

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
        data: Pick<Project, "name" | "platform" | "niche" | "voiceId" | "tone">
      ): Promise<ApiResponse<Project>> {
        return authedRequest("/api/projects", {
          method: "POST",
          body: JSON.stringify(data),
        });
      },
      update(
        id: string,
        data: Partial<Pick<Project, "name" | "platform" | "niche" | "voiceId" | "tone">>
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
      get(id: string): Promise<ApiResponse<Video>> {
        return authedRequest(`/api/videos/${id}`);
      },
      create(projectId: string): Promise<ApiResponse<Video>> {
        return authedRequest(`/api/projects/${projectId}/videos`, {
          method: "POST",
        });
      },
      delete(id: string): Promise<ApiResponse<null>> {
        return authedRequest(`/api/videos/${id}`, { method: "DELETE" });
      },
    },

    // ── Assets ────────────────────────────────────────────────────────────
    assets: {
      bgm(): Promise<ApiResponse<unknown[]>> {
        return authedRequest("/api/assets/bgm");
      },
      voices(): Promise<ApiResponse<unknown[]>> {
        return authedRequest("/api/assets/voices");
      },
    },
  };
}

/* ── Hook: useApiClient ─────────────────────────────────────────────────── */

export function useApiClient() {
  const { getToken } = useAuth();
  return createApiClient(() => getToken());
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
