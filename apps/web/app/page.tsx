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
  Lightbulb,
  Bot,
  Mic,
  Image as ImageIcon,
  Palette,
  Type,
  Rocket,
  Check,
  Activity,
  ShieldCheck,
  Sparkles,
  ZapIcon,
} from "lucide-react";
import { StickyNav } from "@/components/landing/sticky-nav";
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
} from "@/components/landing/animate";
import {
  HERO,
  SHOWCASE,
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
const O = (a: number) => `rgba(245,92,42,${a})`;

export default async function RootPage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--bg-base)] text-[var(--text-primary)] selection:bg-[var(--accent-primary)] selection:text-white">
      <StickyNav />
      <HeroSection />

      {/* Reordered Showcase right after Hero */}
      <ShowcaseSection />

      {/* <ProofStrip /> */}
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
    <FadeIn className="mb-6 flex flex-col items-center gap-3">
      <div className="flex items-center gap-2">
        <Sparkles className={`w-3 h-3 ${color}`} />
        <p
          className={`text-[12px] font-bold uppercase tracking-[0.2em] ${color}`}
        >
          {children}
        </p>
        <Sparkles className={`w-3 h-3 ${color}`} />
      </div>
      <div className="h-[2px] w-12 bg-gradient-to-r from-transparent via-[var(--accent-primary)] to-transparent" />
    </FadeIn>
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
  const sz = {
    sm: "px-5 py-2.5 text-sm",
    md: "px-7 py-3.5 text-sm",
    lg: "px-10 py-5 text-[16px]",
  };
  return (
    <Link
      href={href}
      className={`group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-[var(--accent-primary)] font-bold text-white transition-all hover:scale-105 active:scale-95 hover:shadow-[0_0_40px_${O(0.5)}] ${sz[size]} ${className}`}
    >
      <span className="relative z-10">{children}</span>
      <ArrowRight className="relative z-10 h-4 w-4 transition-transform group-hover:translate-x-1" />
      <div className="absolute inset-0 z-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
    </Link>
  );
}

/* ─── Hero ────────────────────────────────────────────────────────────────── */

function HeroSection() {
  return (
    <section className="relative flex min-h-[90vh] flex-col items-center justify-start overflow-hidden pt-32 pb-16 md:pt-40 md:pb-20">
      {/* Background elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-[600px] pointer-events-none z-0">
        <div
          className="absolute inset-0 rounded-full blur-[80px] md:blur-[120px] opacity-20"
          style={{
            background: `radial-gradient(circle, ${O(1)} 0%, transparent 70%)`,
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-6 text-center">
        <FadeIn delay={0.1}>
          <div className="mb-8 md:mb-10 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] px-5 py-2 backdrop-blur-md shadow-2xl">
            <div className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-primary)] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent-primary)]"></span>
            </div>
            <p className="text-[10px] md:text-[12px] font-bold uppercase tracking-[0.1em] text-[var(--text-primary)]">
              {HERO.eyebrow}
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={0.2}>
          <h1 className="mb-6 md:mb-8 text-[48px] sm:text-[64px] font-[900] leading-[0.95] md:leading-[0.9] tracking-[-0.04em] text-[var(--text-primary)] md:text-[100px] lg:text-[110px]">
            {HERO.headlineLine1}
            <br />
            <span className="pb-4 text-transparent bg-clip-text bg-gradient-to-b from-[var(--text-primary)] to-[var(--text-primary)]/50 relative inline-block">
              {HERO.headlineLine2}
              <svg
                aria-hidden
                className="absolute -bottom-2 md:-bottom-4 left-0 w-full opacity-40"
                height="12"
                viewBox="0 0 400 12"
                preserveAspectRatio="none"
                fill="none"
              >
                <path
                  d="M0 8 C100 2, 200 12, 400 8"
                  stroke="var(--accent-primary)"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </h1>
        </FadeIn>

        <FadeIn delay={0.3}>
          <p className="mx-auto mb-10 md:mb-12 max-w-[640px] text-[16px] md:text-[21px] leading-[1.6] text-[var(--text-secondary)]">
            {HERO.subheadline}
          </p>
        </FadeIn>

        <FadeIn delay={0.4}>
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
            <div className="flex w-full flex-col items-center gap-3 sm:w-auto">
              <PrimaryButton
                href={HERO.primaryCta.href}
                size="lg"
                className="w-full sm:w-auto justify-center"
              >
                {HERO.primaryCta.label}
              </PrimaryButton>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] border border-white/5">
                <ShieldCheck className="w-3.5 h-3.5 text-[var(--accent-success)]" />
                <p className="text-[11px] md:text-[12px] text-[var(--text-muted)] font-medium">
                  {HERO.primaryCta.subtext}
                </p>
              </div>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.5}>
          <div className="mt-8 flex flex-col items-center gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-4 px-4 py-3 md:px-6 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-sm">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-8 w-8 md:h-9 md:w-9 rounded-full border-2 border-[var(--bg-base)] bg-[var(--bg-elevated)] overflow-hidden"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 10}`}
                      alt="user"
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
              <div className="hidden sm:block h-8 w-px bg-white/10" />
              <div className="text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-1 text-[var(--accent-warning)]">
                  <Star className="h-3 w-3 md:h-3.5 md:w-3.5 fill-current" />
                  <Star className="h-3 w-3 md:h-3.5 md:w-3.5 fill-current" />
                  <Star className="h-3 w-3 md:h-3.5 md:w-3.5 fill-current" />
                  <Star className="h-3 w-3 md:h-3.5 md:w-3.5 fill-current" />
                  <Star className="h-3 w-3 md:h-3.5 md:w-3.5 fill-current" />
                  <span className="ml-1 text-[12px] md:text-[13px] font-black text-[var(--text-primary)]">
                    5.0
                  </span>
                </div>
                <p className="text-[11px] md:text-[12px] text-[var(--text-secondary)] font-medium">
                  {HERO.proof.text}
                </p>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

/* ─── Video Showcase ──────────────────────────────────────────────────────── */

function ShowcaseSection() {
  const repeatedVideos = [...SHOWCASE.videos, ...SHOWCASE.videos];

  return (
    <section
      id="showcase"
      className="pb-20 pt-10 md:pb-32 md:pt-16 overflow-hidden bg-gradient-to-b from-[var(--bg-base)] via-[var(--bg-surface)] to-[var(--bg-base)]"
    >
      <div className="mx-auto max-w-6xl px-6">
        <FadeIn className="mb-16 md:mb-20 text-center">
          <SectionLabel variant="accent">{SHOWCASE.label}</SectionLabel>
          <h2 className="mb-6 whitespace-pre-line text-[32px] sm:text-[42px] font-[900] leading-tight tracking-tight text-[var(--text-primary)] md:text-[64px]">
            {SHOWCASE.headline}
          </h2>
          <p className="mx-auto max-w-xl text-[16px] md:text-[18px] text-[var(--text-secondary)] leading-relaxed">
            {SHOWCASE.subheadline}
          </p>
        </FadeIn>
      </div>

      {/* Infinite Auto-scrolling Marquee */}
      <div className="relative w-full overflow-hidden py-4 md:py-8">
        <div className="absolute left-0 top-0 bottom-0 z-10 w-12 md:w-64 bg-gradient-to-r from-[var(--bg-base)] to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 z-10 w-12 md:w-64 bg-gradient-to-l from-[var(--bg-base)] to-transparent pointer-events-none" />

        <div className="flex w-max animate-scroll items-end justify-center gap-6 md:gap-12 px-4 md:px-10 hover:[animation-play-state:paused]">
          {repeatedVideos.map((v, i) => {
            // Organic vertical offsets
            const offsets = [
              0, -60, -20, -100, -10, -50, -30, -80, -15, -70, -40, -90,
            ];
            return (
              <div
                key={i}
                className="shrink-0 transition-transform duration-500"
                style={{
                  marginBottom: `${Math.abs(offsets[i % offsets.length] ?? 0)}px`,
                }}
              >
                <PhoneFrame video={v} />
              </div>
            );
          })}
        </div>
      </div>

      <FadeIn delay={0.2} className="mt-8 text-center px-6">
        <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/[0.03] border border-white/10 backdrop-blur-md">
          <div className="flex -space-x-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-5 h-5 md:w-6 md:h-6 rounded-full border border-[var(--bg-base)] bg-[var(--accent-primary)] flex items-center justify-center"
              >
                <Play className="w-1.5 h-1.5 md:w-2 md:h-2 fill-white text-white" />
              </div>
            ))}
          </div>
          <p className="text-[12px] md:text-[13px] font-bold text-[var(--text-primary)] tracking-wide">
            Hover to pause and explore {SHOWCASE.videos.length}+ viral templates
          </p>
        </div>
      </FadeIn>
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
    <div className="group relative w-[230px] sm:w-[260px] md:w-[300px]">
      {/* Dynamic Glow */}
      <div
        className="absolute inset-0 -z-10 rounded-[3rem] blur-3xl opacity-0 group-hover:opacity-40 transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle, ${video.accentColor} 0%, transparent 70%)`,
        }}
      />

      {/* Phone body */}
      <div className="relative overflow-hidden rounded-[2.5rem] md:rounded-[3rem] border-[6px] md:border-[8px] border-[#18181b] bg-[#09090b] shadow-[0_30px_80px_rgba(0,0,0,0.8)] md:shadow-[0_40px_100px_rgba(0,0,0,0.8)] transition-all duration-500 group-hover:-translate-y-4 group-hover:scale-[1.02] group-hover:shadow-[0_60px_120px_rgba(0,0,0,0.9)] group-hover:border-[#27272a]">
        {/* Notch */}
        <div className="relative z-10 flex justify-center pt-2 md:pt-3 pb-2 md:pb-2.5">
          <div className="h-1 md:h-1.5 w-12 md:w-16 rounded-full bg-[#27272a] group-hover:bg-[#3f3f46] transition-colors" />
        </div>

        {/* Screen */}
        <div
          className="relative mx-1 mb-1 md:mx-1.5 md:mb-1.5 overflow-hidden rounded-[2rem] md:rounded-[2.2rem] h-[400px] sm:h-[460px] md:h-[520px]"
          style={{
            background: `linear-gradient(160deg, ${video.gradientFrom}, ${video.gradientTo})`,
          }}
        >
          {/* Video or texture fallback */}
          {video.videoUrl ? (
            <video
              src={video.videoUrl}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 opacity-10 mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
          )}

          {/* Style badge */}
          <div
            className="absolute left-3 top-3 md:left-4 md:top-4 z-20 rounded-full px-2.5 py-0.5 md:px-3 md:py-1 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-white shadow-xl backdrop-blur-xl border border-white/10"
            style={{ background: video.accentColor + "aa" }}
          >
            {video.style}
          </div>

          {/* Subtitle bar */}
          <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black via-black/60 to-transparent px-4 md:px-6 pb-6 md:pb-8 pt-16 md:pt-20">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="flex items-center gap-1.5 md:gap-2">
                <div
                  className="w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center"
                  style={{ background: dotColor }}
                >
                  <Play className="w-1.5 h-1.5 md:w-2 md:h-2 fill-white text-white translate-x-0.25" />
                </div>
                <span className="text-[9px] md:text-[10px] font-black uppercase text-white/60 tracking-tighter">
                  {video.platform}
                </span>
              </div>
              <div className="flex items-center gap-1 md:gap-1.5 text-[10px] md:text-[11px] font-black text-white/90">
                <Activity className="h-3 md:h-3.5 w-3 md:w-3.5 text-[var(--accent-success)]" />
                {video.views}
              </div>
            </div>
            <div className="h-px w-full bg-white/10 mb-3 md:mb-4" />
            <div className="text-center">
              <span
                className="rounded-lg px-3 py-1 md:px-4 md:py-1.5 text-[10px] md:text-[11px] font-black uppercase tracking-wider text-white shadow-2xl backdrop-blur-md border border-white/10"
                style={{ background: video.accentColor + "30" }}
              >
                {video.niche}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Problem ─────────────────────────────────────────────────────────────── */

function ProblemSection() {
  const icons = {
    clock: Clock,
    "trending-down": TrendingDown,
    flame: Flame,
  } as const;
  const colors = {
    clock: "var(--accent-danger)",
    "trending-down": "var(--accent-warning)",
    flame: "var(--accent-primary)",
  } as const;

  return (
    <section className="mx-auto max-w-6xl px-6 pb-16 md:pb-24">
      <div className="text-center mb-12 md:mb-20">
        <SectionLabel>{PROBLEM.label}</SectionLabel>
        <FadeIn>
          <h2 className="mb-6 md:mb-8 text-[32px] sm:text-[42px] font-[900] leading-[1.1] md:leading-[1] tracking-[-0.03em] text-[var(--text-primary)] md:text-[72px]">
            {PROBLEM.headlineLine1}
            <br />
            {PROBLEM.headlineLine2}{" "}
            <span className="text-[var(--accent-danger)] relative inline-block">
              {PROBLEM.headlineAccent}
              <svg
                className="absolute -bottom-1 md:-bottom-2 left-0 w-full h-2 md:h-3 text-[var(--accent-danger)]/20"
                viewBox="0 0 100 10"
                preserveAspectRatio="none"
              >
                <path
                  d="M0 5 Q 50 10 100 5"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="transparent"
                />
              </svg>
            </span>
          </h2>
        </FadeIn>
        <FadeIn delay={0.2}>
          <div className="mx-auto max-w-[620px] space-y-4">
            {PROBLEM.body.map((p, i) => (
              <p
                key={i}
                className="text-[16px] md:text-[20px] leading-relaxed text-[var(--text-secondary)]"
              >
                {p
                  .split(/(2–4 hours|5 videos a day|10–20 hours)/)
                  .map((part, j) =>
                    ["2–4 hours", "5 videos a day", "10–20 hours"].includes(
                      part,
                    ) ? (
                      <span
                        key={j}
                        className="font-black text-[var(--text-primary)] border-b-2 border-[var(--accent-danger)]/30 px-0.5"
                      >
                        {part}
                      </span>
                    ) : (
                      part
                    ),
                  )}
              </p>
            ))}
          </div>
        </FadeIn>
      </div>

      <StaggerContainer
        delay={0.4}
        className="grid gap-4 md:gap-6 md:grid-cols-3"
      >
        {PROBLEM.cards.map((card) => {
          const k = card.iconKey as keyof typeof icons;
          const Icon = icons[k];
          return (
            <StaggerItem key={card.title}>
              <div className="group h-full relative rounded-[1.5rem] md:rounded-[2rem] border border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent p-6 md:p-10 transition-all hover:-translate-y-1 hover:border-white/10 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] overflow-hidden">
                <div
                  className="absolute -top-10 -left-10 w-40 h-40 opacity-0 group-hover:opacity-10 transition-opacity duration-500 rounded-full blur-3xl"
                  style={{ background: colors[k] }}
                />
                <div className="mb-5 md:mb-6 inline-flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-[0.8rem] md:rounded-[1rem] bg-white/[0.03] border border-white/5 shadow-2xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                  <Icon
                    className="h-6 w-6 md:h-7 md:w-7"
                    style={{ color: colors[k] }}
                  />
                </div>
                <h3 className="mb-2 md:mb-3 text-[18px] md:text-[20px] font-black text-[var(--text-primary)] leading-tight">
                  {card.title}
                </h3>
                <p className="text-[14px] md:text-[15px] leading-relaxed text-[var(--text-secondary)] font-medium">
                  {card.body}
                </p>
              </div>
            </StaggerItem>
          );
        })}
      </StaggerContainer>
    </section>
  );
}

/* ─── Solution Reveal ─────────────────────────────────────────────────────── */

function SolutionReveal() {
  return (
    <section className="relative overflow-hidden bg-[var(--bg-surface)] py-16 md:py-32 border-y border-white/5">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${O(0.1)} 0%, transparent 60%)`,
        }}
      />
      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
        <FadeIn>
          <div className="flex justify-center mb-8">
            <div className="relative h-14 w-14 md:h-16 md:w-16">
              <div className="absolute inset-0 bg-[var(--accent-primary)]/20 rounded-full animate-ping blur-xl" />
              <div className="relative h-14 w-14 md:h-16 md:w-16 bg-gradient-to-tr from-[var(--accent-primary)] to-[var(--accent-secondary)] rounded-xl md:rounded-2xl flex items-center justify-center shadow-2xl border-2 border-[var(--bg-base)]">
                <Bot className="h-7 w-7 md:h-8 md:w-8 text-white" />
              </div>
            </div>
          </div>
          <h2 className="mb-6 md:mb-8 text-[32px] sm:text-[42px] md:text-[72px] font-[900] leading-[1.1] md:leading-[1] tracking-[-0.03em] text-[var(--text-primary)]">
            {SOLUTION.headlineLine1}
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]">
              {SOLUTION.headlineLine2}
            </span>
          </h2>
        </FadeIn>

        <FadeIn delay={0.2}>
          <div className="mx-auto mb-10 md:mb-12 max-w-2xl space-y-6">
            {SOLUTION.body.map((p, i) => (
              <p
                key={i}
                className="text-[16px] md:text-[20px] font-medium leading-relaxed text-[var(--text-secondary)]"
              >
                {p}
              </p>
            ))}
            <div className="inline-flex items-center gap-2 md:gap-3 px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl bg-[var(--bg-base)] border border-white/10 shadow-2xl group cursor-default">
              <ZapIcon className="w-4 h-4 md:w-5 md:h-5 text-[var(--accent-primary)] group-hover:animate-pulse" />
              <p className="text-[16px] md:text-[20px] font-black text-[var(--text-primary)] tracking-tight">
                {SOLUTION.closer}
              </p>
            </div>
          </div>
        </FadeIn>

        {/* Improved Pipeline nodes */}
        <FadeIn delay={0.4}>
          <div className="mb-10 md:mb-12 grid grid-cols-2 sm:flex sm:flex-wrap justify-center gap-3">
            {SOLUTION.pipelineNodes.map((node, i) => {
              const nodeIcons = [Lightbulb, PenLine, Mic, ImageIcon, Rocket];
              const NodeIcon = nodeIcons[i] || CheckCircle;
              const isLast = node === "Finished Video";

              return (
                <div key={node} className="flex items-center group">
                  <div
                    className={`flex flex-1 flex-col items-center gap-2 px-3 py-4 md:px-5 md:py-5 rounded-xl md:rounded-2xl border border-white/5 bg-white/[0.02] min-w-[100px] md:min-w-[120px] transition-all hover:bg-white/[0.05] hover:border-white/10 hover:-translate-y-1 ${isLast ? "border-[var(--accent-success)]/40 bg-[var(--accent-success)]/[0.03]" : ""}`}
                  >
                    <div
                      className={`flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-lg md:rounded-xl bg-[var(--bg-base)] border border-white/5 shadow-xl ${isLast ? "text-[var(--accent-success)] shadow-[0_0_20px_rgba(52,211,153,0.2)]" : "text-[var(--accent-primary)]"}`}
                    >
                      <NodeIcon className="w-4 h-4 md:w-5 md:h-5" />
                    </div>
                    <span
                      className={`text-[10px] md:text-[12px] font-black uppercase tracking-tighter ${isLast ? "text-[var(--accent-success)]" : "text-[var(--text-secondary)]"}`}
                    >
                      {node}
                    </span>
                  </div>
                  {i < SOLUTION.pipelineNodes.length - 1 && (
                    <div className="hidden items-center md:flex px-1">
                      <ArrowRight className="w-4 h-4 text-white/10 group-hover:text-[var(--accent-primary)]/40 transition-colors translate-y-[-10px]" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <PrimaryButton href={SOLUTION.inlineCta.href} size="md">
            Explore the pipeline
          </PrimaryButton>
        </FadeIn>
      </div>
    </section>
  );
}

/* ─── Pipeline ────────────────────────────────────────────────────────────── */

function PipelineSection() {
  const stepIcons = [Lightbulb, Bot, Mic, ImageIcon, Palette, Type, Rocket];

  return (
    <section id="pipeline" className="mx-auto max-w-6xl px-6 py-20 md:py-32">
      <FadeIn className="mb-16 md:mb-20 text-center">
        <SectionLabel variant="accent">{PIPELINE.label}</SectionLabel>
        <h2 className="mb-6 text-[36px] sm:text-[46px] md:text-[72px] font-[900] leading-[1.1] md:leading-[1] tracking-[-0.03em] text-[var(--text-primary)]">
          {PIPELINE.headlineLine1}
          <br />
          <span className="text-[var(--accent-primary)]">
            {PIPELINE.headlineLine2}
          </span>
        </h2>
        <p className="text-[17px] md:text-[19px] font-medium text-[var(--text-secondary)] max-w-2xl mx-auto">
          {PIPELINE.subheadline}
        </p>
      </FadeIn>

      <div className="relative">
        {/* Modern Timeline Track */}
        <div
          aria-hidden
          className="absolute inset-y-4 left-[30px] md:left-1/2 w-[2px] -translate-x-1/2"
          style={{
            background: `linear-gradient(to bottom, transparent, ${O(0.3)} 15%, ${O(0.3)} 85%, transparent)`,
          }}
        />

        <div className="space-y-12 md:space-y-24">
          {PIPELINE.steps.map((step, i) => {
            const even = i % 2 === 1;
            const Icon = stepIcons[i] || CheckCircle;

            return (
              <FadeIn
                key={step.num}
                className={`flex flex-row items-start md:items-center gap-8 md:gap-0 ${even ? "md:flex-row-reverse" : ""}`}
              >
                {/* Visual Content */}
                <div
                  className={`flex-1 md:max-w-[calc(50%-70px)] ${even ? "md:pl-16" : "md:pr-16"}`}
                >
                  <div className="group relative rounded-[1.5rem] md:rounded-[2rem] border border-white/5 bg-gradient-to-br from-white/[0.04] to-transparent p-6 md:p-10 shadow-2xl transition-all hover:border-[var(--accent-primary)]/40 hover:bg-white/[0.06] hover:-translate-y-1 overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent-primary)]/5 blur-3xl rounded-full -mr-10 -mt-10 group-hover:bg-[var(--accent-primary)]/10 transition-colors" />

                    <div className="flex items-center gap-4 mb-5 md:mb-6">
                      <div className="flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-xl bg-[var(--bg-base)] border border-white/10 shadow-inner group-hover:scale-110 transition-transform duration-500">
                        <Icon className="h-6 w-6 md:h-7 md:w-7 text-[var(--accent-primary)]" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-[var(--accent-primary)] mb-1">
                          Step {step.num}
                        </span>
                        <h3 className="text-[18px] md:text-[22px] font-black text-[var(--text-primary)] leading-tight tracking-tight">
                          {step.title}
                        </h3>
                      </div>
                    </div>

                    <p className="mb-5 md:mb-6 text-[14px] md:text-[16px] leading-relaxed text-[var(--text-secondary)] font-medium">
                      {step.body}
                    </p>

                    {step.pill && (
                      <div
                        className={`inline-flex items-center gap-2.5 rounded-xl px-3.5 py-1.5 md:px-4 md:py-2 text-[10px] md:text-[11px] font-black uppercase tracking-wider ${
                          step.pillVariant === "success"
                            ? "border border-[var(--accent-success)]/30 bg-[var(--accent-success)]/5 text-[var(--accent-success)]"
                            : `border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/5 text-[var(--accent-primary)]`
                        }`}
                      >
                        <Zap className="w-3 h-3 md:w-3.5 md:h-3.5" />
                        {step.pill}
                      </div>
                    )}
                  </div>
                </div>

                {/* Vertical Step Number */}
                <div className="shrink-0 flex items-center justify-center w-[60px] md:w-[140px] relative z-10 order-first md:order-none">
                  <div
                    className="flex h-10 w-10 md:h-16 md:w-16 items-center justify-center rounded-lg md:rounded-2xl border-[2px] md:border-[3px] bg-[#0c0c0e] text-[16px] md:text-[20px] font-[900] text-[var(--text-primary)] shadow-[0_0_20px_rgba(0,0,0,0.8)] transition-all duration-500 hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] hover:scale-110"
                    style={{ borderColor: "var(--bg-border)" }}
                  >
                    {step.num}
                  </div>
                </div>

                {/* Spacer */}
                <div className="hidden md:block md:flex-1" />
              </FadeIn>
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
  warning:
    "border-[var(--accent-warning)]/25 bg-[var(--accent-warning)]/10 text-[var(--accent-warning)]",
  primary: `border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]`,
  muted: "border-white/10 bg-white/5 text-[var(--text-muted)]",
  secondary:
    "border-[var(--accent-secondary)]/25 bg-[var(--accent-secondary)]/10 text-[var(--accent-secondary)]",
} as const;

function StyleCard({ style }: { style: (typeof STYLES.visualStyles)[number] }) {
  const Icon = STYLE_ICONS[style.iconKey as keyof typeof STYLE_ICONS];
  return (
    <StaggerItem>
      <div className="group h-full flex flex-col rounded-[2rem] border border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent p-7 transition-all duration-500 hover:-translate-y-2 hover:border-white/10 hover:bg-white/[0.05] hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
        <div
          className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl shadow-2xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 border border-white/5"
          style={{ background: style.iconBg }}
        >
          <Icon className="h-7 w-7" style={{ color: style.iconColor }} />
        </div>
        <h3 className="mb-2 text-[19px] font-[900] text-[var(--text-primary)] tracking-tight">
          {style.name}
        </h3>
        <p className="mb-3 text-[10px] font-black tracking-[0.1em] uppercase text-[var(--accent-primary)]/80">
          {style.mood}
        </p>
        <p className="text-[14px] leading-relaxed text-[var(--text-secondary)] font-medium flex-1">
          {style.description}
        </p>
      </div>
    </StaggerItem>
  );
}

function StylesSection() {
  return (
    <section
      id="styles"
      className="bg-[var(--bg-surface)] py-20 md:py-32 relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-full h-[400px] bg-gradient-to-b from-[var(--bg-base)] to-transparent pointer-events-none opacity-50" />

      <div className="mx-auto max-w-6xl px-6 relative z-10">
        <FadeIn className="mb-16 md:mb-20 text-center">
          <SectionLabel>{STYLES.label}</SectionLabel>
          <h2 className="text-[32px] sm:text-[42px] md:text-[72px] font-[900] leading-[1.1] md:leading-[1] tracking-[-0.03em] text-[var(--text-primary)]">
            {STYLES.headlineLine1}
            <br />
            {STYLES.headlineLine2}
            <br />
            <span className="text-[var(--accent-primary)] relative inline-block">
              {STYLES.headlineAccent}
              <svg
                className="absolute -bottom-1 md:-bottom-2 left-0 w-full h-2 md:h-3 text-[var(--accent-primary)]/20"
                viewBox="0 0 100 10"
                preserveAspectRatio="none"
              >
                <path
                  d="M0 5 Q 50 10 100 5"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="transparent"
                />
              </svg>
            </span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-[17px] md:text-[19px] font-medium text-[var(--text-secondary)]">
            {STYLES.subheadline}
          </p>
        </FadeIn>

        <StaggerContainer className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STYLES.visualStyles.slice(0, 4).map((s) => (
            <StyleCard key={s.name} style={s} />
          ))}
        </StaggerContainer>
        <StaggerContainer
          delay={0.2}
          className="mt-4 md:mt-6 grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {STYLES.visualStyles.slice(4).map((s) => (
            <StyleCard key={s.name} style={s} />
          ))}
        </StaggerContainer>

        {/* Subtitle styles */}
        <div className="mt-16 md:mt-24 border-t border-white/5 pt-16 md:pt-24">
          <FadeIn className="mb-12 md:mb-16 text-center">
            <div className="inline-flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-xl bg-white/[0.03] border border-white/5 mb-6 text-[var(--text-muted)]">
              <Type className="h-6 w-6 md:h-7 md:w-7" />
            </div>
            <h3 className="mb-4 text-[28px] sm:text-[36px] md:text-[48px] font-[900] text-[var(--text-primary)] tracking-tight leading-tight">
              Then choose how your words land.
            </h3>
            <p className="mx-auto max-w-2xl text-[16px] md:text-[17px] font-medium text-[var(--text-secondary)] leading-relaxed">
              85% of short-form video is watched on mute. Subtitles aren&apos;t
              decoration — they&apos;re your voice.
            </p>
          </FadeIn>

          <StaggerContainer className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STYLES.subtitleStyles.map((s) => (
              <StaggerItem key={s.name}>
                <div className="group h-full flex flex-col overflow-hidden rounded-[1.5rem] md:rounded-[2rem] border border-white/5 bg-[var(--bg-elevated)] transition-all hover:border-white/10 hover:shadow-2xl hover:-translate-y-1">
                  <SubtitlePreview name={s.name} />
                  <div className="p-6 md:p-7 flex-1 flex flex-col">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <h4 className="text-[16px] md:text-[17px] font-black text-[var(--text-primary)] tracking-tight">
                        {s.name}
                      </h4>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[8px] md:text-[9px] font-black uppercase tracking-wider ${BADGE_CLS[s.badgeVariant as keyof typeof BADGE_CLS]}`}
                      >
                        {s.badge}
                      </span>
                    </div>
                    <p className="text-[13px] md:text-[14px] leading-relaxed text-[var(--text-secondary)] font-medium">
                      {s.description}
                    </p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </div>
    </section>
  );
}

function SubtitlePreview({ name }: { name: string }) {
  const map: Record<string, React.ReactNode> = {
    "Bold Pop": (
      <div className="flex h-40 items-center justify-center bg-[#09090b] px-3 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-orange-900/30 to-orange-600/20 opacity-40" />
        <p className="relative text-[22px] font-[1000] text-white drop-shadow-[0_8px_24px_rgba(0,0,0,1)] scale-110 group-hover:scale-125 transition-transform duration-700">
          SAVE{" "}
          <span className="rounded-lg bg-[var(--accent-warning)] px-2.5 py-0.5 text-black shadow-2xl">
            YOUR
          </span>{" "}
          MONEY
        </p>
      </div>
    ),
    "Word Highlight": (
      <div className="flex h-40 items-center justify-center gap-2 bg-[#09090b] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/30 to-teal-900/30 opacity-40" />
        <div className="relative flex items-end gap-2 group-hover:-translate-y-2 transition-transform duration-700">
          <span className="text-base font-bold text-white/20">Your</span>
          <span className="text-lg font-bold text-white/40">Future</span>
          <span className="text-2xl font-[1000] text-[var(--accent-primary)] drop-shadow-[0_4px_16px_rgba(245,92,42,0.6)]">
            Starts
          </span>
        </div>
      </div>
    ),
    Minimal: (
      <div className="relative flex h-40 items-end bg-[#09090b] pb-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-gray-900/40 to-slate-800/40 opacity-40" />
        <p className="relative w-full text-center text-[13px] font-bold text-white/70 group-hover:text-white transition-colors tracking-wide px-6">
          &quot;Building a brand that lasts a lifetime.&quot;
        </p>
      </div>
    ),
    Cinematic: (
      <div className="relative flex h-40 items-end bg-[#09090b] overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=800&auto=format&fit=crop')] bg-cover bg-center opacity-40 group-hover:scale-110 transition-transform duration-1000" />
        <div className="relative w-full bg-black/80 py-3 px-6 backdrop-blur-xl group-hover:bg-black/95 transition-colors border-t border-white/10">
          <p className="text-center text-[12px] font-serif tracking-[0.25em] text-white uppercase font-light">
            Everything changes tonight.
          </p>
        </div>
      </div>
    ),
  };
  return <div className="border-b border-white/5">{map[name] ?? null}</div>;
}

/* ─── Before / After ─────────────────────────────────────────────────────── */

function BeforeAfterSection() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20 md:py-32">
      <FadeIn>
        <div className="overflow-hidden rounded-[2rem] md:rounded-[2.5rem] border border-white/5 bg-[#0c0c0e] shadow-[0_40px_80px_rgba(0,0,0,0.5)]">
          <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/5">
            {/* Without */}
            <div className="p-6 md:p-12 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-[var(--accent-danger)]/20" />
              <div className="mb-8 md:mb-10 flex items-center gap-4">
                <div className="flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-xl bg-[var(--accent-danger)]/10 border border-[var(--accent-danger)]/20 text-[var(--accent-danger)]">
                  <XCircle className="h-4 w-4 md:h-5 md:w-5" />
                </div>
                <p className="text-[12px] md:text-[13px] font-[1000] uppercase tracking-[0.2em] text-[var(--accent-danger)] opacity-80">
                  {COMPARISON.withoutLabel}
                </p>
              </div>
              <div className="space-y-4 md:space-y-5">
                {COMPARISON.without.map((item) => (
                  <div key={item} className="flex items-start gap-3 group/item">
                    <div className="mt-1.5 h-1 w-1 rounded-full bg-[var(--accent-danger)]/30 group-hover/item:bg-[var(--accent-danger)] transition-colors" />
                    <span className="text-[14px] md:text-[15px] font-medium text-[var(--text-secondary)] opacity-60 leading-tight">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* With */}
            <div className="relative p-6 md:p-12 overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-[var(--accent-success)]/40" />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity duration-700"
                style={{
                  background: `radial-gradient(circle at 70% 30%, ${O(0.2)}, transparent 70%)`,
                }}
              />

              <div className="mb-8 md:mb-10 flex items-center gap-4 relative z-10">
                <div className="flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-xl bg-[var(--accent-success)]/10 border border-[var(--accent-success)]/20 text-[var(--accent-success)] shadow-[0_0_20px_rgba(52,211,153,0.2)]">
                  <CheckCircle className="h-4 w-4 md:h-5 md:w-5" />
                </div>
                <p className="text-[12px] md:text-[13px] font-[1000] uppercase tracking-[0.2em] text-[var(--accent-success)]">
                  {COMPARISON.withLabel}
                </p>
              </div>

              <div className="space-y-4 md:space-y-5 relative z-10">
                {COMPARISON.with.map((item) => (
                  <div key={item} className="flex items-start gap-3 group/item">
                    <div className="mt-0.5 h-4 w-4 flex items-center justify-center rounded-full bg-[var(--accent-success)]/10 text-[var(--accent-success)] group-hover/item:scale-125 transition-transform">
                      <Check className="w-2 md:w-2.5 h-2 md:h-2.5 stroke-[4px]" />
                    </div>
                    <span className="text-[14px] md:text-[15px] font-black text-[var(--text-primary)] leading-tight tracking-tight">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </FadeIn>

      <FadeIn
        delay={0.2}
        className="mt-12 md:mt-16 flex flex-col items-center gap-5 text-center"
      >
        <h3 className="text-[28px] sm:text-[36px] md:text-[48px] font-[900] text-[var(--text-primary)] tracking-tight leading-tight">
          {COMPARISON.cta.headline}
        </h3>
        <PrimaryButton href={COMPARISON.cta.href} size="lg">
          {COMPARISON.cta.label}
        </PrimaryButton>
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/5">
          <Check className="w-3.5 h-3.5 text-[var(--accent-success)] stroke-[3px]" />
          <p className="text-[11px] md:text-[12px] font-black uppercase tracking-wider text-[var(--text-muted)]">
            {COMPARISON.cta.subtext}
          </p>
        </div>
      </FadeIn>
    </section>
  );
}

/* ─── Pricing ─────────────────────────────────────────────────────────────── */

function PricingSection() {
  return (
    <section
      id="pricing"
      className="bg-[#09090b] py-20 md:py-32 border-y border-white/5 relative"
    >
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-px bg-gradient-to-r from-transparent via-[var(--accent-primary)]/30 to-transparent" />

      <div className="mx-auto max-w-6xl px-6 relative z-10">
        <FadeIn className="mb-12 md:mb-16 text-center">
          <SectionLabel variant="warning">{PRICING.label}</SectionLabel>
          <h2 className="mb-5 text-[36px] sm:text-[46px] font-[1000] leading-none tracking-[-0.04em] text-[var(--text-primary)] md:text-[80px]">
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-[var(--accent-primary)] to-[var(--accent-primary)]/60">
              {PRICING.headlineLine1}
            </span>
            <br />
            {PRICING.headlineLine2}
          </h2>
          <p className="text-[17px] md:text-[19px] font-medium text-[var(--text-secondary)] max-w-xl mx-auto">
            {PRICING.subheadline}
          </p>
        </FadeIn>

        {/* Improved Urgency banner */}
        <FadeIn
          delay={0.2}
          className="mx-auto mb-10 md:mb-12 max-w-2xl overflow-hidden rounded-2xl border border-[var(--accent-warning)]/40 bg-gradient-to-r from-[#1c1c1a] via-[#2d2d14] to-[#1c1c1a] px-5 py-4 md:px-6 md:py-5 shadow-2xl relative group"
        >
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--accent-warning)] shadow-[0_0_20px_rgba(251,191,36,0.5)]" />
          <div className="flex items-center gap-4 md:gap-5">
            <div className="rounded-xl bg-[var(--accent-warning)]/20 p-2 md:p-2.5 shrink-0 shadow-inner group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
              <Zap className="h-5 w-5 md:h-6 md:w-6 text-[var(--accent-warning)] fill-current" />
            </div>
            <div>
              <p className="text-[14px] md:text-[16px] font-[900] text-[var(--text-primary)] tracking-tight">
                {PRICING.urgencyBanner}
              </p>
              <p className="mt-0.5 text-[10px] md:text-[12px] font-bold text-[var(--accent-warning)] opacity-80 uppercase tracking-widest">
                {PRICING.urgencyNote}
              </p>
            </div>
          </div>
        </FadeIn>

        <StaggerContainer
          delay={0.3}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 items-stretch"
        >
          {PRICING.plans.map((plan) => (
            <StaggerItem key={plan.name} className="h-full">
              <div
                className={`relative h-full flex flex-col rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 transition-all duration-500 hover:-translate-y-1 ${
                  plan.highlighted
                    ? "border-[2px] bg-gradient-to-b from-[var(--bg-elevated)] to-[#09090b] md:scale-[1.02] z-10 md:shadow-[0_30px_60px_rgba(245,92,42,0.1)]"
                    : "border border-white/10 bg-[#0c0c0e] hover:bg-white/[0.04]"
                }`}
                style={
                  plan.highlighted
                    ? { borderColor: "var(--accent-primary)" }
                    : undefined
                }
              >
                {plan.badge && (
                  <div
                    className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full px-4 py-1.5 text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] text-white shadow-2xl"
                    style={{ background: "var(--accent-primary)" }}
                  >
                    {plan.badge}
                  </div>
                )}

                <p
                  className={`mb-4 md:mb-5 text-[11px] md:text-[12px] font-[1000] uppercase tracking-[0.2em] ${plan.nameStyle === "accent" ? "text-[var(--accent-primary)]" : "text-[var(--text-muted)]"}`}
                >
                  {plan.name}
                </p>

                <div className="mb-1 flex items-end gap-2">
                  <span className="text-[44px] md:text-[54px] font-[1000] leading-none text-[var(--text-primary)] tracking-tighter">
                    {plan.price}
                  </span>
                  <span className="mb-1.5 md:mb-2 text-[12px] md:text-[14px] font-bold text-[var(--text-muted)]">
                    {plan.period}
                  </span>
                </div>
                <p className="mb-6 md:mb-8 text-[12px] md:text-[13px] font-bold text-[var(--text-muted)] h-5">
                  {plan.subPrice}
                </p>

                <div className="mb-6 md:mb-8 h-px bg-white/5" />

                <ul className="mb-8 md:mb-10 flex-1 space-y-3 md:space-y-4">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 group/feat">
                      <div className="mt-1 h-3.5 w-3.5 md:h-4 md:w-4 flex items-center justify-center rounded-full bg-[var(--accent-success)]/10 text-[var(--accent-success)] group-hover/feat:scale-125 transition-transform">
                        <Check className="w-2 md:w-2.5 h-2 md:h-2.5 stroke-[3px]" />
                      </div>
                      <span className="text-[13px] md:text-[14px] font-black text-[var(--text-secondary)] tracking-tight group-hover/feat:text-[var(--text-primary)] transition-colors">
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.href}
                  className={`block rounded-xl md:rounded-2xl py-3.5 md:py-4 text-center text-[12px] md:text-[14px] font-[1000] uppercase tracking-[0.1em] transition-all shadow-xl hover:shadow-2xl ${
                    plan.highlighted
                      ? "bg-[var(--accent-primary)] text-white hover:brightness-110"
                      : "bg-white/[0.03] border border-white/10 text-white hover:bg-white/[0.08]"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        <p className="mt-10 md:mt-12 text-center text-[12px] md:text-[13px] font-black text-[var(--text-muted)] flex items-center justify-center gap-2.5 uppercase tracking-widest opacity-60">
          <Film className="w-4 h-4 text-[var(--accent-primary)]" />{" "}
          {PRICING.footerNote}
        </p>
      </div>
    </section>
  );
}

/* ─── FAQ ─────────────────────────────────────────────────────────────────── */

function FAQSection() {
  return (
    <section id="faq" className="py-20 md:py-32">
      <div className="mx-auto max-w-4xl px-6">
        <FadeIn className="mb-12 md:mb-16 text-center">
          <SectionLabel>{FAQ.label}</SectionLabel>
          <h2 className="text-[32px] sm:text-[40px] md:text-[64px] font-[900] tracking-[-0.03em] text-[var(--text-primary)]">
            {FAQ.headline}
          </h2>
        </FadeIn>

        <StaggerContainer className="space-y-4">
          {FAQ.items.map((item, i) => (
            <StaggerItem key={i}>
              <details className="group rounded-xl md:rounded-2xl border border-white/5 bg-white/[0.01] transition-all hover:border-white/10 hover:bg-white/[0.03]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 md:p-8 focus:outline-none">
                  <span className="text-[15px] md:text-[19px] font-black text-[var(--text-primary)] tracking-tight leading-tight">
                    {item.question}
                  </span>
                  <div className="flex h-9 w-9 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-lg md:rounded-xl border border-white/5 bg-[#09090b] group-open:bg-[var(--accent-primary)] group-open:border-[var(--accent-primary)] transition-all duration-500 shadow-xl">
                    <ChevronDown className="h-4 w-4 md:h-5 md:w-5 text-[var(--text-muted)] group-open:text-white transition-transform duration-500 group-open:rotate-180" />
                  </div>
                </summary>
                <div className="px-5 pb-5 md:px-8 md:pb-8">
                  <div className="h-px w-full bg-white/5 mb-5" />
                  <p className="text-[14px] md:text-[17px] leading-relaxed text-[var(--text-secondary)] font-medium max-w-3xl">
                    {item.answer}
                  </p>
                </div>
              </details>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

/* ─── Final CTA ───────────────────────────────────────────────────────────── */

function FinalCTASection() {
  return (
    <section className="relative overflow-hidden bg-[#09090b] py-20 md:py-48 border-t border-white/5">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-[var(--accent-primary)] opacity-[0.07] blur-[120px] rounded-full" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] mix-blend-overlay" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
        <FadeIn>
          <div className="inline-flex h-16 w-16 md:h-20 md:w-20 items-center justify-center rounded-xl md:rounded-2xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] mb-8 md:mb-10 shadow-[0_20px_50px_rgba(245,92,42,0.3)] rotate-3">
            <Rocket className="h-8 w-8 md:h-10 md:w-10 text-white" />
          </div>
          <h2 className="mb-6 md:mb-8 text-[36px] sm:text-[48px] md:text-[84px] lg:text-[96px] font-[1000] leading-[1] md:leading-[0.95] tracking-[-0.04em] text-[var(--text-primary)]">
            {FINAL_CTA.headlineLine1}
            <br />
            {FINAL_CTA.headlineLine2}{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] relative inline-block italic">
              {FINAL_CTA.headlineAccent}
              <svg
                className="absolute -bottom-1 left-0 w-full h-2 md:h-3 text-[var(--accent-primary)]/30"
                viewBox="0 0 100 10"
                preserveAspectRatio="none"
              >
                <path
                  d="M0 5 Q 50 10 100 5"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                />
              </svg>
            </span>
            <br />
            {FINAL_CTA.headlineLine3}
          </h2>
        </FadeIn>

        <FadeIn delay={0.2}>
          <div className="mx-auto mb-10 md:mb-12 max-w-xl space-y-2 md:space-y-3">
            {FINAL_CTA.body.map((line, i) => (
              <p
                key={i}
                className="text-[15px] md:text-[22px] font-black text-[var(--text-secondary)] tracking-tight leading-tight uppercase italic opacity-80"
              >
                {line}
              </p>
            ))}
          </div>
          <div className="flex flex-col items-center gap-6">
            <div className="group relative w-full sm:w-auto">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] blur opacity-40 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
              <PrimaryButton
                href={FINAL_CTA.cta.href}
                size="lg"
                className="w-full sm:w-auto px-10 md:px-12 py-5 md:py-6 text-[16px] md:text-[18px] relative justify-center"
              >
                {FINAL_CTA.cta.label}
              </PrimaryButton>
            </div>

            <div className="flex items-center gap-2 px-4 md:px-5 py-1.5 md:py-2 rounded-full bg-white/[0.03] border border-white/5 backdrop-blur-md">
              <ShieldCheck className="w-3.5 h-3.5 md:w-4 md:h-4 text-[var(--accent-success)]" />
              <p className="text-[10px] md:text-[12px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                {FINAL_CTA.cta.subtext}
              </p>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

/* ─── Footer ──────────────────────────────────────────────────────────────── */

function FooterSection() {
  return (
    <footer className="border-t border-white/5 py-20 bg-[#060608]">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-start justify-between gap-12 md:flex-row md:items-center">
          <div className="flex items-center gap-4 group cursor-pointer">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-[1rem] shadow-2xl group-hover:rotate-12 transition-transform duration-500"
              style={{ background: "var(--accent-primary)" }}
            >
              <Play className="h-6 w-6 fill-white text-white translate-x-0.5" />
            </div>
            <span className="text-[24px] font-black tracking-tighter text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
              {SITE.name}
            </span>
          </div>
          <div className="flex flex-wrap gap-6 sm:gap-10">
            {FOOTER.links.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-[15px] font-[1000] uppercase tracking-widest text-[var(--text-muted)] transition-all hover:text-[var(--text-primary)] hover:tracking-[0.2em]"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="mt-16 flex flex-col items-start justify-between gap-10 border-t border-white/5 pt-12 md:flex-row md:items-center">
          <div className="flex flex-col gap-2">
            <p className="text-[14px] font-bold text-[var(--text-muted)] tracking-tight">
              {FOOTER.copyright}
            </p>
            <Link
              href="https://makereal.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors"
            >
              Powered by Make Real
            </Link>
          </div>
          <div className="flex flex-wrap gap-3">
            {FOOTER.platforms.map((p) => (
              <span
                key={p}
                className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-2 text-[12px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:border-white/10 hover:text-[var(--text-secondary)] transition-colors"
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
