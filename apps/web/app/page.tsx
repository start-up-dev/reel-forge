import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Zap,
  CheckCircle,
  ChevronDown,
  ArrowRight,
  Play,
  Sparkles,
  Mic,
  Image,
  Film,
  Download,
} from "lucide-react";

export default async function RootPage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      <Navbar />
      <Hero />
      <HowItWorks />
      <FeatureHighlights />
      <PlatformSupport />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  );
}

/* ── Navbar ─────────────────────────────────────────────────────────────── */

function Navbar() {
  return (
    <nav className="fixed top-0 z-50 w-full border-b border-[var(--bg-border)]/50 bg-[var(--bg-base)]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-[var(--accent-primary)]" />
          <span className="text-base font-semibold">ReelForge</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/sign-in"
            className="rounded-lg px-4 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}

/* ── Hero ───────────────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-16">
      {/* Background orb */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 top-0 h-[600px] w-[600px] -translate-y-1/4 translate-x-1/4 rounded-full bg-[var(--accent-primary)]/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-0 bottom-0 h-[400px] w-[400px] translate-y-1/4 -translate-x-1/4 rounded-full bg-[var(--accent-secondary)]/8 blur-3xl"
      />

      <div className="relative mx-auto max-w-3xl px-6 text-center">
        {/* Eyebrow */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/10 px-4 py-1.5 text-xs font-medium tracking-widest text-[var(--accent-primary)] uppercase">
          <Sparkles className="h-3 w-3" />
          AI-Powered Video Creation
        </div>

        {/* Headline */}
        <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight md:text-6xl">
          5 Videos a Day,{" "}
          <span className="bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] bg-clip-text text-transparent">
            Under 10 Minutes
          </span>{" "}
          Each.
        </h1>

        <p className="mb-10 text-lg text-[var(--text-secondary)] md:text-xl">
          ReelForge turns your idea into a fully produced short-form video —
          script, voiceover, visuals, subtitles — ready to post.
        </p>

        {/* CTAs */}
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/sign-up"
            className="group flex items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-8 py-4 text-base font-semibold text-white shadow-[var(--shadow-glow-accent)] transition-all hover:opacity-90 hover:shadow-[0_0_32px_rgba(124,92,252,0.4)]"
          >
            Start Free Trial — $2
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <a
            href="#how-it-works"
            className="flex items-center gap-2 rounded-xl px-8 py-4 text-base text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            <Play className="h-4 w-4" />
            See how it works
          </a>
        </div>

        {/* Social proof */}
        <div className="mt-12 flex items-center justify-center gap-3">
          <div className="flex -space-x-2">
            {["#7C5CFC", "#5B8DEF", "#34D399", "#FBBF24", "#F87171"].map(
              (color, i) => (
                <div
                  key={i}
                  className="h-8 w-8 rounded-full border-2 border-[var(--bg-base)]"
                  style={{ backgroundColor: color }}
                />
              )
            )}
          </div>
          <span className="text-sm text-[var(--text-secondary)]">
            Trusted by{" "}
            <span className="font-medium text-[var(--text-primary)]">
              1,200+
            </span>{" "}
            creators
          </span>
        </div>

        {/* Scroll hint */}
        <div className="mt-16 flex justify-center">
          <a
            href="#how-it-works"
            className="flex flex-col items-center gap-2 text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
          >
            <span>See the workflow</span>
            <ChevronDown className="h-4 w-4 animate-bounce" />
          </a>
        </div>
      </div>
    </section>
  );
}

/* ── How It Works ───────────────────────────────────────────────────────── */

const steps = [
  {
    icon: Sparkles,
    title: "Write your idea",
    desc: "Type a topic or let AI brainstorm 3 ideas for you.",
    num: "01",
  },
  {
    icon: CheckCircle,
    title: "Approve script",
    desc: "Review and edit the AI-generated script before recording.",
    num: "02",
  },
  {
    icon: Mic,
    title: "Choose voice",
    desc: "Pick from 20+ multilingual AI voices with preview.",
    num: "03",
  },
  {
    icon: Image,
    title: "Review scenes",
    desc: "Approve or tweak the AI-generated visuals per scene.",
    num: "04",
  },
  {
    icon: Download,
    title: "Download video",
    desc: "Get your finished 1080×1920 MP4 ready to post.",
    num: "05",
  },
];

function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="mx-auto max-w-6xl px-6 py-24"
    >
      <div className="mb-16 text-center">
        <h2 className="text-3xl font-bold md:text-4xl">How It Works</h2>
        <p className="mt-3 text-[var(--text-secondary)]">
          From idea to finished video in five steps.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-5">
        {steps.map((step, i) => {
          const Icon = step.icon;
          return (
            <div key={i} className="relative flex flex-col items-center text-center">
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div
                  aria-hidden
                  className="absolute left-1/2 top-6 hidden h-px w-full -translate-y-1/2 border-t border-dashed border-[var(--bg-border)] md:block"
                  style={{ left: "50%", width: "100%" }}
                />
              )}
              <div className="relative z-10 mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--bg-elevated)] ring-1 ring-[var(--bg-border)]">
                <Icon className="h-5 w-5 text-[var(--accent-primary)]" />
                <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent-primary)] text-[10px] font-bold text-white">
                  {i + 1}
                </span>
              </div>
              <h3 className="mb-1.5 text-sm font-semibold">{step.title}</h3>
              <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                {step.desc}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ── Feature Highlights ─────────────────────────────────────────────────── */

const features = [
  {
    tag: "Full Pipeline",
    title: "Every step of production, automated",
    desc: "ReelForge handles scripting, voiceover, scene generation, and final assembly — no editing software needed.",
    bullets: [
      "Claude AI writes platform-native scripts",
      "ElevenLabs multilingual voiceovers",
      "Grok Imagine generates stunning visuals",
      "FFmpeg assembles and burns subtitles",
    ],
    mockup: "wizard",
  },
  {
    tag: "Creator-First",
    title: "Built for creators who post every day",
    desc: "Manage multiple channels and niches from one dashboard. Queue up to 15 videos per day on Pro.",
    bullets: [
      "Unlimited projects per channel/niche",
      "Up to 15 videos per day on Pro",
      "Cross-project video library",
      "Email alerts when videos are ready",
    ],
    mockup: "library",
  },
  {
    tag: "Quality",
    title: "Cinematic quality, at scale",
    desc: "Four subtitle styles, BGM mixing, and 1080×1920 output. Every video is ready to post without re-editing.",
    bullets: [
      "1080×1920 portrait format",
      "4 subtitle styles (Bold Pop, Minimal, Cinematic, Highlight)",
      "Background music with volume control",
      "H.264 + AAC — universal compatibility",
    ],
    mockup: "quality",
  },
];

function FeatureHighlights() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16 space-y-24">
      {features.map((feature, i) => (
        <div
          key={i}
          className={`flex flex-col gap-12 md:flex-row md:items-center ${i % 2 === 1 ? "md:flex-row-reverse" : ""}`}
        >
          {/* Mockup */}
          <div className="flex-1">
            <div className="relative rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow-card)]">
              <FeatureMockup type={feature.mockup} />
            </div>
          </div>

          {/* Text */}
          <div className="flex-1">
            <div className="mb-4 inline-flex items-center rounded-full border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/10 px-3 py-1 text-xs font-medium text-[var(--accent-primary)]">
              {feature.tag}
            </div>
            <h2 className="mb-4 text-2xl font-bold md:text-3xl">
              {feature.title}
            </h2>
            <p className="mb-6 text-[var(--text-secondary)]">{feature.desc}</p>
            <ul className="space-y-2.5">
              {feature.bullets.map((b, j) => (
                <li key={j} className="flex items-start gap-2.5">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-success)]" />
                  <span className="text-sm text-[var(--text-secondary)]">{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </section>
  );
}

function FeatureMockup({ type }: { type: string }) {
  if (type === "wizard") {
    return (
      <div className="space-y-3">
        <div className="flex gap-2">
          {["Idea", "Script", "Voice", "Scenes", "Style"].map((s, i) => (
            <div
              key={s}
              className={`flex-1 rounded py-1 text-center text-[10px] font-medium ${i === 0 ? "bg-[var(--accent-primary)] text-white" : "bg-[var(--bg-elevated)] text-[var(--text-muted)]"}`}
            >
              {s}
            </div>
          ))}
        </div>
        <div className="rounded-xl bg-[var(--bg-elevated)] p-4">
          <div className="mb-2 text-xs font-medium text-[var(--text-muted)]">Your idea</div>
          <div className="h-16 rounded-lg bg-[var(--bg-base)] p-3 text-xs text-[var(--text-secondary)]">
            &ldquo;5 morning habits that changed my life…&rdquo;
          </div>
          <div className="mt-3 flex gap-2">
            {["AI Idea 1", "AI Idea 2", "AI Idea 3"].map((idea) => (
              <div
                key={idea}
                className="flex-1 rounded-lg border border-[var(--bg-border)] bg-[var(--bg-base)] p-2 text-[10px] text-[var(--text-muted)]"
              >
                {idea}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  if (type === "library") {
    return (
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[9/16] rounded-lg"
            style={{
              background: `linear-gradient(135deg, hsl(${220 + i * 20}deg 60% 25%), hsl(${240 + i * 20}deg 50% 15%))`,
            }}
          />
        ))}
      </div>
    );
  }
  // quality
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 rounded-xl bg-[var(--bg-elevated)] p-3">
        <div className="h-16 w-10 rounded bg-gradient-to-b from-[var(--accent-primary)]/40 to-[var(--accent-secondary)]/20" />
        <div className="flex-1 space-y-1.5">
          <div className="h-2 w-3/4 rounded bg-[var(--bg-border)]" />
          <div className="h-2 w-1/2 rounded bg-[var(--bg-border)]" />
          <div className="mt-2 inline-flex items-center rounded bg-[var(--accent-primary)] px-2 py-0.5 text-[9px] font-bold text-white">
            BOLD POP
          </div>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {["Bold Pop", "Minimal", "Cinematic", "Highlight"].map((s) => (
          <div
            key={s}
            className="rounded bg-[var(--bg-elevated)] p-1.5 text-center text-[9px] text-[var(--text-muted)]"
          >
            {s}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Platform Support ───────────────────────────────────────────────────── */

const platforms = [
  { name: "TikTok", color: "#010101" },
  { name: "Instagram", color: "#E1306C" },
  { name: "YouTube Shorts", color: "#FF0000" },
  { name: "Facebook Reels", color: "#1877F2" },
];

function PlatformSupport() {
  return (
    <section className="border-y border-[var(--bg-border)] bg-[var(--bg-surface)] py-10">
      <div className="mx-auto max-w-6xl px-6">
        <p className="mb-8 text-center text-sm text-[var(--text-muted)]">
          Optimized for every platform
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8">
          {platforms.map((p) => (
            <div
              key={p.name}
              className="flex items-center gap-2 text-base font-semibold text-[var(--text-secondary)]"
            >
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: p.color }}
              />
              {p.name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Pricing ────────────────────────────────────────────────────────────── */

const plans = [
  {
    name: "Trial",
    price: "$2",
    period: "one time",
    desc: "Try the full pipeline with one video.",
    features: [
      "1 video credit",
      "All 4 subtitle styles",
      "20+ AI voices",
      "1080×1920 MP4 output",
    ],
    cta: "Start Trial",
    href: "/sign-up",
    highlight: false,
  },
  {
    name: "Starter",
    price: "$29",
    period: "/ month",
    desc: "For consistent creators posting daily.",
    features: [
      "5 videos per day",
      "150 videos per month",
      "All platforms",
      "BGM library",
      "Email notifications",
    ],
    cta: "Get Starter",
    href: "/sign-up",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$79",
    period: "/ month",
    desc: "For power creators and agencies.",
    features: [
      "15 videos per day",
      "450 videos per month",
      "All Starter features",
      "Priority queue",
      "Custom voice prompts",
    ],
    cta: "Get Pro",
    href: "/sign-up",
    highlight: true,
    badge: "Most Popular",
  },
];

function Pricing() {
  return (
    <section id="pricing" className="mx-auto max-w-6xl px-6 py-24">
      <div className="mb-16 text-center">
        <h2 className="text-3xl font-bold md:text-4xl">Simple Pricing</h2>
        <p className="mt-3 text-[var(--text-secondary)]">
          Start with a $2 trial. No commitment.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`relative flex flex-col rounded-2xl p-6 ${
              plan.highlight
                ? "border border-[var(--accent-primary)] bg-[var(--bg-surface)] shadow-[var(--shadow-glow-accent)]"
                : "border border-[var(--bg-border)] bg-[var(--bg-surface)]"
            }`}
          >
            {plan.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--accent-primary)] px-4 py-1 text-xs font-semibold text-white">
                {plan.badge}
              </div>
            )}
            <div className="mb-6">
              <h3 className="text-base font-semibold text-[var(--text-secondary)]">
                {plan.name}
              </h3>
              <div className="mt-2 flex items-end gap-1">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="mb-1 text-sm text-[var(--text-muted)]">
                  {plan.period}
                </span>
              </div>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                {plan.desc}
              </p>
            </div>

            <ul className="mb-8 flex-1 space-y-3">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2.5">
                  <CheckCircle className="h-4 w-4 shrink-0 text-[var(--accent-success)]" />
                  <span className="text-sm text-[var(--text-secondary)]">{f}</span>
                </li>
              ))}
            </ul>

            <Link
              href={plan.href}
              className={`block rounded-xl px-6 py-3 text-center text-sm font-semibold transition-opacity hover:opacity-90 ${
                plan.highlight
                  ? "bg-[var(--accent-primary)] text-white"
                  : "border border-[var(--bg-border)] bg-[var(--bg-elevated)] text-[var(--text-primary)]"
              }`}
            >
              {plan.cta}
            </Link>
          </div>
        ))}
      </div>

      <p className="mt-8 text-center text-sm text-[var(--text-muted)]">
        No hidden fees. Cancel anytime. All plans include unlimited projects.
      </p>
    </section>
  );
}

/* ── FAQ ────────────────────────────────────────────────────────────────── */

const faqs = [
  {
    q: "How does the $2 trial work?",
    a: "Pay once, generate one full video end-to-end. No subscription required. If you love it, upgrade to Starter or Pro.",
  },
  {
    q: "How are videos generated?",
    a: "ReelForge uses Claude for scripting, ElevenLabs for voiceover, and Grok Imagine for visuals. Our browser extension drives the image AI, then FFmpeg assembles everything into a polished MP4.",
  },
  {
    q: "How long does it take to make a video?",
    a: "Script and voiceover generate in under 30 seconds. Scene images take 1–3 minutes depending on queue. The final assembly adds another 1–2 minutes.",
  },
  {
    q: "What formats and platforms are supported?",
    a: "All videos output at 1080×1920 (9:16 portrait) — the native format for TikTok, Instagram Reels, YouTube Shorts, and Facebook Reels.",
  },
  {
    q: "Can I use my own images or audio?",
    a: "Yes — on the scene review step you can upload your own images per scene. Custom audio is a Pro feature on the roadmap.",
  },
  {
    q: "Can I cancel my subscription?",
    a: "Yes, cancel anytime from your billing page. You keep access until the end of the billing period.",
  },
];

function FAQ() {
  return (
    <section id="faq" className="mx-auto max-w-2xl px-6 py-24">
      <div className="mb-12 text-center">
        <h2 className="text-3xl font-bold">Frequently Asked Questions</h2>
      </div>

      <div className="divide-y divide-[var(--bg-border)]">
        {faqs.map((faq, i) => (
          <FAQItem key={i} question={faq.q} answer={faq.a} />
        ))}
      </div>
    </section>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group py-5">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-[var(--text-primary)]">
        {question}
        <ChevronDown className="h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
        {answer}
      </p>
    </details>
  );
}

/* ── Final CTA ──────────────────────────────────────────────────────────── */

function FinalCTA() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--accent-primary)]/20 via-[var(--bg-surface)] to-[var(--accent-secondary)]/10 p-12 text-center ring-1 ring-[var(--accent-primary)]/30">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl bg-[var(--accent-primary)]/5"
        />
        <h2 className="mb-4 text-3xl font-bold md:text-4xl">
          Start making videos today
        </h2>
        <p className="mb-8 text-[var(--text-secondary)]">
          One video for $2. Upgrade whenever you&apos;re ready.
        </p>
        <Link
          href="/sign-up"
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-8 py-4 text-base font-semibold text-white shadow-[var(--shadow-glow-accent)] transition-all hover:opacity-90"
        >
          Get Started — $2 Trial
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

/* ── Footer ─────────────────────────────────────────────────────────────── */

function Footer() {
  return (
    <footer className="border-t border-[var(--bg-border)] bg-[var(--bg-surface)] py-12">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Brand */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4 text-[var(--accent-primary)]" />
              <span className="font-semibold">ReelForge</span>
            </div>
            <p className="text-sm text-[var(--text-muted)]">
              AI-powered short-form video creation for modern creators.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Product
            </h4>
            <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
              {[
                { label: "Pricing", href: "#pricing" },
                { label: "FAQ", href: "#faq" },
                { label: "Sign In", href: "/sign-in" },
              ].map(({ label, href }) => (
                <li key={label}>
                  <Link href={href} className="hover:text-[var(--text-primary)] transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Legal
            </h4>
            <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
              {["Privacy Policy", "Terms of Service"].map((l) => (
                <li key={l}>
                  <span className="cursor-default text-[var(--text-muted)]">{l}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-[var(--bg-border)] pt-6 text-center text-xs text-[var(--text-muted)]">
          © {new Date().getFullYear()} ReelForge. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
