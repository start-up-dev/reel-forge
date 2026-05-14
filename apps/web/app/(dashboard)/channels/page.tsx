"use client";

import { useState, useEffect } from "react";
import { Globe, Loader2, Trash2, Radio } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@repo/ui/button";
import { ConfirmDialog } from "@repo/ui/confirm-dialog";
import type { FacebookPage, SocialAccount } from "@repo/types";
import { useApiClient, withToast } from "@/lib/api-client";

function PagePickerModal({
  pages,
  onSelect,
  onClose,
}: {
  pages: FacebookPage[];
  onSelect: (page: FacebookPage) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] p-6">
        <h2 className="mb-1 text-lg font-semibold text-[var(--text-primary)]">
          Select a Facebook page
        </h2>
        <p className="mb-5 text-sm text-[var(--text-muted)]">
          Choose the page you want to connect for content publishing.
        </p>
        <ul className="space-y-2">
          {pages.map((page) => (
            <li key={page.id}>
              <button
                type="button"
                onClick={() => onSelect(page)}
                className="flex w-full items-center gap-3 rounded-xl border border-[var(--bg-border)] bg-[var(--bg-surface)] px-4 py-3 text-left transition-colors hover:border-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/8"
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
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full text-center text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function ChannelsPage() {
  const api = useApiClient();
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [pages, setPages] = useState<FacebookPage[] | null>(null);
  const [pendingAccessToken, setPendingAccessToken] = useState<string | null>(null);
  const [disconnectId, setDisconnectId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const result = await withToast(() => api.social.list(), "Failed to load channels");
      if (result?.data) setAccounts(result.data);
      setLoading(false);
    })();
  }, [api]);

  async function handleConnect() {
    setConnecting(true);
    const result = await withToast(() => api.social.authorize(), "Failed to start Facebook OAuth");
    if (result?.data?.authUrl) {
      window.location.href = result.data.authUrl;
    }
    setConnecting(false);
  }

  async function handlePageSelect(page: FacebookPage) {
    if (!pendingAccessToken) return;
    const result = await withToast(
      () =>
        api.social.connect({
          pageId: page.id,
          pageName: page.name,
          pageAvatarUrl: page.pictureUrl ?? undefined,
          accessToken: pendingAccessToken,
        }),
      "Failed to connect page"
    );
    if (result?.data) {
      setAccounts((prev) => {
        const existing = prev.findIndex((a) => a.id === result.data.id);
        if (existing >= 0) {
          const next = [...prev];
          next[existing] = result.data;
          return next;
        }
        return [...prev, result.data];
      });
      toast.success(`Connected ${page.name}`);
    }
    setPages(null);
    setPendingAccessToken(null);
  }

  async function handleDisconnect() {
    if (!disconnectId) return;
    const result = await withToast(
      () => api.social.disconnect(disconnectId),
      "Failed to disconnect channel"
    );
    if (result?.data?.ok) {
      setAccounts((prev) => prev.filter((a) => a.id !== disconnectId));
      toast.success("Channel disconnected");
    }
    setDisconnectId(null);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Channels</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Connect your social pages to enable automatic content publishing.
          </p>
        </div>
        <Button onClick={handleConnect} loading={connecting} className="gap-2">
          <Globe className="h-4 w-4" />
          Connect Facebook
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-[var(--bg-border)] py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--bg-elevated)]">
            <Radio className="h-6 w-6 text-[var(--text-muted)]" />
          </div>
          <p className="text-sm text-[var(--text-muted)]">
            No channels connected yet — connect a Facebook page to start generating content.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {accounts.map((account) => (
            <li
              key={account.id}
              className="flex items-center gap-4 rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-4 py-3"
            >
              {account.pageAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={account.pageAvatarUrl}
                  alt={account.pageName}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-border)]">
                  <Globe className="h-5 w-5 text-[var(--text-muted)]" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                  {account.pageName}
                </p>
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-secondary)]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--accent-secondary)]">
                  {account.platform}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDisconnectId(account.id)}
                className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-border)] hover:text-[var(--accent-danger)]"
                aria-label="Disconnect"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {pages && (
        <PagePickerModal
          pages={pages}
          onSelect={handlePageSelect}
          onClose={() => {
            setPages(null);
            setPendingAccessToken(null);
          }}
        />
      )}

      <ConfirmDialog
        open={!!disconnectId}
        onOpenChange={(open) => { if (!open) setDisconnectId(null); }}
        title="Disconnect channel?"
        description="This will remove the connected Facebook page. You can reconnect at any time."
        confirmLabel="Disconnect"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleDisconnect}
      />
    </div>
  );
}
