"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { PlanType } from "@repo/types";
import { useUser } from "@/lib/hooks/use-user";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/library": "My Videos",
  "/settings": "Settings",
  "/billing": "Billing",
};

function getTitle(pathname: string) {
  if (pathname in pageTitles) return pageTitles[pathname];
  if (pathname.startsWith("/projects/")) return "Project";
  if (pathname.startsWith("/videos/")) return "Video";
  if (pathname.startsWith("/projects")) return "Projects";
  return "ReelForge";
}

interface AppHeaderProps {
  onMenuToggle?: () => void;
}

export function AppHeader({ onMenuToggle }: AppHeaderProps) {
  const pathname = usePathname();
  const { user } = useUser();

  const plan = user?.plan ?? PlanType.None;
  const hasActivePlan = plan !== PlanType.None;
  const isTryOut = plan === PlanType.TryOut;
  const trialRemaining = user?.trialVideoRemaining ?? 0;
  const dailyUsed = user?.videosToday ?? 0;
  const dailyLimit = hasActivePlan && !isTryOut ? (user?.dailyLimit ?? 0) : 0;

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--bg-border)] bg-[var(--bg-surface)] px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors md:hidden"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold text-[var(--text-primary)]">
          {getTitle(pathname)}
        </h1>
      </div>

      <div className="flex items-center gap-3 sm:gap-5">
        {hasActivePlan && (
          <div className="hidden items-center gap-3 sm:flex">
            {isTryOut ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-muted)]">Credits</span>
                  <span className={`text-xs font-medium tabular-nums ${trialRemaining === 0 ? "text-[var(--accent-danger)]" : "text-[var(--text-primary)]"}`}>
                    {trialRemaining} / 3
                  </span>
                </div>
                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                  <div
                    className={`h-full rounded-full transition-all ${trialRemaining === 0 ? "bg-[var(--accent-danger)]" : trialRemaining === 1 ? "bg-[var(--accent-warning)]" : "bg-[var(--accent-primary)]"}`}
                    style={{ width: `${Math.min((trialRemaining / 3) * 100, 100)}%` }}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-muted)]">Videos today</span>
                  <span className={`text-xs font-medium tabular-nums ${dailyUsed >= dailyLimit ? "text-[var(--accent-danger)]" : "text-[var(--text-primary)]"}`}>
                    {dailyUsed} / {dailyLimit}
                  </span>
                </div>
                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                  <div
                    className={`h-full rounded-full transition-all ${dailyUsed >= dailyLimit ? "bg-[var(--accent-danger)]" : dailyUsed / dailyLimit > 0.8 ? "bg-[var(--accent-warning)]" : "bg-[var(--accent-primary)]"}`}
                    style={{ width: `${dailyLimit > 0 ? Math.min((dailyUsed / dailyLimit) * 100, 100) : 0}%` }}
                  />
                </div>
              </>
            )}
          </div>
        )}
        <UserButton
          appearance={{
            elements: {
              avatarBox: "h-8 w-8",
            },
          }}
        />
      </div>
    </header>
  );
}
