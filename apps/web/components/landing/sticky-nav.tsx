"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Play } from "lucide-react";
import { NAV_LINKS, NAV_CTA, SITE } from "@/lib/content";

export function StickyNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <nav
      className={`fixed top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "border-b border-white/5 bg-[var(--bg-base)]/80 backdrop-blur-xl"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--accent-primary)]">
            <Play className="h-3 w-3 fill-white text-white" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-[var(--text-primary)]">
            {SITE.name}
          </span>
        </Link>

        {/* Center links — desktop only */}
        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          <Link
            href="/sign-in"
            className="hidden text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] sm:block"
          >
            {NAV_CTA.signIn}
          </Link>
          <Link
            href={NAV_CTA.primary.href}
            className="rounded-full bg-[var(--accent-primary)] px-5 py-2 text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-[0_0_20px_rgba(124,92,252,0.4)]"
          >
            {NAV_CTA.primary.label}
          </Link>
        </div>
      </div>
    </nav>
  );
}
