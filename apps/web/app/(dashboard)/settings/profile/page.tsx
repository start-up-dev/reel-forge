"use client";

import { useState, useEffect } from "react";
import { useUser as useClerkUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useApiClient, withToast } from "@/lib/api-client";

export default function ProfileSettingsPage() {
  const { user: clerkUser, isLoaded } = useClerkUser();
  const api = useApiClient();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  useEffect(() => {
    if (clerkUser) {
      setFirstName(clerkUser.firstName ?? "");
      setLastName(clerkUser.lastName ?? "");
    }
  }, [clerkUser]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const result = await withToast(
      () => api.users.update({ firstName: firstName.trim() || null, lastName: lastName.trim() || null }),
      "Failed to save profile"
    );
    setSaving(false);
    if (result) toast.success("Profile updated");
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Profile form */}
      <section className="rounded-xl border border-[var(--bg-border)] bg-[var(--bg-surface)] p-6">
        <h3 className="mb-4 text-base font-semibold text-[var(--text-primary)]">
          Profile Information
        </h3>
        <form onSubmit={handleSave} className="space-y-4">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent-primary)] text-lg font-bold text-white">
              {(clerkUser?.firstName?.[0] ?? clerkUser?.emailAddresses?.[0]?.emailAddress?.[0] ?? "U").toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Profile Photo</p>
              <p className="text-xs text-[var(--text-muted)]">Managed via Clerk account settings</p>
            </div>
          </div>

          {/* Name fields */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)]">
                First Name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={inputCls}
                placeholder="First name"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)]">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={inputCls}
                placeholder="Last name"
              />
            </div>
          </div>

          {/* Email (read-only) */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)]">Email</label>
            <input
              type="email"
              value={clerkUser?.emailAddresses?.[0]?.emailAddress ?? ""}
              readOnly
              className={`${inputCls} cursor-not-allowed opacity-60`}
            />
            <p className="text-xs text-[var(--text-muted)]">
              Email is managed via your Clerk account and cannot be changed here.
            </p>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-[var(--accent-primary)] px-5 py-2 text-sm font-medium text-white disabled:opacity-50 transition-opacity hover:opacity-90"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </section>

      {/* Danger zone */}
      <section className="rounded-xl border border-[var(--accent-danger)]/30 bg-[var(--accent-danger)]/5 p-6">
        <h3 className="mb-1 text-base font-semibold text-[var(--accent-danger)]">Danger Zone</h3>
        <p className="mb-4 text-sm text-[var(--text-secondary)]">
          Deleting your account is irreversible. All projects, videos, and assets will be permanently removed within 24 hours.
        </p>

        {deleteConfirm !== "DELETE" ? (
          <div className="space-y-2">
            <p className="text-xs text-[var(--text-muted)]">
              Type <span className="font-mono font-bold text-[var(--text-secondary)]">DELETE</span> to confirm
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="DELETE"
                className={`${inputCls} max-w-[180px] font-mono`}
              />
            </div>
          </div>
        ) : (
          <button
            className="rounded-lg bg-[var(--accent-danger)] px-5 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
            onClick={() => toast.error("Account deletion requires contacting support in the current version.")}
          >
            Delete My Account
          </button>
        )}
      </section>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)]/30 transition-colors";
