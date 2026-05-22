"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Library,
  Layers,
  Settings,
  CreditCard,
  Zap,
  TrendingUp,
} from "lucide-react";
import { useUser } from "@/lib/hooks/use-user";

const navSections = [
  {
    label: "Content",
    items: [
      { href: "/brands", label: "Brands", icon: Layers },
      { href: "/library", label: "Library", icon: Library },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/settings", label: "Settings", icon: Settings },
      { href: "/billing", label: "Billing", icon: CreditCard },
    ],
  },
];

interface AppSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AppSidebar({ isOpen, onClose }: AppSidebarProps) {
  const pathname = usePathname();
  const { user } = useUser();

  const showUpgrade = !user || user.plan === "none" || user.plan === "try_out";

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-[var(--bg-border)] bg-[var(--bg-surface)] transition-transform duration-300 md:relative md:translate-x-0 md:flex ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-5 border-b border-[var(--bg-border)]">
        <Zap className="h-5 w-5 text-[var(--accent-primary)]" />
        <span className="text-base font-semibold text-[var(--text-primary)]">
          ReelForge
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3">
        <div className="space-y-4">
          {navSections.map((section) => (
            <div key={section.label}>
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                {section.label}
              </p>
              <ul className="space-y-0.5">
                {section.items.map(({ href, label, icon: Icon }) => {
                  const isActive = pathname.startsWith(href);
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
            </div>
          ))}
        </div>
      </nav>

      {/* Upgrade CTA (free / trial plans) */}
      {showUpgrade && (
        <div className="px-4 pb-3">
          <Link
            href="/billing"
            className="flex items-center gap-2 rounded-lg border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/8 px-3 py-2.5 text-sm font-medium text-[var(--accent-primary)] transition-colors hover:bg-[var(--accent-primary)]/15"
          >
            <TrendingUp className="h-4 w-4 shrink-0" />
            Upgrade to Pro
          </Link>
        </div>
      )}

      {/* Branding footer */}
      <div className="p-4 border-t border-[var(--bg-border)]">
        <p className="text-[10px] font-medium text-[var(--text-muted)]">
          ReelForge
        </p>
        <p className="text-[10px] text-[var(--text-muted)] opacity-60">
          by{" "}
          <a
            href="https://makereal.io"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-[var(--accent-primary)] transition-colors"
          >
            makereal.io
          </a>{" "}
          · © {new Date().getFullYear()}
        </p>
      </div>
      </aside>
    </>
  );
}
