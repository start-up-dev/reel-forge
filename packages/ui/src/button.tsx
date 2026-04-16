"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium",
    "transition-all duration-150 focus-visible:outline-none focus-visible:ring-2",
    "focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2",
    "focus-visible:ring-offset-[var(--bg-base)] disabled:pointer-events-none",
    "disabled:opacity-50 min-w-[120px] cursor-pointer",
  ],
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary)]/90 active:scale-95",
        secondary:
          "bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--bg-border)] hover:bg-[var(--bg-border)] active:scale-95",
        ghost:
          "bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] min-w-0",
        danger:
          "bg-[var(--accent-danger)]/15 text-[var(--accent-danger)] border border-[var(--accent-danger)]/40 hover:bg-[var(--accent-danger)]/25 active:scale-95",
        success:
          "bg-[var(--accent-success)]/15 text-[var(--accent-success)] hover:bg-[var(--accent-success)]/25 active:scale-95",
      },
      size: {
        sm: "h-9 px-3 text-xs",
        md: "h-10 px-4",
        lg: "h-12 px-6 text-base",
        icon: "h-9 w-9 min-w-0 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, loading = false, children, disabled, ...props },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <Spinner />
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  }
);

Button.displayName = "Button";

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export { buttonVariants };
