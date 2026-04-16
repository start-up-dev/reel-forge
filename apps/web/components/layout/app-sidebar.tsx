"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FolderOpen,
  Library,
  Settings,
  CreditCard,
  Zap,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Projects", icon: FolderOpen },
  { href: "/library", label: "My Videos", icon: Library },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/billing", label: "Billing", icon: CreditCard },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 flex-col border-r border-[var(--bg-border)] bg-[var(--bg-surface)]">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-5 border-b border-[var(--bg-border)]">
        <Zap className="h-5 w-5 text-[var(--accent-primary)]" />
        <span className="text-base font-semibold text-[var(--text-primary)]">
          ReelForge
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive =
              href === "/dashboard"
                ? pathname === "/dashboard" || pathname.startsWith("/projects")
                : pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] font-medium"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Branding footer */}
      <div className="p-4 border-t border-[var(--bg-border)]">
        <p className="text-[10px] font-medium text-[var(--text-muted)]">ReelForge</p>
        <p className="text-[10px] text-[var(--text-muted)] opacity-60">
          by makereal.io · © {new Date().getFullYear()}
        </p>
      </div>
    </aside>
  );
}
