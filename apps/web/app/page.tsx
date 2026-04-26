import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  ChevronDown,
  Clock,
  TrendingDown,
  Flame,
  Film,
  Smile,
  Star,
  Layers,
  Zap,
  PenLine,
  Video,
  CheckCircle,
  XCircle,
  Play,
} from "lucide-react";
import { StickyNav } from "@/components/landing/sticky-nav";
import {
  HERO,
  SHOWCASE,
  PROOF_STATS,
  PROBLEM,
  SOLUTION,
  PIPELINE,
  STYLES,
  COMPARISON,
  PRICING,
  FAQ,
  FINAL_CTA,
  FOOTER,
  SITE,
} from "@/lib/content";

// ─── rgba shorthand for the new orange primary ─────────────────────────────
// #f55c2a = rgb(245, 92, 42)
const O = (a: number) => `rgba(245,92,42,${a})`;

export default async function RootPage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--bg-base)] text-[var(--text-primary)]">
      <StickyNav />
      <HeroSection />
      <ShowcaseSection />
      <ProofStrip />
      <ProblemSection />
      <SolutionReveal />
      <PipelineSection />
      <StylesSection />
      <BeforeAfterSection />
      <PricingSection />
      <FAQSection />
      <FinalCTASection />
      <FooterSection />
    </div>
  );
}

/* ─── Shared primitives ───────────────────────────────────────────────────── */

function SectionLabel({
  children,
  variant = "muted",
}: {
  children: React.ReactNode;
  variant?: "muted" | "accent" | "warning";
}) {
  const color =
    variant === "accent"
      ? "text-[var(--accent-primary)]"
      : variant === "warning"
        ? "text-[var(--accent-warning)]"
        : "text-[var(--text-muted)]";
  return (
    <div className="mb-5 flex flex-col items-center gap-3">
      <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${color}`}>
        {children}
      </p>
      <div className="h-px w-8 bg-[var(--accent-primary)]" />
    </div>
  );
}

function PrimaryButton({
  href,
  children,
  size = "md",
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sz = { sm: "px-5 py-2.5 text-sm", md: "px-7 py-3.5 text-sm", lg: "px-9 py-4 text-[15px]" };
  return (
    <Link
      href={href}
      className={`group inline-flex items-center gap-2 rounded-full bg-[var(--accent-primary)] font-bold text-white transition-all hover:opacity-90 hover:shadow-[0_0_36px_${O(0.45)}] ${sz[size]} ${className}`}
    >
      {children}
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
    </Link>
  );
}

/* ─── Hero ────────────────────────────────────────────────────────────────── */

function HeroSection() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-start overflow-hidden pt-36 pb-20">
      {/* Ambient glow — warm, not neon */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 700px 420px at 50% 30%, ${O(0.08)}, transparent)`,
        }}
      />
      {/* Subtle grain overlay for texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
          backgroundSize: "200px 200px",
        }}
      />

      <div className="relative mx-auto max-w-4xl px-6 text-center">
        {/* Eyebrow */}
        <div className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/[0.07] px-4 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-primary)]" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-primary)]">
            {HERO.eyebrow}
          </p>
        </div>

        {/* Headline */}
        <h1 className="mb-7 text-[62px] font-black leading-[0.93] tracking-[-0.03em] text-[var(--text-primary)] md:text-[90px]">
          {HERO.headlineLine1}
          <br />
          <span className="relative inline-block">
            {HERO.headlineLine2}
            <svg
              aria-hidden
              className="absolute -bottom-2 left-0 w-full"
              height="6"
              viewBox="0 0 400 6"
              preserveAspectRatio="none"
              fill="none"
            >
              <path
                d="M0 4 C80 1, 160 5.5, 240 3 C320 0.5, 370 5, 400 3"
                stroke="var(--accent-primary)"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.7"
              />
            </svg>
          </span>
        </h1>

        {/* Sub */}
        <p className="mx-auto mb-10 max-w-[520px] text-[17px] leading-[1.65] text-[var(--text-secondary)] md:text-[19px]">
          {HERO.subheadline}
        </p>

        {/* CTAs */}
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <div className="flex flex-col items-center gap-2.5">
            <PrimaryButton href={HERO.primaryCta.href} size="lg">
              {HERO.primaryCta.label}
            </PrimaryButton>
            <p className="text-[11px] text-[var(--text-muted)]">{HERO.primaryCta.subtext}</p>
          </div>
          <button className="flex items-center gap-2 rounded-full border border-white/[0.08] px-6 py-4 text-[14px] text-[var(--text-secondary)] transition-all hover:border-white/20 hover:text-[var(--text-primary)]">
            <Play className="h-3.5 w-3.5 fill-[var(--accent-primary)] text-[var(--accent-primary)]" />
            {HERO.secondaryCta.label}
          </button>
        </div>

        {/* Social proof */}
        <div className="mt-12 flex flex-col items-center gap-2.5">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {["#f55c2a", "#4a90e2", "#34d399", "#fbbf24", "#f87171"].map((c, i) => (
                <div
                  key={i}
                  className="h-7 w-7 rounded-full border-2 border-[var(--bg-base)]"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div>
              <div className="text-[11px] text-[var(--accent-warning)]">★★★★★</div>
              <p className="text-[11px] text-[var(--text-muted)]">{HERO.proof.rating}</p>
            </div>
          </div>
          <p className="text-[12px] text-[var(--text-muted)]">{HERO.proof.text}</p>
        </div>
      </div>

      {/* Scene review mockup */}
      <div className="relative mx-auto mt-16 w-full max-w-5xl px-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full blur-3xl"
          style={{ background: O(0.06) }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full blur-3xl"
          style={{ background: "rgba(74,144,226,0.06)" }}
        />
        <div
          className="relative overflow-hidden rounded-2xl border border-white/[0.05] shadow-[0_32px_80px_rgba(0,0,0,0.7)]"
          style={{ transform: "perspective(1200px) rotateX(1.5deg)" }}
        >
          <SceneReviewMockup />
        </div>
      </div>

      <a
        href="#showcase"
        className="mt-14 flex animate-bounce flex-col items-center text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
      >
        <ChevronDown className="h-5 w-5" />
      </a>
    </section>
  );
}

function SceneReviewMockup() {
  const scenes = [
    { label: "Hook opening", g: "from-slate-900 to-blue-950" },
    { label: "Problem reveal", g: "from-stone-900 to-orange-950" },
    { label: "Data point", g: "from-zinc-900 to-indigo-950" },
    { label: "Solution intro", g: "from-neutral-900 to-teal-950" },
    { label: "Feature beat", g: "from-gray-900 to-violet-950" },
    { label: "Social proof", g: "from-slate-900 to-emerald-950" },
    { label: "CTA lead-in", g: "from-stone-900 to-amber-950" },
    { label: "Closing frame", g: "from-zinc-900 to-cyan-950" },
  ];
  return (
    <div className="bg-[var(--bg-surface)] p-5">
      {/* Chrome bar */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-[var(--accent-danger)] opacity-50" />
          <div className="h-2.5 w-2.5 rounded-full bg-[var(--accent-warning)] opacity-50" />
          <div className="h-2.5 w-2.5 rounded-full bg-[var(--accent-success)] opacity-50" />
        </div>
        <div className="flex items-center gap-1">
          {["Idea", "Script", "Voice", "Scenes", "Style", "Submit"].map((s, i) => (
            <div
              key={s}
              className={`flex h-5 items-center rounded px-2 text-[9px] font-semibold ${
                i === 3
                  ? "bg-[var(--accent-primary)] text-white"
                  : i < 3
                    ? "bg-[var(--accent-success)]/15 text-[var(--accent-success)]"
                    : "bg-[var(--bg-elevated)] text-[var(--text-muted)]"
              }`}
            >
              {i < 3 ? "✓" : s}
            </div>
          ))}
        </div>
        <div
          className="rounded-full px-3 py-1 text-[10px] font-bold text-white"
          style={{ background: "var(--accent-primary)" }}
        >
          Approve All
        </div>
      </div>
      {/* Scene grid */}
      <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-8">
        {scenes.map((s, i) => (
          <div
            key={i}
            className={`group relative aspect-[9/16] overflow-hidden rounded-lg bg-gradient-to-br ${s.g} ring-1 ring-white/[0.04] transition-all hover:ring-[var(--accent-primary)]/50`}
          >
            <div className="absolute left-1.5 top-1.5 rounded bg-black/40 px-1 py-0.5 text-[8px] font-bold text-white">
              {String(i + 1).padStart(2, "0")}
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 p-1.5">
              <p className="text-[7px] text-white/70 leading-tight">{s.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Video Showcase ──────────────────────────────────────────────────────── */

function ShowcaseSection() {
  return (
    <section id="showcase" className="py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-14 text-center">
          <SectionLabel variant="accent">{SHOWCASE.label}</SectionLabel>
          <h2 className="mb-4 whitespace-pre-line text-[36px] font-extrabold leading-tight tracking-tight text-[var(--text-primary)] md:text-[52px]">
            {SHOWCASE.headline}
          </h2>
          <p className="mx-auto max-w-md text-[16px] text-[var(--text-secondary)]">
            {SHOWCASE.subheadline}
          </p>
        </div>

        {/* Staggered phone grid */}
        <div className="flex items-end justify-center gap-4 overflow-x-auto pb-4 md:overflow-visible">
          {SHOWCASE.videos.map((v, i) => {
            const offsets = [0, -28, -12, -36, -8, -24];
            return (
              <div
                key={i}
                className="shrink-0"
                style={{ marginBottom: `${Math.abs(offsets[i] ?? 0)}px` }}
              >
                <PhoneFrame video={v} />
              </div>
            );
          })}
        </div>

        {/* Disclaimer */}
        <p className="mt-10 text-center text-[12px] text-[var(--text-muted)]">
          Illustrative examples of content types ReelForge can produce across different niches and visual styles.
        </p>
      </div>
    </section>
  );
}

function PhoneFrame({ video }: { video: (typeof SHOWCASE.videos)[number] }) {
  const platformColor: Record<string, string> = {
    TikTok: "#010101",
    Instagram: "#e1306c",
    "YouTube Shorts": "#ff0000",
  };
  const dotColor = platformColor[video.platform] ?? "#888";

  return (
    <div className="group relative w-[130px] md:w-[148px]">
      {/* Phone body */}
      <div className="relative overflow-hidden rounded-[22px] border-[3px] border-[var(--bg-border)] bg-[var(--bg-base)] shadow-[0_24px_48px_rgba(0,0,0,0.6)] transition-all duration-300 group-hover:-translate-y-2 group-hover:shadow-[0_32px_64px_rgba(0,0,0,0.7)]">
        {/* Notch */}
        <div className="relative z-10 flex justify-center pt-2 pb-1">
          <div className="h-2 w-12 rounded-full bg-[var(--bg-border)]" />
        </div>

        {/* Screen */}
        <div
          className="relative mx-1 mb-1 overflow-hidden rounded-[16px]"
          style={{
            aspectRatio: "9/16",
            background: `linear-gradient(160deg, ${video.gradientFrom}, ${video.gradientTo})`,
          }}
        >
          {/* Style badge */}
          <div
            className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[8px] font-bold text-white"
            style={{ background: video.accentColor }}
          >
            {video.style}
          </div>

          {/* Platform dot */}
          <div
            className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full"
            style={{ background: dotColor }}
          >
            <Play className="h-2 w-2 fill-white text-white" />
          </div>

          {/* Content area */}
          <div className="absolute inset-0 flex flex-col items-center justify-center px-3">
            <p className="text-center text-[10px] font-black leading-tight text-white">
              {video.hook}
            </p>
          </div>

          {/* Subtitle bar */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 px-2 pb-3 pt-6">
            <div className="text-center text-[8px] font-bold text-white">
              <span
                className="rounded-sm px-1 py-0.5"
                style={{ background: video.accentColor + "33" }}
              >
                {video.niche}
              </span>
            </div>
            <p className="mt-1 text-center text-[8px] font-semibold text-white/90">
              {video.views}
            </p>
          </div>
        </div>
      </div>

      {/* Label below frame */}
      <p className="mt-3 text-center text-[11px] text-[var(--text-muted)]">
        {video.style}
      </p>
    </div>
  );
}

/* ─── Proof Strip ─────────────────────────────────────────────────────────── */

function ProofStrip() {
  return (
    <div className="border-y border-[var(--bg-border)] bg-[var(--bg-surface)] py-6">
      <div className="mx-auto max-w-5xl px-6">
        <div className="flex flex-wrap items-center justify-center gap-x-14 gap-y-6">
          {PROOF_STATS.map((s, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className="text-[36px] font-black text-[var(--text-primary)]">{s.value}</span>
              <span className="whitespace-pre-line text-center text-[10px] uppercase tracking-[0.07em] text-[var(--text-muted)]">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Problem ─────────────────────────────────────────────────────────────── */

function ProblemSection() {
  const icons = { clock: Clock, "trending-down": TrendingDown, flame: Flame } as const;
  const colors = {
    clock: "var(--accent-danger)",
    "trending-down": "var(--accent-warning)",
    flame: "var(--accent-primary)",
  } as const;

  return (
    <section className="mx-auto max-w-6xl px-6 py-28 md:py-40">
      <div className="text-center">
        <SectionLabel>{PROBLEM.label}</SectionLabel>
        <h2 className="mb-10 text-[38px] font-extrabold leading-tight tracking-[-0.02em] text-[var(--text-primary)] md:text-[58px]">
          {PROBLEM.headlineLine1}
          <br />
          {PROBLEM.headlineLine2}{" "}
          <span className="text-[var(--accent-danger)]">{PROBLEM.headlineAccent}</span>
        </h2>
        <div className="mx-auto max-w-[540px] space-y-5">
          {PROBLEM.body.map((p, i) => (
            <p key={i} className="text-[17px] leading-relaxed text-[var(--text-secondary)]">
              {p.split(/(2–4 hours|5 videos a day|10–20 hours)/).map((part, j) =>
                ["2–4 hours", "5 videos a day", "10–20 hours"].includes(part) ? (
                  <span key={j} className="font-semibold text-[var(--text-primary)]">
                    {part}
                  </span>
                ) : (
                  part
                )
              )}
            </p>
          ))}
        </div>
      </div>

      <div className="mt-14 grid gap-4 md:grid-cols-3">
        {PROBLEM.cards.map((card) => {
          const k = card.iconKey as keyof typeof icons;
          const Icon = icons[k];
          return (
            <div
              key={card.title}
              className="rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-surface)] p-7"
            >
              <Icon className="mb-4 h-5 w-5" style={{ color: colors[k] }} />
              <h3 className="mb-2 text-[16px] font-bold text-[var(--text-primary)]">{card.title}</h3>
              <p className="text-[14px] leading-relaxed text-[var(--text-secondary)]">{card.body}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ─── Solution Reveal ─────────────────────────────────────────────────────── */

function SolutionReveal() {
  return (
    <section className="relative overflow-hidden bg-[var(--bg-surface)] py-28 md:py-40">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 800px 440px at 50% 50%, ${O(0.07)}, transparent)`,
        }}
      />
      <div className="relative mx-auto max-w-2xl px-6 text-center">
        <h2 className="mb-8 text-[38px] font-extrabold leading-tight tracking-[-0.02em] text-[var(--text-primary)] md:text-[64px]">
          {SOLUTION.headlineLine1}
          <br />
          <span className="text-[var(--accent-primary)]">{SOLUTION.headlineLine2}</span>
        </h2>
        <div className="mx-auto mb-10 max-w-md space-y-5">
          {SOLUTION.body.map((p, i) => (
            <p key={i} className="text-[17px] leading-relaxed text-[var(--text-secondary)]">
              {p}
            </p>
          ))}
          <p className="text-[18px] font-bold text-[var(--text-primary)]">{SOLUTION.closer}</p>
        </div>

        {/* Pipeline nodes */}
        <div className="mb-10 flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-0">
          {SOLUTION.pipelineNodes.map((node, i) => (
            <div key={node} className="flex items-center">
              <div className="rounded-full border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-4 py-2 text-[13px] font-semibold">
                {node === "Finished Video" ? (
                  <span className="text-[var(--accent-success)]">{node}</span>
                ) : (
                  <span className="text-[var(--text-secondary)]">{node}</span>
                )}
              </div>
              {i < SOLUTION.pipelineNodes.length - 1 && (
                <div className="hidden items-center sm:flex">
                  <div className="h-px w-5 bg-[var(--bg-border)]" />
                  <div className="h-1.5 w-1.5 rounded-full bg-[var(--accent-primary)] opacity-70" />
                  <div className="h-px w-5 bg-[var(--bg-border)]" />
                </div>
              )}
            </div>
          ))}
        </div>

        <a
          href={SOLUTION.inlineCta.href}
          className="group inline-flex items-center gap-1.5 text-[14px] font-semibold text-[var(--accent-primary)] transition-all hover:gap-3"
        >
          {SOLUTION.inlineCta.label}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </a>
      </div>
    </section>
  );
}

/* ─── Pipeline ────────────────────────────────────────────────────────────── */

function PipelineSection() {
  return (
    <section id="pipeline" className="mx-auto max-w-6xl px-6 py-28 md:py-40">
      <div className="mb-16 text-center">
        <SectionLabel variant="accent">{PIPELINE.label}</SectionLabel>
        <h2 className="mb-4 text-[38px] font-extrabold leading-tight tracking-[-0.02em] text-[var(--text-primary)] md:text-[58px]">
          {PIPELINE.headlineLine1}
          <br />
          <span className="text-[var(--accent-primary)]">{PIPELINE.headlineLine2}</span>
        </h2>
        <p className="text-[17px] text-[var(--text-secondary)]">{PIPELINE.subheadline}</p>
      </div>

      <div className="relative">
        {/* Center line */}
        <div
          aria-hidden
          className="absolute inset-y-4 left-1/2 hidden w-px -translate-x-1/2 md:block"
          style={{
            background: `linear-gradient(to bottom, transparent, ${O(0.2)} 15%, ${O(0.2)} 85%, transparent)`,
          }}
        />

        <div className="space-y-6">
          {PIPELINE.steps.map((step, i) => {
            const even = i % 2 === 1;
            return (
              <div
                key={step.num}
                className={`flex items-start gap-4 md:gap-0 ${even ? "md:flex-row-reverse" : ""}`}
              >
                {/* Card */}
                <div className={`flex-1 md:max-w-[calc(50%-44px)] ${even ? "md:pl-10" : "md:pr-10"}`}>
                  <div className="rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-surface)] p-7 transition-all hover:border-[var(--accent-primary)]/20">
                    <p
                      className={`mb-2 text-[10px] font-bold uppercase tracking-[0.12em] ${step.labelVariant === "accent" ? "text-[var(--accent-primary)]" : "text-[var(--text-muted)]"}`}
                    >
                      {step.label}
                    </p>
                    <h3 className="mb-3 text-[17px] font-bold leading-snug text-[var(--text-primary)]">
                      {step.title}
                    </h3>
                    <p className="mb-4 text-[14px] leading-relaxed text-[var(--text-secondary)]">
                      {step.body}
                    </p>
                    {step.pill && (
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold ${
                          step.pillVariant === "success"
                            ? "border border-[var(--accent-success)]/25 bg-[var(--accent-success)]/10 text-[var(--accent-success)]"
                            : `border bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]`
                        }`}
                        style={
                          step.pillVariant !== "success"
                            ? { borderColor: O(0.25) }
                            : undefined
                        }
                      >
                        {step.pill}
                      </span>
                    )}
                  </div>
                </div>

                {/* Circle — desktop */}
                <div className="hidden shrink-0 items-start justify-center pt-7 md:flex md:w-[88px]">
                  <div
                    className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 bg-[var(--bg-base)] text-[13px] font-bold text-[var(--accent-primary)]"
                    style={{ borderColor: "var(--accent-primary)" }}
                  >
                    {i + 1}
                  </div>
                </div>

                {/* Empty spacer — desktop */}
                <div className="hidden md:block md:flex-1" />

                {/* Circle — mobile */}
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-[var(--bg-base)] text-[11px] font-bold text-[var(--accent-primary)] md:hidden"
                  style={{ borderColor: "var(--accent-primary)" }}
                >
                  {i + 1}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─── Styles ──────────────────────────────────────────────────────────────── */

const STYLE_ICONS = {
  film: Film,
  smile: Smile,
  star: Star,
  shapes: Layers,
  zap: Zap,
  "pen-line": PenLine,
  video: Video,
} as const;

const BADGE_CLS = {
  warning: "border-[var(--accent-warning)]/25 bg-[var(--accent-warning)]/10 text-[var(--accent-warning)]",
  primary: `text-[var(--accent-primary)]`,
  muted: "border-white/10 bg-white/5 text-[var(--text-muted)]",
  secondary: "border-[var(--accent-secondary)]/25 bg-[var(--accent-secondary)]/10 text-[var(--accent-secondary)]",
} as const;

function StyleCard({ style }: { style: (typeof STYLES.visualStyles)[number] }) {
  const Icon = STYLE_ICONS[style.iconKey as keyof typeof STYLE_ICONS];
  return (
    <div className="rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-surface)] p-6 transition-all duration-200 hover:-translate-y-1 hover:border-[var(--accent-primary)]/30">
      <div
        className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl"
        style={{ background: style.iconBg }}
      >
        <Icon className="h-5 w-5" style={{ color: style.iconColor }} />
      </div>
      <h3 className="mb-1 text-[15px] font-bold text-[var(--text-primary)]">{style.name}</h3>
      <p className="mb-2.5 text-[11px] italic text-[var(--text-muted)]">{style.mood}</p>
      <p className="text-[13px] leading-relaxed text-[var(--text-secondary)]">{style.description}</p>
    </div>
  );
}

function StylesSection() {
  return (
    <section id="styles" className="bg-[var(--bg-surface)] py-28 md:py-40">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-14 text-center">
          <SectionLabel>{STYLES.label}</SectionLabel>
          <h2 className="text-[38px] font-extrabold leading-tight tracking-[-0.02em] text-[var(--text-primary)] md:text-[54px]">
            {STYLES.headlineLine1}
            <br />
            {STYLES.headlineLine2}
            <br />
            <span className="text-[var(--accent-primary)]">{STYLES.headlineAccent}</span>
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-[16px] text-[var(--text-secondary)]">
            {STYLES.subheadline}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STYLES.visualStyles.slice(0, 4).map((s) => <StyleCard key={s.name} style={s} />)}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {STYLES.visualStyles.slice(4).map((s) => <StyleCard key={s.name} style={s} />)}
        </div>

        {/* Subtitle styles */}
        <div className="mt-20 border-t border-[var(--bg-border)] pt-16">
          <div className="mb-10 text-center">
            <h3 className="mb-3 text-[28px] font-bold text-[var(--text-primary)] md:text-[36px]">
              Then choose how your words land.
            </h3>
            <p className="mx-auto max-w-md text-[15px] text-[var(--text-secondary)]">
              85% of short-form video is watched on mute. Subtitles aren&apos;t decoration — they&apos;re your voice.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STYLES.subtitleStyles.map((s) => (
              <div key={s.name} className="overflow-hidden rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-elevated)]">
                <SubtitlePreview name={s.name} />
                <div className="p-5">
                  <div className="mb-2 flex items-center gap-2">
                    <h4 className="text-[14px] font-bold text-[var(--text-primary)]">{s.name}</h4>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${BADGE_CLS[s.badgeVariant]}`}
                      style={
                        s.badgeVariant === "primary"
                          ? { borderColor: O(0.25), background: O(0.08) }
                          : undefined
                      }
                    >
                      {s.badge}
                    </span>
                  </div>
                  <p className="text-[12px] leading-relaxed text-[var(--text-secondary)]">{s.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SubtitlePreview({ name }: { name: string }) {
  const map: Record<string, React.ReactNode> = {
    "Bold Pop": (
      <div className="flex h-32 items-center justify-center bg-[var(--bg-base)] px-3">
        <p className="text-[17px] font-black text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
          SAVE{" "}
          <span className="rounded-sm bg-[var(--accent-warning)] px-1 text-black">YOUR</span>{" "}
          MONEY
        </p>
      </div>
    ),
    "Word Highlight": (
      <div className="flex h-32 items-center justify-center gap-2 bg-[var(--bg-base)]">
        <span className="text-sm font-bold text-white/30">Your</span>
        <span className="text-base font-bold text-white/60">Future</span>
        <span className="text-xl font-black text-white">Starts</span>
      </div>
    ),
    Minimal: (
      <div className="relative flex h-32 items-end bg-[var(--bg-base)] pb-3">
        <p className="w-full text-center text-[12px] text-white/80">Start saving now.</p>
      </div>
    ),
    Cinematic: (
      <div className="relative flex h-32 items-end bg-[var(--bg-base)]">
        <div className="w-full bg-black/65 py-2.5 px-3 backdrop-blur-sm">
          <p className="text-center text-[12px] tracking-wide text-white">
            The moment everything changed.
          </p>
        </div>
      </div>
    ),
  };
  return <div className="overflow-hidden rounded-t-2xl">{map[name] ?? null}</div>;
}

/* ─── Before / After ─────────────────────────────────────────────────────── */

function BeforeAfterSection() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-28 md:py-40">
      <div className="overflow-hidden rounded-3xl border border-[var(--bg-border)] bg-[var(--bg-surface)]">
        <div className="grid md:grid-cols-2">
          {/* Without */}
          <div className="border-b border-[var(--bg-border)] p-8 md:border-b-0 md:border-r md:p-12">
            <p className="mb-6 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--accent-danger)]">
              {COMPARISON.withoutLabel}
            </p>
            <div className="space-y-4">
              {COMPARISON.without.map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-danger)] opacity-50" />
                  <span className="text-[14px] text-[var(--text-secondary)]">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* With */}
          <div className="relative p-8 md:p-12">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{ background: `radial-gradient(ellipse 360px 360px at 80% 50%, ${O(0.05)}, transparent)` }}
            />
            <p className="mb-6 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--accent-success)]">
              {COMPARISON.withLabel}
            </p>
            <div className="space-y-4">
              {COMPARISON.with.map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-success)]" />
                  <span className="text-[14px] font-medium text-[var(--text-primary)]">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12 flex flex-col items-center gap-3 text-center">
        <h3 className="text-[30px] font-extrabold text-[var(--text-primary)] md:text-[38px]">
          {COMPARISON.cta.headline}
        </h3>
        <PrimaryButton href={COMPARISON.cta.href} size="md" className="mt-2">
          {COMPARISON.cta.label}
        </PrimaryButton>
        <p className="text-[11px] text-[var(--text-muted)]">{COMPARISON.cta.subtext}</p>
      </div>
    </section>
  );
}

/* ─── Pricing ─────────────────────────────────────────────────────────────── */

function PricingSection() {
  return (
    <section id="pricing" className="bg-[var(--bg-surface)] py-28 md:py-40">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-12 text-center">
          <SectionLabel variant="warning">{PRICING.label}</SectionLabel>
          <h2 className="mb-4 text-[38px] font-extrabold leading-tight tracking-[-0.02em] text-[var(--text-primary)] md:text-[58px]">
            <span className="text-[var(--accent-primary)]">{PRICING.headlineLine1}</span>
            <br />
            {PRICING.headlineLine2}
          </h2>
          <p className="text-[17px] text-[var(--text-secondary)]">{PRICING.subheadline}</p>
        </div>

        {/* Urgency banner */}
        <div className="mx-auto mb-8 max-w-xl rounded-xl border border-[var(--accent-warning)]/20 bg-[var(--accent-warning)]/[0.06] px-5 py-4">
          <div className="flex items-start gap-3">
            <Zap className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-warning)]" />
            <div>
              <p className="text-[13px] font-semibold text-[var(--text-primary)]">{PRICING.urgencyBanner}</p>
              <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{PRICING.urgencyNote}</p>
            </div>
          </div>
        </div>

        <p className="mb-8 text-center text-[12px] text-[var(--text-muted)]">{PRICING.monthlyNote}</p>

        <div className="grid gap-5 md:grid-cols-3">
          {PRICING.plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-3xl p-7 ${
                plan.highlighted
                  ? "border-2 bg-[var(--bg-elevated)]"
                  : "border border-[var(--bg-border)] bg-[var(--bg-base)]"
              }`}
              style={
                plan.highlighted
                  ? {
                      borderColor: "var(--accent-primary)",
                      boxShadow: `0 0 48px ${O(0.12)}`,
                    }
                  : undefined
              }
            >
              {plan.badge && (
                <div
                  className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-[10px] font-bold text-white"
                  style={{ background: "var(--accent-primary)" }}
                >
                  {plan.badge}
                </div>
              )}

              <p
                className={`mb-3 text-[11px] font-bold uppercase tracking-[0.12em] ${plan.nameStyle === "accent" ? "text-[var(--accent-primary)]" : "text-[var(--text-muted)]"}`}
              >
                {plan.name}
              </p>

              <div className="mb-1 flex items-end gap-1.5">
                <span className="text-[46px] font-black leading-none text-[var(--text-primary)]">
                  {plan.price}
                </span>
                <span className="mb-1.5 text-[13px] text-[var(--text-muted)]">{plan.period}</span>
              </div>
              <p className="mb-6 text-[12px] text-[var(--text-muted)]">{plan.subPrice}</p>

              <div className="mb-7 h-px bg-[var(--bg-border)]" />

              <ul className="mb-7 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--accent-success)]" />
                    <span className="text-[13px] text-[var(--text-secondary)]">{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className="block rounded-full py-3 text-center text-[13px] font-bold transition-all"
                style={
                  plan.highlighted
                    ? { background: "var(--accent-primary)", color: "white" }
                    : { border: "1px solid var(--bg-border)", background: "var(--bg-elevated)", color: "var(--text-primary)" }
                }
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <p className="mt-7 text-center text-[12px] text-[var(--text-muted)]">{PRICING.footerNote}</p>
      </div>
    </section>
  );
}

/* ─── FAQ ─────────────────────────────────────────────────────────────────── */

function FAQSection() {
  return (
    <section id="faq" className="py-28 md:py-40">
      <div className="mx-auto max-w-2xl px-6">
        <div className="mb-12">
          <SectionLabel>{FAQ.label}</SectionLabel>
          <h2 className="text-[38px] font-extrabold tracking-[-0.02em] text-[var(--text-primary)] md:text-[50px]">
            {FAQ.headline}
          </h2>
        </div>
        <div className="divide-y divide-[var(--bg-border)]">
          {FAQ.items.map((item, i) => (
            <details key={i} className="group py-6">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
                <span className="text-[15px] font-semibold text-[var(--text-primary)]">{item.question}</span>
                <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <p className="mt-4 text-[14px] leading-relaxed text-[var(--text-secondary)]">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Final CTA ───────────────────────────────────────────────────────────── */

function FinalCTASection() {
  return (
    <section className="relative overflow-hidden bg-[var(--bg-surface)] py-40 md:py-52">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(ellipse 900px 540px at 50% 50%, ${O(0.09)}, transparent)` }}
      />
      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <h2 className="mb-8 text-[42px] font-black leading-[0.93] tracking-[-0.03em] text-[var(--text-primary)] md:text-[72px]">
          {FINAL_CTA.headlineLine1}
          <br />
          {FINAL_CTA.headlineLine2}
          <br />
          <span className="text-[var(--accent-primary)]">{FINAL_CTA.headlineAccent}</span>
          <br />
          {FINAL_CTA.headlineLine3}
        </h2>
        <div className="mx-auto mb-10 max-w-md space-y-2">
          {FINAL_CTA.body.map((line, i) => (
            <p key={i} className="text-[17px] text-[var(--text-secondary)]">{line}</p>
          ))}
        </div>
        <div className="flex flex-col items-center gap-3">
          <PrimaryButton href={FINAL_CTA.cta.href} size="lg">{FINAL_CTA.cta.label}</PrimaryButton>
          <p className="text-[11px] text-[var(--text-muted)]">{FINAL_CTA.cta.subtext}</p>
        </div>
      </div>
    </section>
  );
}

/* ─── Footer ──────────────────────────────────────────────────────────────── */

function FooterSection() {
  return (
    <footer className="border-t border-[var(--bg-border)] py-10">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <div
              className="flex h-6 w-6 items-center justify-center rounded-md"
              style={{ background: "var(--accent-primary)" }}
            >
              <Play className="h-3 w-3 fill-white text-white" />
            </div>
            <span className="text-[15px] font-semibold text-[var(--text-primary)]">{SITE.name}</span>
          </div>
          <div className="flex flex-wrap gap-5">
            {FOOTER.links.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-[12px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="mt-8 flex flex-col items-start justify-between gap-4 border-t border-[var(--bg-border)] pt-6 sm:flex-row sm:items-center">
          <p className="text-[11px] text-[var(--text-muted)]">{FOOTER.copyright}</p>
          <div className="flex flex-wrap gap-2">
            {FOOTER.platforms.map((p) => (
              <span
                key={p}
                className="rounded-full bg-[var(--bg-elevated)] px-2.5 py-1 text-[10px] text-[var(--text-muted)]"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
