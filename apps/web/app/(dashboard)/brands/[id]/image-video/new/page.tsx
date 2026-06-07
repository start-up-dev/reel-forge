"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Loader2, Film, ArrowLeft, ImagePlus, Mic, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@repo/ui/button";
import { useApiClient, withToast } from "@/lib/api-client";

type Phase = "upload" | "scripting" | "review";

const ACCEPTED: Record<string, "image/png" | "image/jpeg" | "image/webp"> = {
  "image/png": "image/png",
  "image/jpeg": "image/jpeg",
  "image/webp": "image/webp",
};

export default function NewImageVideoPage() {
  const { id: brandId } = useParams<{ id: string }>();
  const router = useRouter();
  const api = useApiClient();

  const [brandName, setBrandName] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(30);
  const [phase, setPhase] = useState<Phase>("upload");
  const [busy, setBusy] = useState(false);

  const [videoId, setVideoId] = useState<string | null>(null);
  const [script, setScript] = useState("");
  const [scriptDirty, setScriptDirty] = useState(false);
  const [isPodcast, setIsPodcast] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void api.brands.get(brandId).then((res) => {
      if (res?.data) setBrandName(res.data.name);
    });
  }, [api, brandId]);

  // Poll the video until its script is ready (or it fails).
  useEffect(() => {
    if (phase !== "scripting" || !videoId) return;
    let cancelled = false;
    const timer = setInterval(async () => {
      const res = await api.videos.get(videoId);
      if (cancelled || !res?.data) return;
      if (res.data.status === "SCRIPT_READY") {
        setScript(res.data.script ?? "");
        setIsPodcast(Boolean(res.data.isPodcast));
        setPhase("review");
      } else if (res.data.status === "FAILED") {
        clearInterval(timer);
        setPhase("upload");
        toast.error(res.data.error ?? "Script generation failed");
      }
    }, 2000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [phase, videoId, api]);

  function onPickFile(f: File | null) {
    if (!f) return;
    if (!ACCEPTED[f.type]) {
      toast.error("Use a PNG, JPEG, or WebP image.");
      return;
    }
    setFile(f);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(f));
  }

  async function handleStart() {
    if (!file) return;
    const contentType = ACCEPTED[file.type];
    if (!contentType) return;
    setBusy(true);

    // 1 — get a signed upload URL and PUT the image to R2
    const signed = await withToast(
      () => api.videos.sourceImageUploadUrl({ contentType }),
      "Failed to prepare upload"
    );
    if (!signed?.data) { setBusy(false); return; }

    try {
      const put = await fetch(signed.data.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: file,
      });
      if (!put.ok) throw new Error(`Upload failed (${put.status})`);
    } catch {
      setBusy(false);
      toast.error("Image upload failed");
      return;
    }

    // 2 — create the video; the API generates the script from the image
    const created = await withToast(
      () => api.videos.createFromImage({
        brandProfileId: brandId,
        sourceImageGcsPath: signed.data!.gcsPath,
        targetDurationSeconds: duration,
      }),
      "Failed to start"
    );
    setBusy(false);
    if (created?.data) {
      setVideoId(created.data.videoId);
      setPhase("scripting");
    }
  }

  async function handleApprove() {
    if (!videoId) return;
    setBusy(true);
    if (scriptDirty) {
      await withToast(() => api.videos.patch(videoId, { script }), "Failed to save script");
    }
    const res = await withToast(() => api.videos.generate(videoId), "Failed to start generation");
    setBusy(false);
    if (res?.data) {
      router.push(`/brands/${brandId}/video/${videoId}`);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link
        href={`/brands/${brandId}`}
        className="mb-8 inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {brandName ?? "Brand"}
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Animate an Image</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Upload a photo of one or two people. Claude writes the script, you review it, then we animate
          your image scene by scene.
        </p>
      </div>

      {phase !== "review" && (
        <div className="space-y-6">
          {/* Image upload */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Your image
            </label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={phase === "scripting"}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--bg-border)] bg-[var(--bg-elevated)] px-4 py-8 text-center transition-colors hover:border-[var(--accent-primary)]/40 disabled:opacity-60"
            >
              {previewUrl ? (
                <Image
                  src={previewUrl}
                  alt="Selected"
                  width={160}
                  height={284}
                  unoptimized
                  className="max-h-72 w-auto rounded-lg object-contain"
                />
              ) : (
                <>
                  <ImagePlus className="h-6 w-6 text-[var(--text-muted)]" />
                  <span className="text-sm font-medium text-[var(--text-secondary)]">Click to upload</span>
                  <span className="text-xs text-[var(--text-muted)]">PNG, JPEG, or WebP</span>
                </>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {/* Duration */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Duration
            </label>
            <div className="flex gap-2">
              {[15, 30, 45, 60].map((d) => (
                <button
                  key={d}
                  type="button"
                  disabled={phase === "scripting"}
                  onClick={() => setDuration(d)}
                  className={`flex-1 rounded-xl border py-2.5 text-sm font-medium transition-colors disabled:opacity-60 ${
                    duration === d
                      ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                      : "border-[var(--bg-border)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)]/40"
                  }`}
                >
                  {d}s
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={() => void handleStart()}
            disabled={busy || phase === "scripting" || !file}
            className="w-full gap-2"
          >
            {busy || phase === "scripting" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {phase === "scripting" ? "Writing the script…" : "Uploading…"}
              </>
            ) : (
              <>
                <Film className="h-4 w-4" />
                Write the Script →
              </>
            )}
          </Button>
        </div>
      )}

      {phase === "review" && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 rounded-xl border border-[var(--accent-success)]/30 bg-[var(--accent-success)]/10 px-3 py-2.5">
            <CheckCircle2 className="h-4 w-4 text-[var(--accent-success)]" />
            <span className="text-sm text-[var(--text-secondary)]">
              Script ready — review and edit it, then generate.
            </span>
          </div>

          {isPodcast && (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-secondary)]/15 px-2.5 py-1 text-xs font-medium text-[var(--accent-secondary)]">
              <Mic className="h-3 w-3" />
              Two-person podcast detected — hosts will alternate lines
            </div>
          )}

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Script {isPodcast && "(one line per host turn, alternating)"}
            </label>
            <textarea
              value={script}
              onChange={(e) => { setScript(e.target.value); setScriptDirty(true); }}
              rows={10}
              className="w-full resize-none rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-3 py-2.5 text-sm leading-relaxed text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
            />
          </div>

          <Button
            onClick={() => void handleApprove()}
            disabled={busy || script.trim().length === 0}
            className="w-full gap-2"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Starting generation…
              </>
            ) : (
              <>
                <Film className="h-4 w-4" />
                Approve &amp; Generate →
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
