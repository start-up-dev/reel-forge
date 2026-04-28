"use client";

import React from "react";
import {
  CheckCircle2,
  FileText,
  Images,
  Lightbulb,
  Loader2,
  Mic,
  Sparkles,
  Trophy,
} from "lucide-react";
import { cn } from "@repo/ui/utils";

export const WIZARD_STEPS = [
  { label: "Idea", icon: Lightbulb },
  { label: "Script", icon: FileText },
  { label: "Voice", icon: Mic },
  { label: "Scenes", icon: Images },
  { label: "Style", icon: Sparkles },
  { label: "Processing", icon: Loader2 },
  { label: "Done", icon: Trophy },
] as const;

interface StepProgressBarProps {
  currentStep: number; // 1-indexed
  maxAllowedStep: number;
  onStepClick: (step: number) => void;
}

export function StepProgressBar({
  currentStep,
  maxAllowedStep,
  onStepClick,
}: StepProgressBarProps) {
  return (
    <nav aria-label="Wizard progress" className="flex w-full items-start">
      {WIZARD_STEPS.map((step, index) => {
        const stepNum = index + 1;
        const isCompleted = stepNum < currentStep;
        const isActive = stepNum === currentStep;
        const isPending = stepNum > currentStep;
        const isClickable = isCompleted && stepNum <= maxAllowedStep;
        const isLast = index === WIZARD_STEPS.length - 1;
        const Icon = isCompleted ? CheckCircle2 : step.icon;

        return (
          <React.Fragment key={stepNum}>
            <button
              type="button"
              onClick={() => isClickable && onStepClick(stepNum)}
              disabled={!isClickable && !isActive}
              aria-current={isActive ? "step" : undefined}
              aria-label={`Step ${stepNum}: ${step.label}${isCompleted ? " (completed)" : ""}`}
              className={cn(
                "flex shrink-0 flex-col items-center gap-1.5 transition-all duration-200",
                isClickable ? "cursor-pointer hover:opacity-80" : "cursor-default",
              )}
            >
              <div
                className={cn(
                  "flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-full border-2 transition-all duration-300",
                  isActive && [
                    "scale-110 border-[var(--accent-primary)] bg-[var(--accent-primary)]/15",
                    "shadow-[0_0_0_4px_rgba(245,92,42,0.12),0_0_20px_rgba(245,92,42,0.45)]",
                  ],
                  isCompleted &&
                    "border-[var(--accent-primary)] bg-[var(--accent-primary)]",
                  isPending &&
                    "border-[var(--bg-border)] bg-[var(--bg-elevated)] opacity-40",
                )}
              >
                <Icon
                  className={cn(
                    "h-[14px] w-[14px] sm:h-[17px] sm:w-[17px] transition-colors",
                    isActive && "text-[var(--accent-primary)]",
                    isCompleted && "text-white",
                    isPending && "text-[var(--text-muted)]",
                    isActive && stepNum === 6 && "animate-spin",
                  )}
                />
              </div>

              <span
                className={cn(
                  "hidden text-[10px] font-semibold uppercase leading-none tracking-[0.08em] transition-colors md:block",
                  isActive && "text-[var(--accent-primary)]",
                  isCompleted && "text-[var(--text-secondary)]",
                  isPending && "text-[var(--text-muted)] opacity-40",
                )}
              >
                {step.label}
              </span>
            </button>

            {/* Connector — flex-1 so it fills available space between steps */}
            {!isLast && (
              <div className="mx-1 sm:mx-1.5 mt-[14px] sm:mt-[18px] h-px flex-1 overflow-hidden rounded-full bg-[var(--bg-border)]">
                <div
                  className={cn(
                    "h-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] transition-all duration-500 ease-out",
                    isCompleted ? "w-full" : "w-0",
                  )}
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
