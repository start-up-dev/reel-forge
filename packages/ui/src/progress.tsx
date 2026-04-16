"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "./utils";

export interface ProgressBarProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  value?: number;
  color?: "primary" | "success" | "warning" | "danger";
}

const colorMap = {
  primary: "bg-[var(--accent-primary)]",
  success: "bg-[var(--accent-success)]",
  warning: "bg-[var(--accent-warning)]",
  danger: "bg-[var(--accent-danger)]",
};

export function ProgressBar({
  className,
  value,
  color = "primary",
  ...props
}: ProgressBarProps) {
  return (
    <ProgressPrimitive.Root
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]",
        className
      )}
      value={value}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          "h-full transition-all duration-300 ease-in-out rounded-full",
          colorMap[color]
        )}
        style={{ transform: `translateX(-${100 - (value ?? 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}
