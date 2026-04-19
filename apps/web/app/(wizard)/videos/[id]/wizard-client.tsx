"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { VideoStatus } from "@repo/types";
import { useApiClient, withToast } from "@/lib/api-client";
import type { VideoDetail } from "@/lib/api-client";
import { useProject } from "@/lib/hooks/use-projects";
import { WizardHeader } from "@/components/wizard/wizard-header";
import { Step1Idea } from "@/components/wizard/steps/step-1-idea";
import { Step2Script } from "@/components/wizard/steps/step-2-script";
import { Step3Voice } from "@/components/wizard/steps/step-3-voice";
import { Step4Scenes } from "@/components/wizard/steps/step-4-scenes";
import { Step5Style } from "@/components/wizard/steps/step-5-style";
import { Step6Processing } from "@/components/wizard/steps/step-6-processing";
import { Step7Done } from "@/components/wizard/steps/step-7-done";

function statusToDefaultStep(status: VideoStatus): number {
  switch (status) {
    case VideoStatus.Draft:
    case VideoStatus.BrainstormPending:
      return 1;
    case VideoStatus.ScriptPending:
    case VideoStatus.ScriptReady:
      return 2;
    case VideoStatus.VoicePending:
    case VideoStatus.VoiceReady:
      return 3;
    case VideoStatus.ScenesPending:
    case VideoStatus.ScenesReady:
      return 4;
    case VideoStatus.ClipsQueued:
    case VideoStatus.ClipsProcessing:
    case VideoStatus.AssemblyPending:
    case VideoStatus.AssemblyProcessing:
    case VideoStatus.Failed:
      return 6;
    case VideoStatus.Complete:
      return 7;
    default:
      return 1;
  }
}

function statusToMaxAllowedStep(status: VideoStatus): number {
  switch (status) {
    case VideoStatus.Draft:
    case VideoStatus.BrainstormPending:
      return 1;
    case VideoStatus.ScriptPending:
    case VideoStatus.ScriptReady:
      return 2;
    case VideoStatus.VoicePending:
    case VideoStatus.VoiceReady:
      return 3;
    case VideoStatus.ScenesPending:
      return 4;
    case VideoStatus.ScenesReady:
      return 5; // Can view step 4 or advance to step 5 (style picker)
    case VideoStatus.ClipsQueued:
    case VideoStatus.ClipsProcessing:
    case VideoStatus.AssemblyPending:
    case VideoStatus.AssemblyProcessing:
    case VideoStatus.Failed:
      return 6;
    case VideoStatus.Complete:
      return 7;
    default:
      return 1;
  }
}

type SaveState = "idle" | "saving" | "saved";

export function WizardClient({ videoId }: { videoId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const api = useApiClient();

  const [video, setVideo] = useState<VideoDetail | null>(null);
  const [loadingVideo, setLoadingVideo] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Load video once
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingVideo(true);
      const result = await withToast(
        () => api.videos.get(videoId),
        "Failed to load video"
      );
      if (!cancelled && result?.data) {
        setVideo(result.data);
      }
      if (!cancelled) setLoadingVideo(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [api, videoId]);

  const { project } = useProject(video?.projectId ?? "");

  // Determine current step from URL, clamped to allowed range
  const stepParam = searchParams.get("step");
  const defaultStep = video ? statusToDefaultStep(video.status) : 1;
  const maxAllowed = video ? statusToMaxAllowedStep(video.status) : 1;
  const requestedStep = stepParam ? parseInt(stepParam, 10) : defaultStep;
  const currentStep = Math.min(Math.max(requestedStep, 1), maxAllowed);

  // Auto-redirect to correct step when no param and video is loaded
  useEffect(() => {
    if (!video || stepParam) return;
    const target = statusToDefaultStep(video.status);
    if (target !== currentStep) {
      router.replace(`/videos/${videoId}?step=${target}`);
    }
  }, [video, stepParam, currentStep, videoId, router]);

  // Scroll to top on step change
  useEffect(() => {
    const main = document.querySelector("main");
    if (main) main.scrollTop = 0;
  }, [currentStep]);

  function goToStep(step: number) {
    router.push(`/videos/${videoId}?step=${step}`);
  }

  function goBack() {
    if (video?.projectId) {
      router.push(`/projects/${video.projectId}`);
    } else {
      router.push("/dashboard");
    }
  }

  // Debounced auto-save
  const scheduleSave = useCallback(
    (data: Parameters<typeof api.videos.patch>[1]) => {
      clearTimeout(saveTimerRef.current);
      clearTimeout(savedTimerRef.current);
      setSaveState("saving");
      saveTimerRef.current = setTimeout(async () => {
        const result = await withToast(
          () => api.videos.patch(videoId, data),
          "Failed to save draft"
        );
        if (result?.data) {
          setVideo((prev) =>
            prev ? { ...prev, ...result.data, scenes: prev.scenes } : prev
          );
          setSaveState("saved");
          savedTimerRef.current = setTimeout(
            () => setSaveState("idle"),
            2000
          );
        } else {
          setSaveState("idle");
        }
      }, 1000);
    },
    [api, videoId]
  );

  // Manual save draft (immediate)
  async function saveDraftNow() {
    clearTimeout(saveTimerRef.current);
    setSaveState("saving");
    const result = await withToast(
      () => api.videos.patch(videoId, {}),
      "Failed to save draft"
    );
    if (result) {
      setSaveState("saved");
      toast.success("Draft saved");
      savedTimerRef.current = setTimeout(() => setSaveState("idle"), 2000);
    } else {
      setSaveState("idle");
    }
  }

  function handleTitleChange(title: string) {
    setVideo((prev) => (prev ? { ...prev, title } : prev));
    scheduleSave({ title });
  }

  if (loadingVideo || !video) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent-primary)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <WizardHeader
        videoTitle={video.title}
        projectName={project?.name ?? "Project"}
        currentStep={currentStep}
        maxAllowedStep={maxAllowed}
        saveState={saveState}
        onStepClick={goToStep}
        onBack={goBack}
        onSaveDraft={saveDraftNow}
        onTitleChange={handleTitleChange}
      />

      {/* Step content with fade + slide transition */}
      <main
        key={currentStep}
        className="relative flex-1 overflow-y-auto animate-in fade-in slide-in-from-bottom-3 duration-300"
      >
        {/* Ambient purple glow — subtle cinematic atmosphere */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[500px] bg-[radial-gradient(ellipse_80%_40%_at_50%_0%,rgba(124,92,252,0.07)_0%,transparent_70%)]" />
        {currentStep === 1 && (
          <Step1Idea
            video={video}
            project={project ?? null}
            onVideoUpdate={setVideo}
            onScheduleSave={scheduleSave}
            onAdvance={() => goToStep(2)}
          />
        )}
        {currentStep === 2 && (
          <Step2Script
            video={video}
            onVideoUpdate={setVideo}
            onScheduleSave={scheduleSave}
            onBack={() => goToStep(1)}
            onAdvance={() => goToStep(3)}
          />
        )}
        {currentStep === 3 && (
          <Step3Voice
            video={video}
            onVideoUpdate={setVideo}
            onBack={() => goToStep(2)}
            onAdvance={() => goToStep(4)}
          />
        )}
        {currentStep === 4 && (
          <Step4Scenes
            video={video}
            onVideoUpdate={setVideo}
            onBack={() => goToStep(3)}
            onAdvance={() => goToStep(5)}
          />
        )}
        {currentStep === 5 && (
          <Step5Style
            video={video}
            onVideoUpdate={setVideo}
            onScheduleSave={scheduleSave}
            onBack={() => goToStep(4)}
            onAdvance={() => goToStep(6)}
          />
        )}
        {currentStep === 6 && (
          <Step6Processing
            video={video}
            onVideoUpdate={setVideo}
            onAdvance={() => goToStep(7)}
          />
        )}
        {currentStep === 7 && (
          <Step7Done
            video={video}
            projectId={video.projectId}
            onMakeAnother={() => goToStep(1)}
          />
        )}
      </main>
    </div>
  );
}
