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
      className={`fixed top-0 z-50 w-full transition-all duration-500 ${
        scrolled
          ? "border-b border-white/5 bg-[var(--bg-base)]/80 backdrop-blur-xl py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="group flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-primary)] shadow-[0_0_20px_rgba(245,92,42,0.3)] transition-transform group-hover:rotate-12">
            <Play className="h-5 w-5 fill-white text-white translate-x-0.5" />
          </div>
          <span className="text-[20px] font-black tracking-tighter text-[var(--text-primary)]">
            {SITE.name}
          </span>
        </Link>

        {/* Center links — desktop only */}
        <div className="hidden items-center gap-10 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-[13px] font-black uppercase tracking-widest text-[var(--text-secondary)] transition-all hover:text-[var(--accent-primary)] hover:tracking-[0.2em]"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-6">
          <Link
            href="/sign-in"
            className="hidden text-[13px] font-black uppercase tracking-widest text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] sm:block"
          >
            {NAV_CTA.signIn}
          </Link>
          <Link
            href={NAV_CTA.primary.href}
            className="group relative inline-flex items-center justify-center overflow-hidden rounded-full bg-[var(--accent-primary)] px-6 py-2.5 text-[13px] font-black uppercase tracking-widest text-white transition-all hover:scale-105 active:scale-95 hover:shadow-[0_0_30px_rgba(245,92,42,0.4)]"
          >
            <span className="relative z-10">{NAV_CTA.primary.label}</span>
            <div className="absolute inset-0 z-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
          </Link>
        </div>
      </div>
    </nav>
  );
}
