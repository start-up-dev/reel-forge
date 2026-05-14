"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Globe } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@repo/ui/button";
import type { FacebookPage } from "@repo/types";
import { useApiClient, withToast } from "@/lib/api-client";

export default function ChannelsCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const api = useApiClient();

  const [pages, setPages] = useState<FacebookPage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const oauthError = searchParams.get("error");

    if (oauthError) {
      setError("Facebook OAuth was cancelled or denied.");
      return;
    }
    if (!code || !state) {
      setError("Missing OAuth parameters.");
      return;
    }

    void (async () => {
      const result = await withToast(
        () => api.social.callback(code, state),
        "Failed to complete Facebook OAuth"
      );
      if (result?.data?.pages) {
        setPages(result.data.pages);
      } else {
        setError("No Facebook pages found for your account.");
      }
    })();
  }, [api, searchParams]);

  async function handlePageSelect(page: FacebookPage) {
    setConnecting(true);
    const result = await withToast(
      () =>
        api.social.connect({
          pageId: page.id,
          pageName: page.name,
          pageAvatarUrl: page.pictureUrl ?? undefined,
          accessToken: page.accessToken,
        }),
      "Failed to connect page"
    );
    if (result?.data) {
      toast.success(`Connected ${page.name}`);
      router.push("/channels");
    }
    setConnecting(false);
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-32 text-center">
        <p className="text-sm text-[var(--accent-danger)]">{error}</p>
        <Button variant="ghost" onClick={() => router.push("/channels")}>
          ← Back to Channels
        </Button>
      </div>
    );
  }

  if (!pages) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-32">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-primary)]" />
        <p className="text-sm text-[var(--text-muted)]">Completing Facebook login…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="mb-2 text-xl font-bold text-[var(--text-primary)]">
        Select a Facebook page
      </h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">
        Choose which page to connect for content publishing.
      </p>
      <ul className="space-y-2">
        {pages.map((page) => (
          <li key={page.id}>
            <button
              type="button"
              disabled={connecting}
              onClick={() => handlePageSelect(page)}
              className="flex w-full items-center gap-3 rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-4 py-3 text-left transition-colors hover:border-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/8 disabled:opacity-50"
            >
              {page.pictureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={page.pictureUrl}
                  alt={page.name}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-border)]">
                  <Globe className="h-5 w-5 text-[var(--text-muted)]" />
                </div>
              )}
              <span className="text-sm font-medium text-[var(--text-primary)]">
                {page.name}
              </span>
              {connecting && (
                <Loader2 className="ml-auto h-4 w-4 animate-spin text-[var(--text-muted)]" />
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
