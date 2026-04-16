"use client";

import { usePathname } from "next/navigation";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/library": "Video Library",
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

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="flex h-16 shrink-0 items-center border-b border-[var(--bg-border)] bg-[var(--bg-surface)] px-6">
      <h1 className="text-base font-semibold text-[var(--text-primary)]">
        {getTitle(pathname)}
      </h1>
    </header>
  );
}
