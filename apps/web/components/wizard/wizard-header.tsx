"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Check, Pencil, Save } from "lucide-react";
import { Button } from "@repo/ui/button";
import { ConfirmDialog } from "@repo/ui/confirm-dialog";
import { StepProgressBar } from "./step-progress-bar";
import { cn } from "@repo/ui/utils";

type SaveState = "idle" | "saving" | "saved";

interface WizardHeaderProps {
  videoTitle: string;
  projectName: string;
  currentStep: number;
  maxAllowedStep: number;
  saveState: SaveState;
  onStepClick: (step: number) => void;
  onBack: () => void;
  onSaveDraft: () => void;
  onTitleChange: (title: string) => void;
}

export function WizardHeader({
  videoTitle,
  projectName,
  currentStep,
  maxAllowedStep,
  saveState,
  onStepClick,
  onBack,
  onSaveDraft,
  onTitleChange,
}: WizardHeaderProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(videoTitle);
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitleValue(videoTitle);
  }, [videoTitle]);

  useEffect(() => {
    if (editingTitle) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editingTitle]);

  function commitTitle() {
    const trimmed = titleValue.trim();
    if (trimmed && trimmed !== videoTitle) {
      onTitleChange(trimmed);
    } else {
      setTitleValue(videoTitle);
    }
    setEditingTitle(false);
  }

  function handleBackClick() {
    if (currentStep > 1 && currentStep < 7) {
      setShowBackConfirm(true);
    } else {
      onBack();
    }
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[var(--bg-border)] bg-[var(--bg-surface)]">
        {/* Row 1: Back · Breadcrumb · Save Draft */}
        <div className="flex h-12 items-center gap-3 px-4 md:px-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBackClick}
            aria-label="Back to project"
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="flex flex-1 items-center justify-center gap-1.5 text-sm">
            <span className="hidden max-w-[120px] truncate text-[var(--text-muted)] sm:block">
              {projectName}
            </span>
            <span className="hidden text-[var(--text-muted)] sm:block">/</span>
            {editingTitle ? (
              <input
                ref={inputRef}
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitTitle();
                  if (e.key === "Escape") {
                    setTitleValue(videoTitle);
                    setEditingTitle(false);
                  }
                }}
                className="w-32 sm:w-48 max-w-full rounded border border-[var(--accent-primary)] bg-[var(--bg-elevated)] px-2 py-0.5 text-sm text-[var(--text-primary)] outline-none"
                maxLength={100}
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingTitle(true)}
                className="group flex items-center gap-1.5 transition-colors hover:text-[var(--accent-primary)]"
                aria-label="Edit video title"
              >
                <span className="max-w-[200px] truncate font-semibold text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent-primary)]">
                  {videoTitle}
                </span>
                <Pencil className="h-3 w-3 shrink-0 text-[var(--text-muted)] opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onSaveDraft}
            className={cn(
              "shrink-0 gap-1.5 transition-all",
              saveState === "saved" && "text-[var(--accent-success)]",
            )}
            aria-label="Save draft"
          >
            {saveState === "saved" ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span className="hidden sm:block">Saved</span>
              </>
            ) : (
              <>
                <Save
                  className={cn(
                    "h-3.5 w-3.5",
                    saveState === "saving" && "animate-pulse",
                  )}
                />
                <span className="hidden sm:block">Save Draft</span>
              </>
            )}
          </Button>
        </div>

        {/* Row 2: Step progress bar — full-width, room to breathe */}
        <div className="px-4 pb-3 pt-1 md:px-10">
          <StepProgressBar
            currentStep={currentStep}
            maxAllowedStep={maxAllowedStep}
            onStepClick={onStepClick}
          />
        </div>
      </header>

      <ConfirmDialog
        open={showBackConfirm}
        onOpenChange={setShowBackConfirm}
        title="Leave this video?"
        description="Your progress is saved. You can return and continue from where you left off."
        confirmLabel="Leave"
        cancelLabel="Stay"
        variant="primary"
        onConfirm={() => {
          setShowBackConfirm(false);
          onBack();
        }}
      />
    </>
  );
}
