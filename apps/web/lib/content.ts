// ─── Landing Page Content ─────────────────────────────────────────────────────
// All copy, labels, and data for the landing page live here.
// Update this file whenever you need to change text, prices, or feature lists.

const R2 = "https://pub-425a4c402193444fb20eeb6725aa6557.r2.dev/videos";

// ─── Site ─────────────────────────────────────────────────────────────────────

export const SITE = {
  name: "ReelForge",
  tagline: "Automatic Facebook Video Maker",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "https://aireelforge.com",
};

// ─── Nav ──────────────────────────────────────────────────────────────────────

export const NAV_LINKS = [
  { label: "How it Works", href: "#pipeline" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
] as const;

export const NAV_CTA = {
  signIn: "Sign in",
  primary: { label: "Start for $5", href: "/sign-up" },
};

// ─── Hero ─────────────────────────────────────────────────────────────────────

export const HERO = {
  eyebrow: "7 Facebook videos. Auto-posted. You approved once.",
  headlineLine1: "Your Facebook Page,",
  headlineLine2: "On Autopilot.",
  subheadline:
    "A full week of Facebook videos — planned, produced, and posted for you. Built for creators who'd rather not film or edit a thing.",
  primaryCta: {
    label: "Start Your First Week — $5",
    subtext: "7 video credits · No subscription required",
    href: "/sign-up",
  },
  secondaryCta: {
    label: "Watch how it works (90 sec)",
  },
  proof: {
    text: "Joined by creators finally sleeping on Sundays",
    rating: "5.0 from early creators",
  },
};

// ─── Video Showcase ───────────────────────────────────────────────────────────

export const SHOWCASE = {
  label: "Built with ReelForge",
  headline: "Real videos. Real niches.\nZero editing.",
  subheadline:
    "Every video below was produced by ReelForge — scripted by AI, built scene by scene, assembled automatically, and personally reviewed by our team before it's ready to post.",
  trustBadge: "Every clip personally reviewed by our team before it posts.",
  videos: [
    {
      style: "Cinematic",
      niche: "Personal Finance",
      platform: "Facebook",
      views: "2.4M views",
      hook: "3 money habits that changed everything",
      gradientFrom: "#0f172a",
      gradientTo: "#1e3a5f",
      accentColor: "#4a90e2",
      videoUrl: `${R2}/Cinematic.mp4`,
    },
    {
      style: "UGC",
      niche: "Daily Routine",
      platform: "Facebook",
      views: "890K views",
      hook: "The morning that made me $10k",
      gradientFrom: "#1a0a05",
      gradientTo: "#3d1a0a",
      accentColor: "#f55c2a",
      videoUrl: `${R2}/daily-routine.mp4`,
    },
    {
      style: "Tutorial",
      niche: "AI & Tech",
      platform: "Facebook",
      views: "1.1M views",
      hook: "5 AI tools you probably don't know about",
      gradientFrom: "#0d0d1a",
      gradientTo: "#1a1040",
      accentColor: "#a78bfa",
      videoUrl: `${R2}/learn ai.mp4`,
    },
    {
      style: "Story",
      niche: "Career Growth",
      platform: "Facebook",
      views: "3.2M views",
      hook: "The interview mistake that cost me the job",
      gradientFrom: "#0f1a0a",
      gradientTo: "#1e3d10",
      accentColor: "#34d399",
      videoUrl: `${R2}/interview mistake.mp4`,
    },
    {
      style: "Cinematic",
      niche: "Fact Check",
      platform: "Facebook",
      views: "560K views",
      hook: "The history 'fact' everyone gets completely wrong",
      gradientFrom: "#1a1500",
      gradientTo: "#3d3000",
      accentColor: "#fbbf24",
      videoUrl: `${R2}/claude wrong.mp4`,
    },
    {
      style: "UGC",
      niche: "Fitness",
      platform: "Facebook",
      views: "1.8M views",
      hook: "Why you're not losing weight (honest answer)",
      gradientFrom: "#001a1a",
      gradientTo: "#003d3d",
      accentColor: "#2dd4bf",
      videoUrl: `${R2}/createdbyreelforge.mp4`,
    },
    {
      style: "Tutorial",
      niche: "Business",
      platform: "Facebook",
      views: "420K views",
      hook: "How to scale your idea to $10k/month",
      gradientFrom: "#0a1a2e",
      gradientTo: "#1a2e4a",
      accentColor: "#4a90e2",
      videoUrl: `${R2}/learn ai.mp4`,
    },
    {
      style: "Cinematic",
      niche: "Self-Improvement",
      platform: "Facebook",
      views: "2.1M views",
      hook: "Stop caring what people think — here's how",
      gradientFrom: "#1a1a1a",
      gradientTo: "#2a2a2a",
      accentColor: "#f4f4f8",
      videoUrl: `${R2}/daily-routine.mp4`,
    },
    {
      style: "Story",
      niche: "Mindset",
      platform: "Facebook",
      views: "1.5M views",
      hook: "The habit that separates winners from everyone else",
      gradientFrom: "#1a1505",
      gradientTo: "#2a200a",
      accentColor: "#fbbf24",
      videoUrl: `${R2}/createdbyreelforge.mp4`,
    },
    {
      style: "UGC",
      niche: "Creator Economy",
      platform: "Facebook",
      views: "950K views",
      hook: "I automated my entire content channel. Here's how.",
      gradientFrom: "#1a051a",
      gradientTo: "#2a0a2a",
      accentColor: "#a78bfa",
      videoUrl: `${R2}/Cinematic.mp4`,
    },
    {
      style: "Tutorial",
      niche: "Real Estate",
      platform: "Facebook",
      views: "670K views",
      hook: "3 mistakes that kill first-time buyers",
      gradientFrom: "#051a05",
      gradientTo: "#0a2a0a",
      accentColor: "#34d399",
      videoUrl: `${R2}/interview mistake.mp4`,
    },
    {
      style: "Cinematic",
      niche: "History",
      platform: "Facebook",
      views: "4.5M views",
      hook: "The truth about the Roman Empire nobody tells you",
      gradientFrom: "#1a0505",
      gradientTo: "#2a0a0a",
      accentColor: "#f87171",
      videoUrl: `${R2}/createdbyreelforge.mp4`,
    },
  ],
};

// ─── Proof Strip ──────────────────────────────────────────────────────────────

export const PROOF_STATS = [
  { value: "7", label: "Videos planned\nin 10 minutes" },
  { value: "~0", label: "Minutes of editing\never required" },
  { value: "Auto", label: "Posts to Facebook\nwhile you sleep" },
  { value: "1", label: "Approval click\nfor the whole week" },
] as const;

// ─── Problem ──────────────────────────────────────────────────────────────────

export const PROBLEM = {
  label: "The real cost of doing it manually",
  headlineLine1: "The algorithm wants daily content.",
  headlineLine2: "You have",
  headlineAccent: "a life.",
  body: [
    "Posting daily means 2–4 hours per video — scripting, recording, editing, captioning, scheduling.",
    "Most creators burn out by month two. The ones still growing? They stopped doing it by hand.",
  ],
  cards: [
    {
      iconKey: "clock",
      title: "2–4 hours. Every single day.",
      body: "Not a content strategy — a second job you didn't sign up for. Miss a day and the algorithm makes you pay.",
    },
    {
      iconKey: "trending-down",
      title: "Consistency is the whole game.",
      body: "Skip 3 days, lose 3 weeks of momentum. The algorithm only rewards the ones who show up — every day, without fail.",
    },
    {
      iconKey: "flame",
      title: "Burnout is the real enemy.",
      body: "You started because you loved it. By the fifteenth edit of the week, love becomes obligation — and then you go quiet.",
    },
  ],
};

// ─── Solution Reveal ──────────────────────────────────────────────────────────

export const SOLUTION = {
  headlineLine1: "You don't have a content problem.",
  headlineLine2: "You have a time problem.",
  body: [
    "Spend 10 minutes on Sunday reviewing a week of ideas. By Monday, the first video is live on your Facebook page.",
    "No scripting. No recording. No editing. No scheduling. Just... done.",
  ],
  closer: "That's not a dream. That's ReelForge.",
  pipelineNodes: ["Your Brand", "AI Week Plan", "One Approval", "Auto-Generated", "Auto-Posted"],
  inlineCta: { label: "See the full pipeline", href: "#pipeline" },
};

// ─── Pipeline ─────────────────────────────────────────────────────────────────

export const PIPELINE = {
  label: "The ReelForge Pipeline",
  headlineLine1: "One approval Sunday.",
  headlineLine2: "Seven posts all week.",
  subheadline:
    "Five steps. Under 10 minutes of your attention. Everything else runs itself.",
  steps: [
    {
      num: "01",
      title: "Set your brand once. Use it forever.",
      body: "Connect your Facebook page and add your website. We study both so every script is accurate and on-brand — not generic AI filler. ReelForge proposes your niche, tone, visual style, and AI character. Review, tweak, done.",
      pill: "We analyze your page + website for you",
      pillVariant: "primary" as const,
    },
    {
      num: "02",
      title: "ReelForge plans your entire content week.",
      body: "Hit 'New Plan.' In under 2 minutes you get a full 7-day calendar — hooks, angles, and script outlines, built for your niche. Not generic filler.",
      pill: "Full week planned in under 2 minutes",
      pillVariant: "primary" as const,
    },
    {
      num: "03",
      title: "Edit anything. Then approve with one click.",
      body: "Swap a topic, rewrite a hook, or just hit Approve. You're the editor-in-chief — not the production crew.",
      pill: "Most users approve in under 3 minutes",
      pillVariant: "primary" as const,
    },
    {
      num: "04",
      title: "Every video is produced while you sleep.",
      body: "After approval, our team produces and personally reviews every video in the background — scripts, scenes, subtitles, final MP4. Every video is human-checked before it's done.",
      pill: "7 videos generated automatically",
      pillVariant: "primary" as const,
    },
    {
      num: "05",
      title: "Posts to Facebook. You just check the results.",
      body: "Auto-schedule to Facebook at peak times, save as drafts, or download the MP4s. You get an email each time a video is ready.",
      pill: "Autopilot from approval to publish",
      pillVariant: "success" as const,
    },
  ],
};

// ─── Before / After ───────────────────────────────────────────────────────────

export const COMPARISON = {
  withoutLabel: "Without ReelForge",
  withLabel: "With ReelForge",
  without: [
    "2–4 hours per video, every single day",
    "Blank page every morning — scripting from zero",
    "Manual recording, editing, exporting, captioning",
    "Posting gaps every time life gets in the way",
    "Algorithm punishes every missed day — ruthlessly",
    "Hiring editors or VAs just to keep pace",
    "Planning content in your head at midnight",
    "Burning out and going quiet for weeks at a time",
  ],
  with: [
    "10 minutes on Sunday. Your whole week is done.",
    "AI writes every script — hook, body, CTA included",
    "AI generates every scene, assembles every MP4",
    "Posts go live whether you're working or on holiday",
    "Consistent presence, without consistent effort",
    "No team needed — one tool runs the whole machine",
    "A full week of content visible before it's made",
    "The kind of output that used to require a studio",
  ],
  cta: {
    headline: "You already know which side you want to be on.",
    label: "Start for $5 → Your first week",
    subtext: "7 video credits · No monthly commitment · Takes 10 minutes",
    href: "/sign-up",
  },
};

// ─── Pricing ──────────────────────────────────────────────────────────────────

export const PRICING = {
  label: "Founding Member Pricing",
  headlineLine1: "Start for $5.",
  headlineLine2: "See your first week live.",
  subheadline:
    "7 video credits. A complete week of content. See a finished video live on your channel — then decide.",
  urgencyBanner:
    "Founding member pricing — first 100 subscribers lock in this rate for life.",
  urgencyNote: "Once 100 spots are claimed, rates go up — permanently.",
  monthlyNote: "All subscriptions billed monthly. Cancel any time.",
  footerNote:
    "All plans: 1080×1920 MP4 · Subtitles burned in · Auto-post to Facebook · Video library included",
  plans: [
    {
      name: "Try Out",
      nameStyle: "muted" as const,
      price: "$5",
      period: "one time",
      subPrice: "One full week. No strings attached.",
      features: [
        "7 video credits — a complete week",
        "AI-generated week plan",
        "Auto-post to your Facebook page",
        "Full visual style library",
        "Download your MP4s anytime",
      ],
      cta: "Try it for $5",
      href: "/sign-up",
      highlighted: false,
    },
    {
      name: "Starter",
      nameStyle: "muted" as const,
      price: "$49",
      period: "/ month",
      subPrice: "1 video/day · 30 videos/month · ~$1.63 each",
      features: [
        "1 video per day, every day",
        "30 videos per month",
        "Unlimited week plans",
        "Auto-schedule or save as drafts",
        "Email when your videos are ready",
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
      subPrice: "3 videos/day · 90 videos/month · ~$1.10 each",
      features: [
        "3 videos per day — maximum consistency",
        "90 videos per month",
        "Everything in Starter",
        "Priority generation queue",
        "Multiple brand profiles",
      ],
      cta: "Go Pro",
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
      question: "What kind of videos does ReelForge create?",
      answer:
        "ReelForge creates short-form vertical videos (1080×1920) formatted for Facebook Reels and video posts. Each video is scripted with a hook, body content, and a call to action — tailored to your niche. Styles include cinematic, UGC-style, tutorial, and story formats. Every video comes with burned-in subtitles and is assembled as a finished MP4, ready to post.",
    },
    {
      question: "Will the videos look obviously AI-generated?",
      answer:
        "Not if you use the brand profile properly. ReelForge builds you a consistent AI brand character — a visual identity that carries across every scene, week after week. Scripts are written for your specific niche, tone, and audience. And every video is personally reviewed by our team before it's marked ready. You get finished, human-checked content — not raw AI output you'd be embarrassed to put your name on.",
    },
    {
      question: "What Facebook pages can I connect?",
      answer:
        "Any Facebook page you administer — business pages, creator pages, and brand pages all work. You connect via secure Facebook OAuth, so we never see or store your password. You can connect multiple pages and manage each as a separate brand profile.",
    },
    {
      question: "What happens if I cancel?",
      answer:
        "Nothing bad. The $5 Try Out plan is a one-time purchase with no subscription to cancel — your 7 credits stay available until you use them. On monthly plans, you can cancel any time from your billing page. You keep access until the end of your current billing period. No fees, no penalties.",
    },
    {
      question: "Do I need to film anything or be on camera?",
      answer:
        "No. ReelForge builds an AI brand character and generates every scene for you. You never need a camera, a microphone, a studio, or to show your face. Faceless content brands and creators run their entire Facebook presence through ReelForge without ever filming a thing.",
    },
    {
      question: "Do I need to be online while my videos are produced?",
      answer:
        "No — and that's the entire point. Once you approve your week plan, the pipeline runs completely in the background. Scripts get written, scenes get generated, MP4s get assembled. You could be asleep, at the gym, or on a flight. You get an email each time a video is ready. You don't babysit anything.",
    },
    {
      question: "Who actually makes the videos?",
      answer:
        "AI drafts the script and every scene — then our team personally reviews and produces each video before it's marked ready. You get human-checked quality, not raw, unedited AI output. It's the difference between content you'd happily put your brand name on and content you wouldn't.",
    },
    {
      question: "Will the content actually sound and look like my brand?",
      answer:
        "Yes. When you connect your Facebook page, ReelForge reads it and proposes your niche, tone, and visual style — you just review and adjust. From that we build your AI brand character: a consistent visual identity that appears across every scene of every video, week after week. Your audience won't be able to tell which videos you made personally and which ones ReelForge made for you.",
    },
    {
      question: "What does 'auto-post' actually mean?",
      answer:
        "When you approve your week plan, you choose how your videos publish to your Facebook page: auto-scheduled at peak engagement times, saved as drafts for you to review first, or downloaded as MP4s so you post them yourself. The videos are already made. How and when they go live is entirely your call.",
    },
    {
      question: "Can I edit the plan before I approve it?",
      answer:
        "Yes — every topic, every hook, every format is editable before you hit Approve. The plan ReelForge generates is a first draft. You're the editor. Most people approve with zero changes. Some tweak a few titles. A few rebuild the whole thing. All options exist — the approval step is yours, always.",
    },
    {
      question: "What if I don't like how one of the videos came out?",
      answer:
        "If you're saving videos as drafts, you review every one on your Facebook page before it goes public. If you're using 'Download Only' mode, you decide what gets posted. The system never publishes anything without the rules you set upfront. You're in control — you've just stopped doing the work.",
    },
    {
      question: "Is the $5 Try Out plan really one-time, no strings?",
      answer:
        "$5. One time. 7 video credits — enough for one full week of content. No subscription starts automatically. No card-on-file surprise. Use your credits whenever you're ready. It's the fastest way to see a finished, human-reviewed video live on your actual Facebook page — for the cost of a coffee.",
    },
    {
      question: "How is this different from just using ChatGPT and CapCut?",
      answer:
        "You could assemble tools yourself. You'd write prompts for every scene, generate images one by one, stitch them into video manually, sync subtitles by hand, upload to Facebook, schedule the post, then do it again tomorrow. That's still hours of work per video. ReelForge isn't a better shovel. It's the whole machine — plan, generate, assemble, review, post — running on autopilot. There's a difference between a tool and a system.",
    },
  ],
};

// ─── Final CTA ────────────────────────────────────────────────────────────────

export const FINAL_CTA = {
  headlineLine1: "Stop posting content",
  headlineLine2: "the slow,",
  headlineAccent: "manual way.",
  headlineLine3: "Start the machine.",
  body: [
    "Ten minutes this Sunday.",
    "Seven videos live on your Facebook page by Monday.",
  ],
  cta: {
    label: "Start your first week — $5",
    subtext: "7 video credits · No subscription · 10 minutes to set up",
    href: "/sign-up",
  },
};

// ─── Footer ───────────────────────────────────────────────────────────────────

export const FOOTER = {
  copyright: `© ${new Date().getFullYear()} ReelForge. All rights reserved.`,
  links: [{ label: "Privacy Policy", href: "/privacy" }],
  platforms: ["Facebook Reels", "Facebook Video", "Facebook Stories"],
};
