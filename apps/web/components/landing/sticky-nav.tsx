"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { NAV_LINKS, NAV_CTA } from "@/lib/content";
import Image from "next/image";

export function StickyNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <>
      {/* Mobile menu overlay — sibling of nav so z-index stacking is clean */}
      <div
        className={`fixed inset-0 z-40 bg-[var(--bg-base)] transition-all duration-500 md:hidden ${
          mobileMenuOpen
            ? "translate-y-0 opacity-100 pointer-events-auto"
            : "-translate-y-full opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex h-full flex-col items-center justify-center gap-8 px-6">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="text-[20px] font-black uppercase tracking-[0.2em] text-[var(--text-primary)] transition-all hover:text-[var(--accent-primary)]"
            >
              {link.label}
            </a>
          ))}
          <div className="h-px w-20 bg-white/10" />
          <Link
            href="/sign-in"
            onClick={() => setMobileMenuOpen(false)}
            className="text-[16px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]"
          >
            {NAV_CTA.signIn}
          </Link>
          <Link
            href={NAV_CTA.primary.href}
            onClick={() => setMobileMenuOpen(false)}
            className="inline-flex items-center justify-center rounded-full bg-[var(--accent-primary)] px-8 py-3 text-[14px] font-black uppercase tracking-widest text-white"
          >
            {NAV_CTA.primary.label}
          </Link>
        </div>
      </div>

      <nav
        className={`fixed top-0 z-50 w-full transition-all duration-500 ${
          scrolled || mobileMenuOpen
            ? "border-b border-white/5 bg-[var(--bg-base)]/90 backdrop-blur-xl py-3"
            : "bg-transparent py-5"
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
          {/* Logo */}
          <Link href="/" className="group flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="ReelForge"
              width={100}
              height={100}
              className="transition-transform group-hover:rotate-12"
            />
          </Link>

          {/* Center links — desktop only */}
          <div className="hidden items-center gap-8 lg:gap-10 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-[12px] lg:text-[13px] font-black uppercase tracking-widest text-[var(--text-secondary)] transition-all hover:text-[var(--accent-primary)] hover:tracking-[0.2em]"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-4 md:gap-6">
            <Link
              href="/sign-in"
              className="hidden text-[12px] lg:text-[13px] font-black uppercase tracking-widest text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] sm:block"
            >
              {NAV_CTA.signIn}
            </Link>
            <Link
              href={NAV_CTA.primary.href}
              className="group relative inline-flex items-center justify-center overflow-hidden rounded-full bg-[var(--accent-primary)] px-5 py-2 md:px-6 md:py-2.5 text-[11px] md:text-[13px] font-black uppercase tracking-widest text-white transition-all hover:scale-105 active:scale-95 hover:shadow-[0_0_30px_rgba(245,92,42,0.4)]"
            >
              <span className="relative z-10">{NAV_CTA.primary.label}</span>
              <div className="absolute inset-0 z-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
            </Link>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.03] border border-white/10 text-[var(--text-primary)] md:hidden"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
