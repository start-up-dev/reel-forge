import * as React from "react";
import { cn } from "./utils";
import { Button } from "./button";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  heading: string;
  body?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon,
  heading,
  body,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-xl",
        "border border-dashed border-[var(--bg-border)] p-12 text-center",
        className
      )}
    >
      {icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--bg-elevated)] text-[var(--text-muted)]">
          {icon}
        </div>
      )}
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">
          {heading}
        </h3>
        {body && (
          <p className="text-sm text-[var(--text-secondary)] max-w-xs">
            {body}
          </p>
        )}
      </div>
      {action && (
        <Button variant="primary" size="md" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
