"use client";

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
    <nav aria-label="Wizard progress" className="flex items-center gap-0">
      {WIZARD_STEPS.map((step, index) => {
        const stepNum = index + 1;
        const isCompleted = stepNum < currentStep;
        const isActive = stepNum === currentStep;
        const isPending = stepNum > currentStep;
        const isClickable = isCompleted && stepNum <= maxAllowedStep;
        const Icon = isCompleted ? CheckCircle2 : step.icon;

        return (
          <div key={stepNum} className="flex items-center">
            {/* Connector line */}
            {index > 0 && (
              <div
                className={cn(
                  "h-px w-6 transition-colors duration-300 md:w-10",
                  stepNum <= currentStep
                    ? "bg-[var(--accent-primary)]"
                    : "bg-[var(--bg-border)]"
                )}
              />
            )}

            <button
              type="button"
              onClick={() => isClickable && onStepClick(stepNum)}
              disabled={!isClickable && !isActive}
              aria-current={isActive ? "step" : undefined}
              aria-label={`Step ${stepNum}: ${step.label}${isCompleted ? " (completed)" : ""}`}
              className={cn(
                "flex flex-col items-center gap-1 transition-all duration-200",
                isClickable
                  ? "cursor-pointer hover:opacity-80"
                  : "cursor-default",
                isPending && "opacity-40"
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-300",
                  isActive &&
                    "border-[var(--accent-primary)] bg-[var(--accent-primary)]/20 scale-110",
                  isCompleted &&
                    "border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white",
                  isPending && "border-[var(--bg-border)] bg-transparent"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4",
                    isActive && "text-[var(--accent-primary)]",
                    isCompleted && "text-white",
                    isPending && "text-[var(--text-muted)]",
                    isActive && stepNum === 6 && "animate-spin"
                  )}
                />
              </div>

              {/* Label: hidden on mobile, shown on desktop */}
              <span
                className={cn(
                  "hidden text-[10px] font-medium leading-none md:block",
                  isActive && "text-[var(--accent-primary)]",
                  isCompleted && "text-[var(--text-secondary)]",
                  isPending && "text-[var(--text-muted)]"
                )}
              >
                {step.label}
              </span>
            </button>
          </div>
        );
      })}
    </nav>
  );
}
