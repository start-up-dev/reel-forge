// ─── Landing Page Content ─────────────────────────────────────────────────────
// All copy, labels, and data for the landing page live here.
// Update this file whenever you need to change text, prices, or feature lists.
// The page components import from here and handle only layout/styling.

// ─── Site ─────────────────────────────────────────────────────────────────────

export const SITE = {
  name: "ReelForge",
  tagline: "AI-Powered Short-Form Video Production",
};

// ─── Nav ──────────────────────────────────────────────────────────────────────

export const NAV_LINKS = [
  { label: "How it Works", href: "#pipeline" },
  { label: "Styles", href: "#styles" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
] as const;

export const NAV_CTA = {
  signIn: "Sign in",
  primary: { label: "Start for $5", href: "/sign-up" },
};

// ─── Hero ─────────────────────────────────────────────────────────────────────

export const HERO = {
  eyebrow: "Your idea → Finished video in 10 minutes",
  headlineLine1: "Stop Making",
  headlineLine2: "Videos by Hand.",
  subheadline:
    "ReelForge turns your idea into a fully produced short-form video — script, voiceover, visuals, subtitles, music — completely automated. One pipeline. Four platforms. Under 10 minutes of your time.",
  primaryCta: {
    label: "Start for $5",
    subtext: "3 video credits · Secured by Stripe",
    href: "/sign-up",
  },
  secondaryCta: {
    label: "Watch how it works (90 sec)",
  },
  proof: {
    text: "Joined by creators posting 5+ videos daily",
    rating: "5.0 from early creators",
  },
};

// ─── Video Showcase ───────────────────────────────────────────────────────────

export const SHOWCASE = {
  label: "Built with ReelForge",
  headline: "Videos creators are\nposting right now.",
  subheadline:
    "Every video below was generated through the ReelForge pipeline — script to finished MP4.",
  videos: [
    {
      style: "Cinematic",
      niche: "Personal Finance",
      platform: "TikTok",
      views: "2.4M views",
      hook: "3 money habits that changed everything",
      gradientFrom: "#0f172a",
      gradientTo: "#1e3a5f",
      accentColor: "#4a90e2",
    },
    {
      style: "Cartoon",
      niche: "Fitness",
      platform: "Instagram",
      views: "890K views",
      hook: "Why you're not losing weight",
      gradientFrom: "#1a0a05",
      gradientTo: "#3d1a0a",
      accentColor: "#f55c2a",
    },
    {
      style: "Motion Graphics",
      niche: "Tech Tips",
      platform: "YouTube Shorts",
      views: "1.1M views",
      hook: "5 AI tools you don't know about",
      gradientFrom: "#0d0d1a",
      gradientTo: "#1a1040",
      accentColor: "#a78bfa",
    },
    {
      style: "Mascot",
      niche: "Food & Cooking",
      platform: "TikTok",
      views: "3.2M views",
      hook: "This egg recipe broke the internet",
      gradientFrom: "#0f1a0a",
      gradientTo: "#1e3d10",
      accentColor: "#34d399",
    },
    {
      style: "Whiteboard",
      niche: "Study Skills",
      platform: "YouTube Shorts",
      views: "560K views",
      hook: "How to study smarter, not harder",
      gradientFrom: "#1a1500",
      gradientTo: "#3d3000",
      accentColor: "#fbbf24",
    },
    {
      style: "Cinematic",
      niche: "Travel",
      platform: "Instagram",
      views: "1.8M views",
      hook: "The island nobody talks about",
      gradientFrom: "#001a1a",
      gradientTo: "#003d3d",
      accentColor: "#2dd4bf",
    },
    {
      style: "2D Animation",
      niche: "Business",
      platform: "TikTok",
      views: "420K views",
      hook: "How to scale your startup to $10k/mo",
      gradientFrom: "#0a1a2e",
      gradientTo: "#1a2e4a",
      accentColor: "#5b8def",
    },
    {
      style: "Stock Footage",
      niche: "Lifestyle",
      platform: "Instagram",
      views: "2.1M views",
      hook: "Morning routine for maximum focus",
      gradientFrom: "#1a1a1a",
      gradientTo: "#2a2a2a",
      accentColor: "#f4f4f8",
    },
    {
      style: "Mascot",
      niche: "Crypto",
      platform: "YouTube Shorts",
      views: "1.5M views",
      hook: "The coin that will 100x this year",
      gradientFrom: "#1a1505",
      gradientTo: "#2a200a",
      accentColor: "#fbbf24",
    },
    {
      style: "Cartoon",
      niche: "Self-Improvement",
      platform: "TikTok",
      views: "950K views",
      hook: "Stop caring what people think",
      gradientFrom: "#1a051a",
      gradientTo: "#2a0a2a",
      accentColor: "#a78bfa",
    },
    {
      style: "Motion Graphics",
      niche: "Real Estate",
      platform: "Instagram",
      views: "670K views",
      hook: "3 mistakes first-time buyers make",
      gradientFrom: "#051a05",
      gradientTo: "#0a2a0a",
      accentColor: "#34d399",
    },
    {
      style: "Cinematic",
      niche: "History",
      platform: "YouTube Shorts",
      views: "4.5M views",
      hook: "The untold truth about the Romans",
      gradientFrom: "#1a0505",
      gradientTo: "#2a0a0a",
      accentColor: "#f87171",
    },
  ],
};

// ─── Proof Strip ──────────────────────────────────────────────────────────────

export const PROOF_STATS = [
  { value: "< 10 min", label: "Active effort\nper video" },
  { value: "5+", label: "Videos per day\nachievable" },
  { value: "7", label: "Visual styles\nto choose from" },
  { value: "4", label: "Platforms\nsupported" },
] as const;

// ─── Problem ──────────────────────────────────────────────────────────────────

export const PROBLEM = {
  label: "The real cost of doing it manually",
  headlineLine1: "You're not short on ideas.",
  headlineLine2: "You're short on",
  headlineAccent: "hours.",
  body: [
    "The math is brutal. Every video you make by hand costs 2–4 hours. Script. Record. Edit. Caption. Thumbnail. Repeat.",
    "To post 5 videos a day — what the algorithm rewards — you'd need to work 10–20 hours. On just content.",
    "The creators growing fastest aren't more creative than you. They've removed themselves from the production line.",
  ],
  cards: [
    {
      iconKey: "clock",
      title: "2–4 hours per video",
      body: "Every video you make manually is time you can't spend growing, engaging, or stepping back. The more you produce, the less runway you have.",
    },
    {
      iconKey: "trending-down",
      title: "Miss 3 days. Lose 3 weeks.",
      body: "The algorithm doesn't forgive gaps. One exhausted week undoes a month of momentum. Consistency isn't optional — it's the product.",
    },
    {
      iconKey: "flame",
      title: "You started to create. Not to grind.",
      body: "Somewhere between the fifteenth edit and the third retake, the joy leaves. Burnout is what happens when output becomes the only mode.",
    },
  ],
};

// ─── Solution Reveal ──────────────────────────────────────────────────────────

export const SOLUTION = {
  headlineLine1: "There's a better way",
  headlineLine2: "to run a content channel.",
  body: [
    "What if writing the script, recording the voice, generating the visuals, and assembling the final video weren't your job anymore?",
    "What if your only job was the idea — and 10 minutes of review?",
  ],
  closer: "That's ReelForge.",
  pipelineNodes: ["Your Idea", "Script", "Voice", "Visuals", "Finished Video"],
  inlineCta: { label: "See the full pipeline", href: "#pipeline" },
};

// ─── Pipeline ─────────────────────────────────────────────────────────────────

export const PIPELINE = {
  label: "The ReelForge Pipeline",
  headlineLine1: "One idea in.",
  headlineLine2: "Finished video out.",
  subheadline:
    "Seven steps. Under 10 minutes of your attention. The rest is automated.",
  steps: [
    {
      num: "01",
      label: "Start here",
      labelVariant: "accent" as const,
      title: "Type an idea — or let AI brainstorm one for you",
      body: "Open a project and type your topic. Or switch to Brainstorm mode and ReelForge gives you three distinct angle options to pick from. Either way, you're done in 30 seconds.",
    },
    {
      num: "02",
      label: "Written by AI, approved by you",
      labelVariant: "muted" as const,
      title: "A script written for your niche, your platform, your audience",
      body: "Claude writes a hook-first, CTA-ending script calibrated to your channel's style, tone, and language. Not a template — a purpose-built script. Edit it, approve it, or regenerate with one click.",
      pill: "< 8 seconds to generate",
      pillVariant: "primary" as const,
    },
    {
      num: "03",
      label: "Broadcast quality, any language",
      labelVariant: "muted" as const,
      title: "Natural-sounding voice, with millisecond-accurate word timing",
      body: "ElevenLabs generates a voiceover in the voice you chose for this channel. Every word comes back with an exact timestamp — so subtitles sync to the frame, automatically.",
      pill: "30+ languages · < 15 seconds",
      pillVariant: "primary" as const,
    },
    {
      num: "04",
      label: "AI-directed, scene by scene",
      labelVariant: "muted" as const,
      title: "8–12 scenes. Each with a generated base image.",
      body: "Claude breaks your script into scenes and writes a cinematically precise prompt for each. Grok generates all base images in parallel — 8–12 images in roughly 15 seconds. Regenerate any image, edit any prompt, or upload your own.",
    },
    {
      num: "05",
      label: "Set once, applied everywhere",
      labelVariant: "muted" as const,
      title: "Choose how your video looks — consistent across every scene",
      body: "Pick your render style when you create a channel: Cinematic, Cartoon, Mascot, 2D Animation, Motion Graphics, Whiteboard, or Stock Footage. Every generated image and clip follows that style exactly.",
    },
    {
      num: "06",
      label: "Two decisions. Then you're done.",
      labelVariant: "muted" as const,
      title: "Pick a subtitle style. Toggle music. Submit.",
      body: "Four subtitle styles — Bold Pop, Word Highlight, Minimal, Cinematic — burned directly into the final MP4. Add background music from the royalty-free library with automatic ducking under your voiceover.",
    },
    {
      num: "07",
      label: "Fully automated from here",
      labelVariant: "muted" as const,
      title: "Hit Generate. Close the tab. Get an email.",
      body: "Clips are generated, assembled in scene order, audio is mixed, subtitles are burned, and the final 1080×1920 MP4 is rendered. You get an email when it's done. No babysitting. No progress bar watching.",
      pill: "Average queue-to-email: under 60 minutes",
      pillVariant: "success" as const,
    },
  ],
};

// ─── Visual Styles ────────────────────────────────────────────────────────────

export const STYLES = {
  label: "Choose your look",
  headlineLine1: "7 visual styles.",
  headlineLine2: "4 subtitle styles.",
  headlineAccent: "Zero compromises.",
  subheadline:
    "Set your render style once per channel. Every image, every clip, every subtitle follows it — automatically.",

  visualStyles: [
    {
      iconKey: "film",
      iconBg: "rgba(91,141,239,0.12)",
      iconColor: "var(--accent-secondary)",
      name: "Cinematic",
      mood: "Photorealistic · Immersive · Documentary feel",
      description:
        "Real-world photography and cinematic composition. Your script becomes a narrative, each scene a carefully composed shot. Looks like a Netflix short.",
    },
    {
      iconKey: "smile",
      iconBg: "rgba(251,191,36,0.12)",
      iconColor: "var(--accent-warning)",
      name: "Cartoon",
      mood: "2D flat · Expressive · Maximum personality",
      description:
        "Bold outlines, saturated colors, exaggerated expressions. Impossible to scroll past. Built for niches that need to entertain before they can educate.",
    },
    {
      iconKey: "star",
      iconBg: "rgba(52,211,153,0.12)",
      iconColor: "var(--accent-success)",
      name: "Mascot",
      mood: "3D character · Brand identity · Playful",
      description:
        "Your topic becomes a 3D cartoon character that IS the subject — a talking egg for nutrition, a coin for finance. Built for channels building a recognizable identity.",
    },
    {
      iconKey: "shapes",
      iconBg: "rgba(245,92,42,0.12)",
      iconColor: "var(--accent-primary)",
      name: "2D Animation",
      mood: "Clean · Explainer · Vector-style",
      description:
        "Flat vector illustration. Clean icons, geometric shapes, bold diagrams. No characters — pure visual storytelling through shapes. The go-to style for educational content.",
    },
    {
      iconKey: "zap",
      iconBg: "rgba(248,113,113,0.12)",
      iconColor: "var(--accent-danger)",
      name: "Motion Graphics",
      mood: "Kinetic · High-energy · Data-driven",
      description:
        "Stats, facts, and bold claims — each a graphic reveal. Ultra-fast pacing. Built for hooks that stop the scroll before the first second.",
    },
    {
      iconKey: "pen-line",
      iconBg: "rgba(255,255,255,0.06)",
      iconColor: "var(--text-secondary)",
      name: "Whiteboard",
      mood: "Tutorial · Step-by-step · Trustworthy",
      description:
        "Hand-drawn visuals that build as the narration explains. The classic explainer format viewers trust for learning complex things simply.",
    },
    {
      iconKey: "video",
      iconBg: "rgba(91,141,239,0.08)",
      iconColor: "var(--accent-secondary)",
      name: "Stock Footage",
      mood: "Professional · Polished · Brand-ready",
      description:
        "Warm, real-world visuals that feel like brand content. For creators who want to look established before they are.",
    },
  ],

  subtitleStyles: [
    {
      name: "Bold Pop",
      badge: "Most Popular",
      badgeVariant: "warning" as const,
      description:
        "Large center-screen text with the active word highlighted yellow. Impossible to miss. Built for fast, high-energy content.",
    },
    {
      name: "Word Highlight",
      badge: "Most Engaging",
      badgeVariant: "primary" as const,
      description:
        "Each word scales into frame at its exact timestamp. Hypnotic and precise. Best when every word carries weight.",
    },
    {
      name: "Minimal",
      badge: "Clean",
      badgeVariant: "muted" as const,
      description:
        "Unobtrusive sentence-level text at the bottom third. For creators who don't want subtitles competing with the visuals.",
    },
    {
      name: "Cinematic",
      badge: "Premium Feel",
      badgeVariant: "secondary" as const,
      description:
        "Film-style subtitle band. Borrowed from documentary aesthetics. Elevates every frame.",
    },
  ],
};

// ─── Before / After ───────────────────────────────────────────────────────────

export const COMPARISON = {
  withoutLabel: "Without ReelForge",
  withLabel: "With ReelForge",
  without: [
    "2–4 hours per video, every day",
    "Manual scripting — blank page, every time",
    "Hiring voice actors or recording yourself",
    "Finding, licensing, and editing B-roll footage",
    "Subtitle sync done by hand or outsourced",
    "Posting gaps when life interrupts",
    "One channel at a time",
    "Burnout as a growth ceiling",
  ],
  with: [
    "Under 10 minutes active effort per video",
    "Claude writes the script from your idea",
    "ElevenLabs voices it in 30+ languages",
    "7 visual styles, AI-generated per scene",
    "Subtitles synced to the millisecond, automatically",
    "New video ready every time you have an idea",
    "Multiple channels, all running simultaneously",
    "A system that scales while you sleep",
  ],
  cta: {
    headline: "Ready to switch sides?",
    label: "Start for $5",
    subtext: "3 video credits · No monthly commitment · Secured by Stripe",
    href: "/sign-up",
  },
};

// ─── Pricing ──────────────────────────────────────────────────────────────────

export const PRICING = {
  label: "Founding Member Pricing",
  headlineLine1: "Start for $5.",
  headlineLine2: "Scale when you're ready.",
  subheadline:
    "Try the full pipeline with 3 video credits. See a finished video. Then decide.",
  urgencyBanner:
    "Founding member pricing — subscription rates are locked in for the life of your account when you join during launch.",
  urgencyNote: "Rates increase after launch period.",
  monthlyNote: "All subscriptions billed monthly. Cancel any time.",
  footerNote:
    "All plans: 1080×1920 MP4 · H.264 + AAC · 30fps · 7-day shareable links · Video library",
  plans: [
    {
      name: "Try Out",
      nameStyle: "muted" as const,
      price: "$5",
      period: "one time",
      subPrice: "No subscription. Use your 3 credits at any time.",
      features: [
        "3 complete video credits",
        "All 7 visual styles",
        "All 4 subtitle styles",
        "20+ AI voices · 4 platforms",
      ],
      cta: "Get Started for $5",
      href: "/sign-up",
      highlighted: false,
    },
    {
      name: "Starter",
      nameStyle: "muted" as const,
      price: "$49",
      period: "/ month",
      subPrice: "~$0.33 per video at 5/day",
      features: [
        "5 videos per day",
        "150 videos per month",
        "All platforms & visual styles",
        "BGM library + auto-ducking",
        "Email delivery on completion",
      ],
      cta: "Start Starter Plan",
      href: "/sign-up",
      highlighted: false,
    },
    {
      name: "Pro",
      nameStyle: "accent" as const,
      price: "$99",
      period: "/ month",
      subPrice: "~$0.22 per video at 15/day",
      features: [
        "15 videos per day",
        "450 videos per month",
        "All Starter features included",
        "Priority generation queue",
        "Custom voice prompts per project",
      ],
      cta: "Start Pro Plan",
      href: "/sign-up",
      highlighted: true,
      badge: "Most Popular",
    },
  ],
};

// ─── FAQ ──────────────────────────────────────────────────────────────────────

export const FAQ = {
  label: "Common Questions",
  headline: "Honest answers.",
  items: [
    {
      question:
        "How is this different from just using ChatGPT and ElevenLabs myself?",
      answer:
        "You could assemble those tools yourself — and you'd spend your time doing it. You'd write prompts for each scene, generate images one by one, feed them into a video tool, manually line up the audio, burn the subtitles, export, and repeat. For every video. ReelForge isn't a collection of AI tools — it's a production pipeline. The orchestration, the scene direction, the timing sync, the FFmpeg assembly — that's the product. The AI tools are the ingredients. ReelForge is the kitchen.",
    },
    {
      question: "Will the videos look AI-generated?",
      answer:
        "Depends on the style you choose, and that's intentional. Cinematic style produces photorealistic imagery — indistinguishable from stock footage for most niches. Cartoon, Mascot, and Motion Graphics are designed to look stylized — that's the aesthetic, and it performs extremely well on short-form platforms. Every style was chosen because it works on the platforms people actually use.",
    },
    {
      question: "How much time does it actually take per video?",
      answer:
        "Under 10 minutes of your active attention. You review the script (~2 min), approve or adjust the voiceover (~1 min), review 8–12 scene images (~3 min), pick a subtitle style and toggle music (~1 min), and submit. Everything after that runs without you. You don't watch it render. You get an email.",
    },
    {
      question: "Can I control what the videos look like?",
      answer:
        "Yes — at every level. You set the visual render style for each channel. For each scene you can regenerate the base image, edit the visual prompt directly, or upload your own image. You read and edit the script before anything generates. The automation handles production. You keep creative direction.",
    },
    {
      question: "What languages does it support?",
      answer:
        "Any language ElevenLabs covers — 30+ including English, Spanish, Hindi, Bengali, Portuguese, French, German, and many more. Language is set at the channel level. Your script, voiceover, and subtitle files all match.",
    },
    {
      question: "How does the subscription work?",
      answer:
        "Starter is $49/month — 5 videos/day, up to 150/month. Pro is $99/month — 15/day, up to 450/month. Both month-to-month, no annual commitment. Cancel any time from your Billing page. Access runs to the end of your billing period.",
    },
    {
      question: "How long until I receive my finished video?",
      answer:
        "Average queue-to-email time is under 60 minutes. During high-demand periods it may be longer — your dashboard shows live queue position. You don't need to stay on the page; the email lands in your inbox when it's done.",
    },
  ],
};

// ─── Final CTA ────────────────────────────────────────────────────────────────

export const FINAL_CTA = {
  headlineLine1: "Tomorrow’s",
  headlineLine2: "winners",
  headlineAccent: "automated",
  headlineLine3: "yesterday.",
  body: [
    "Your ideas deserve to exist at scale.",
    "Not rationed by how many hours you can work.",
  ],
  cta: {
    label: "Start for $5 — your first 3 videos",
    subtext: "3 video credits · No monthly commitment · Secured by Stripe",
    href: "/sign-up",
  },
};

// ─── Footer ───────────────────────────────────────────────────────────────────

export const FOOTER = {
  copyright: `© ${new Date().getFullYear()} ReelForge. All rights reserved.`,
  links: [
    { label: "Privacy Policy", href: "#" },
  ],
  platforms: ["TikTok", "Instagram", "YouTube Shorts", "Facebook Reels"],
};
