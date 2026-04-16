"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useUser } from "@/lib/hooks/use-user";
import { useApiClient, withToast } from "@/lib/api-client";

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-[var(--accent-primary)]" : "bg-[var(--bg-border)]"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export default function NotificationsPage() {
  const api = useApiClient();
  const { user, loading } = useUser();
  const [notifyReady, setNotifyReady] = useState(true);
  const [notifyFailed, setNotifyFailed] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      // These fields may not exist yet on the user object until the DB column is added;
      // default to true for both.
      setNotifyReady((user as any).emailNotifyReady ?? true);
      setNotifyFailed((user as any).emailNotifyFailed ?? true);
    }
  }, [user]);

  async function save(field: "emailNotifyReady" | "emailNotifyFailed", value: boolean) {
    setSaving(true);
    const result = await withToast(
      () => api.users.update({ [field]: value }),
      "Failed to save notification preference"
    );
    setSaving(false);
    if (result) toast.success("Preferences saved");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--bg-border)] bg-[var(--bg-surface)] divide-y divide-[var(--bg-border)]">
      {/* Header */}
      <div className="p-6">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">
          Email Notifications
        </h3>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Choose which emails you receive from ReelForge.
        </p>
        {user && (
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            Sent to: <span className="text-[var(--text-secondary)]">{(user as any).email ?? "your email"}</span>
          </p>
        )}
      </div>

      {/* Video Ready */}
      <div className="flex items-center justify-between gap-4 p-6">
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            Video ready notification
          </p>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
            Get an email when your video finishes processing.
          </p>
        </div>
        <Toggle
          checked={notifyReady}
          disabled={saving}
          onChange={(v) => {
            setNotifyReady(v);
            void save("emailNotifyReady", v);
          }}
        />
      </div>

      {/* Video Failed */}
      <div className="flex items-center justify-between gap-4 p-6">
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            Video failed notification
          </p>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
            Get an email when a video fails so you can retry.
          </p>
        </div>
        <Toggle
          checked={notifyFailed}
          disabled={saving}
          onChange={(v) => {
            setNotifyFailed(v);
            void save("emailNotifyFailed", v);
          }}
        />
      </div>
    </div>
  );
}
