import { useAuth } from "@clerk/nextjs";
import { useMemo } from "react";
import { toast } from "sonner";
import type {
  ActionReelStyle,
  ApiResponse,
  BrandProfile,
  BrandSuggestion,
  CharacterType,
  ContentFormat,
  ContentPlan,
  ContentTone,
  FacebookPage,
  PaginatedResponse,
  PostSchedule,
  PostType,
  RenderStyle,
  Scene,
  SocialAccount,
  SubtitleStyle,
  TargetAudienceAge,
  TargetAudienceVibe,
  TopicEntry,
  User,
  Video,
  VideoType,
  VisualStyle,
} from "@repo/types";

export type VideoLibraryItem = Video & { postSchedule: PostSchedule | null };

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

export class QuotaError extends ApiError {
  constructor(
    message: string,
    public redirectTo: "trial_checkout" | "billing"
  ) {
    super(402, message);
    this.name = "QuotaError";
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
      if (res.status === 402 && body.error?.redirect) {
        throw new QuotaError(message, body.error.redirect);
      }
    } catch (e) {
      if (e instanceof ApiError) throw e;
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return { data: null } as unknown as T;
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
    // ── Videos ────────────────────────────────────────────────────────────
    videos: {
      get(id: string): Promise<ApiResponse<VideoDetail>> {
        return authedRequest(`/api/videos/${id}`);
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
            | "targetDurationSeconds"
            | "renderStyle"
            | "videoType"
            | "ugcVisualStyle"
            | "actionReelStyle"
            | "voiceSpeed"
          >
        > & { renderStyle?: RenderStyle | null; videoType?: VideoType; actionReelStyle?: ActionReelStyle | null }
      ): Promise<ApiResponse<Video>> {
        return authedRequest(`/api/videos/${id}`, {
          method: "PATCH",
          body: JSON.stringify(data),
        });
      },
      delete(id: string): Promise<ApiResponse<null>> {
        return authedRequest(`/api/videos/${id}`, { method: "DELETE" });
      },
      post(
        id: string,
        data: { socialAccountId: string; postType: PostType; scheduledAt?: string }
      ): Promise<ApiResponse<{ postSchedule: PostSchedule }>> {
        return authedRequest(`/api/videos/${id}/post`, {
          method: "POST",
          body: JSON.stringify(data),
        });
      },
      postStatus(id: string): Promise<ApiResponse<PostSchedule[]>> {
        return authedRequest(`/api/videos/${id}/post-status`);
      },
    },

    // ── Scenes ────────────────────────────────────────────────────────────
    scenes: {
      update(
        videoId: string,
        sceneIndex: number,
        data: Partial<Pick<Scene, "visualPrompt" | "motionPrompt" | "approved">>
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
    },

    // ── Billing ───────────────────────────────────────────────────────────
    billing: {
      trialCheckout(videoId?: string): Promise<ApiResponse<{ url: string }>> {
        return authedRequest("/api/billing/trial-checkout", {
          method: "POST",
          body: JSON.stringify(videoId ? { videoId } : {}),
        });
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

    // ── Library ───────────────────────────────────────────────────────────
    library: {
      list(params?: {
        page?: number;
        limit?: number;
        status?: string;
        search?: string;
      }): Promise<PaginatedResponse<VideoLibraryItem>> {
        const qs = new URLSearchParams();
        if (params?.page) qs.set("page", String(params.page));
        if (params?.limit) qs.set("limit", String(params.limit));
        if (params?.status) qs.set("status", params.status);
        if (params?.search) qs.set("search", params.search);
        const query = qs.toString() ? `?${qs}` : "";
        return authedRequest(`/api/videos${query}`);
      },
    },

    // ── Brand profiles ────────────────────────────────────────────────────
    brands: {
      list(): Promise<ApiResponse<BrandProfile[]>> {
        return authedRequest("/api/brand-profiles");
      },
      get(id: string): Promise<ApiResponse<BrandProfile & { characterSheetUrl: string | null }>> {
        return authedRequest(`/api/brand-profiles/${id}`);
      },
      create(data: {
        name: string;
        niche: string;
        tone: ContentTone;
        visualStyle: VisualStyle;
        characterType: CharacterType;
        nicheDescription?: string;
        targetAudienceAge?: TargetAudienceAge;
        targetAudienceVibe?: TargetAudienceVibe;
        characterDescription?: string;
        primaryColor?: string;
        secondaryColor?: string;
        referenceVideoUrl?: string;
      }): Promise<ApiResponse<BrandProfile>> {
        return authedRequest("/api/brand-profiles", {
          method: "POST",
          body: JSON.stringify(data),
        });
      },
      suggest(
        id: string,
        feedback?: string
      ): Promise<ApiResponse<BrandSuggestion>> {
        return authedRequest(`/api/brand-profiles/${id}/suggest`, {
          method: "POST",
          body: JSON.stringify({ feedback }),
        });
      },
      update(
        id: string,
        data: Partial<{
          name: string;
          niche: string;
          tone: ContentTone;
          visualStyle: VisualStyle;
          characterType: CharacterType;
          nicheDescription: string;
          targetAudienceAge: TargetAudienceAge;
          targetAudienceVibe: TargetAudienceVibe;
          characterDescription: string;
          primaryColor: string;
          secondaryColor: string;
          referenceVideoUrl: string;
          logoGcsPath: string;
        }>
      ): Promise<ApiResponse<BrandProfile>> {
        return authedRequest(`/api/brand-profiles/${id}`, {
          method: "PATCH",
          body: JSON.stringify(data),
        });
      },
      delete(id: string): Promise<ApiResponse<{ ok: boolean }>> {
        return authedRequest(`/api/brand-profiles/${id}`, { method: "DELETE" });
      },
      logoUploadUrl(
        id: string,
        contentType: "image/jpeg" | "image/png" | "image/webp"
      ): Promise<ApiResponse<{ uploadUrl: string; gcsPath: string }>> {
        return authedRequest(`/api/brand-profiles/${id}/logo-upload-url`, {
          method: "POST",
          body: JSON.stringify({ contentType }),
        });
      },
      completeOnboarding(id: string): Promise<ApiResponse<{ ok: boolean }>> {
        return authedRequest(`/api/brand-profiles/${id}/complete-onboarding`, {
          method: "POST",
        });
      },
      generateCharacterSheet(id: string): Promise<ApiResponse<{ characterSheetUrl: string }>> {
        return authedRequest(`/api/brand-profiles/${id}/generate-character-sheet`, {
          method: "POST",
        });
      },
      characterSheetUrl(id: string): Promise<ApiResponse<{ url: string | null; generationCount: number }>> {
        return authedRequest(`/api/brand-profiles/${id}/character-sheet-url`);
      },
    },

    // ── Content Plans ─────────────────────────────────────────────────────
    contentPlans: {
      create(data: {
        brandProfileId: string;
        postsPerDay: 1 | 2 | 3 | 5;
      }): Promise<ApiResponse<ContentPlan>> {
        return authedRequest("/api/content-plans", {
          method: "POST",
          body: JSON.stringify(data),
        });
      },
      listForBrand(brandId: string): Promise<ApiResponse<ContentPlan[]>> {
        return authedRequest(`/api/brand-profiles/${brandId}/content-plans`);
      },
      get(id: string): Promise<ApiResponse<ContentPlan & { videos: Array<{ id: string; title: string; status: string; outputUrl: string | null; contentPlanId: string | null }> }>> {
        return authedRequest(`/api/content-plans/${id}`);
      },
      overrideTopic(
        id: string,
        index: number,
        data: Partial<Pick<TopicEntry, "title" | "hook" | "angle" | "scriptOutline"> & { format: ContentFormat }>
      ): Promise<ApiResponse<ContentPlan>> {
        return authedRequest(`/api/content-plans/${id}/topics/${index}`, {
          method: "PATCH",
          body: JSON.stringify(data),
        });
      },
      regenerate(id: string): Promise<ApiResponse<ContentPlan>> {
        return authedRequest(`/api/content-plans/${id}/regenerate`, { method: "POST" });
      },
      approve(
        id: string,
        data?: { postType?: PostType }
      ): Promise<ApiResponse<{ ok: boolean; videoIds: string[] }>> {
        return authedRequest(`/api/content-plans/${id}/approve`, {
          method: "POST",
          body: JSON.stringify(data ?? {}),
        });
      },
      retryGeneration(id: string): Promise<ApiResponse<{ ok: boolean }>> {
        return authedRequest(`/api/content-plans/${id}/retry-generation`, { method: "POST" });
      },
      delete(id: string): Promise<ApiResponse<{ ok: boolean }>> {
        return authedRequest(`/api/content-plans/${id}`, { method: "DELETE" });
      },
    },

    // ── Social accounts ───────────────────────────────────────────────────
    social: {
      authorize(brandId?: string): Promise<ApiResponse<{ authUrl: string }>> {
        const qs = brandId ? `?brandId=${brandId}` : "";
        return authedRequest(`/api/auth/facebook/authorize${qs}`);
      },
      callback(code: string, state: string): Promise<ApiResponse<{ pages: FacebookPage[] }>> {
        const qs = new URLSearchParams({ code, state });
        return authedRequest(`/api/auth/facebook/callback?${qs.toString()}`);
      },
      connect(data: {
        pageId: string;
        pageName: string;
        pageAvatarUrl?: string;
        accessToken: string;
        brandProfileId?: string;
      }): Promise<ApiResponse<SocialAccount & { isNewBrand: boolean }>> {
        return authedRequest("/api/social/facebook/connect", {
          method: "POST",
          body: JSON.stringify(data),
        });
      },
      list(): Promise<ApiResponse<SocialAccount[]>> {
        return authedRequest("/api/social/accounts");
      },
      disconnect(id: string): Promise<ApiResponse<{ ok: boolean }>> {
        return authedRequest(`/api/social/accounts/${id}`, { method: "DELETE" });
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
  errorMessage = "Something went wrong",
  onQuotaError?: (err: QuotaError) => void
): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof QuotaError) {
      if (onQuotaError) {
        onQuotaError(err);
        return null;
      }
      // Fallback if no handler provided: hard redirect to billing
      window.location.href = "/billing";
      return null;
    }
    const message = err instanceof ApiError ? err.message : errorMessage;
    toast.error(message);
    return null;
  }
}
