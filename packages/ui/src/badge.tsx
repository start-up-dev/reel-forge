import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium tracking-wide uppercase",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--bg-border)]",
        primary:
          "bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]",
        success:
          "bg-[var(--accent-success)]/15 text-[var(--accent-success)]",
        warning:
          "bg-[var(--accent-warning)]/15 text-[var(--accent-warning)]",
        danger:
          "bg-[var(--accent-danger)]/15 text-[var(--accent-danger)]",
        secondary:
          "bg-[var(--accent-secondary)]/15 text-[var(--accent-secondary)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { badgeVariants };
