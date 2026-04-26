# ReelForge — Landing Page Web Copy & Design Specification
**Version 3.0 — All issues resolved**

---

## CHANGELOG v3.0
- Fixed: "Five platforms" → "Four platforms" in hero (factual error)
- Fixed: "No credit card stored" → "Secured by Stripe" (accuracy)
- Fixed: Proof strip stat "100+ voices" → "< 10 min active effort" (outcome-focused)
- Added: Section 05 — Solution Reveal (emotional beat between problem and pipeline)
- Removed: Features section (was redundant with pipeline)
- Added: Section 08 — Before/After Comparison (replaces Features; breaks 3-grid-in-a-row fatigue with structurally different layout)
- Merged: Subtitle Styles folded into Visual Styles section (section 07) as a sub-section
- Added: Urgency mechanism in pricing — Founding Member framing
- Added: FAQ Q7 — "How is this different from ChatGPT + ElevenLabs myself?"
- Fixed: Pipeline step labels changed from technology names to benefit-oriented labels

---

## DESIGN SYSTEM REFERENCE

```
Background layers (darkest → lightest):
  --bg-base:     #0A0A0F   ← page canvas
  --bg-surface:  #13131A   ← cards, panels
  --bg-elevated: #1C1C27   ← raised elements, inputs

Accent palette:
  --accent-primary:   #7C5CFC   ← CTA purple (primary action)
  --accent-secondary: #5B8DEF   ← blue (secondary accent)
  --accent-success:   #34D399   ← green (trust, check marks)
  --accent-warning:   #FBBF24   ← yellow (highlight, word-by-word subtitle)
  --accent-danger:    #F87171   ← red (errors, before-state)

Text:
  --text-primary:   #F4F4F8   ← headings, key info
  --text-secondary: #9898B0   ← body, supporting copy
  --text-muted:     #5A5A72   ← labels, captions

Typography:
  UI font:   Inter (weights 400, 500, 600, 700, 800, 900)
  Code font: JetBrains Mono
  Base unit: 4px spacing grid

Page max-width: 1200px, centered, 24px horizontal padding on mobile
```

---

## PAGE ARCHITECTURE

```
01  NAV              — Sticky glassmorphism bar
02  HERO             — Full-viewport statement + animated product preview
03  PROOF STRIP      — 4 outcome-focused stats
04  PROBLEM          — Three-act emotional build
05  SOLUTION REVEAL  — NEW: emotional exhale before the how
06  PIPELINE         — 7-step how it works (zig-zag journey)
07  VISUAL STYLES    — 7 render styles + 4 subtitle styles (consolidated)
08  BEFORE/AFTER     — NEW: comparison layout, breaks grid fatigue
09  PRICING          — 3 plans with Founding Member urgency
10  FAQ              — 7 questions including ChatGPT objection
11  FINAL CTA        — Cinematic close
12  FOOTER           — Minimal
```

---

## 01 — NAVIGATION

### Visual Design
- **Position:** Fixed top. Full width. `z-50`.
- **Background:** `rgba(10, 10, 15, 0.7)` with `backdrop-filter: blur(20px)`. Adds `border-bottom: 1px solid rgba(255,255,255,0.05)` after user scrolls 60px.
- **Height:** 64px desktop / 56px mobile.
- **Layout:** `flex justify-between items-center`. Max-width container.

### Left — Logo
- Wordmark: **ReelForge** in Inter 600, 17px, `--text-primary`.
- Before the word: a 20×20px icon — a play button `▶` inside a rounded square, filled `--accent-primary`. No border. 8px gap.

### Center — Links (desktop only)
```
How it Works    Styles    Pricing    FAQ
```
- Inter 400, 14px, `--text-secondary`. Hover: `--text-primary`, 150ms. No underlines. 32px gap.

### Right
- **"Sign in"** link: Inter 500, 14px, `--text-secondary`. Hover → `--text-primary`.
- **"Start for $5"** button: Inter 600, 14px. Pill (`border-radius: 9999px`), `padding: 8px 20px`. Background `--accent-primary`. Text: white. Hover: `opacity: 0.9`, `box-shadow: 0 0 20px rgba(124,92,252,0.4)`. Transition 150ms.
- 16px gap between the two.

### Mobile
- Hamburger icon right side. Opens full-screen overlay, background `--bg-base`. Links: Inter 700, 28px, stacked vertically.

---

## 02 — HERO

### Layout
- `min-height: 100svh`. Flex column, centered horizontally. Content starts at 28% from top (slight upward bias — feels more premium than dead center).
- Background: `--bg-base`. Pure. No noise.
- Two decorative elements:
  1. Radial glow behind headline — `radial-gradient(ellipse 800px 500px at 50% 40%, rgba(124,92,252,0.12), transparent)`.
  2. Very faint dot grid at `opacity: 0.03` — `radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)` repeated at `32px 32px`. Depth without noise.

### Pre-Headline (Eyebrow)
```
YOUR IDEA → FINISHED VIDEO IN 10 MINUTES
```
- Inter 600, 11px, letter-spacing `0.15em`, ALL CAPS, `--accent-primary`.
- A thin `1px` left border in `--accent-primary`, `12px padding-left`. Inline-block.
- 24px above the main headline.

### Main Headline
```
Stop Making
Videos by Hand.
```
- Inter 900, **88px desktop / 52px mobile**. Line height `0.95`. Letter-spacing `-0.03em`. `--text-primary`.
- "Videos" has a wavy SVG underline in `--accent-primary`, drawn left-to-right over 0.8s via `stroke-dasharray` on page load. Not CSS text-decoration — a real positioned SVG.

### Sub-Headline
```
ReelForge turns your idea into a fully produced short-form video —
script, voiceover, visuals, subtitles, music — completely automated.
One pipeline. Four platforms. Under 10 minutes of your time.
```
- Inter 400, **20px desktop / 16px mobile**. Line height `1.6`. `--text-secondary`. Max-width 580px. Centered. 24px below headline.

### CTA Cluster
32px below sub-headline. `flex gap-3 justify-center flex-wrap`.

**Primary CTA:**
```
Start for $5 →
```
- Inter 700, 16px. Pill. `padding: 14px 32px`. Background `--accent-primary`. Text white.
- Hover: `box-shadow: 0 0 40px rgba(124,92,252,0.5)`, `transform: translateY(-1px)`. 200ms.
- The `→` moves 4px right on hover.
- Below button, 10px gap: Inter 400, 12px, `--text-muted`: "3 video credits · Secured by Stripe"

**Secondary CTA:**
```
▶  Watch how it works (90 sec)
```
- Inter 500, 15px. No fill. `border: 1px solid rgba(255,255,255,0.1)`. `padding: 14px 24px`. Pill.
- `▶` in `--accent-primary`, 12px. Text `--text-secondary`.
- Hover: border `rgba(124,92,252,0.4)`. Text `--text-primary`.
- Opens modal with 90-second product walkthrough video. *(Note: this video must be produced before launch — it's a primary conversion path.)*

### Hero Social Proof (48px below CTAs)
```
Joined by creators posting 5+ videos daily
```
- Inter 400, 13px, `--text-muted`. Centered.
- Below: 5 avatar circles overlapping by −8px (28px each, `2px solid --bg-base` border).
- Immediately right: `★★★★★` 12px `--accent-warning` + `"5.0 from early creators"` 12px `--text-muted`.

### Hero Product Preview (64px below proof)
- Static dark-mode screenshot of the Step 4 Scene Review grid (8–12 cinematic scene cards with generated images, purple action buttons).
- `perspective(1000px) rotateX(4deg)` tilt on load.
- On scroll 0–200px: smoothly animates to `rotateX(0deg)` — "rising" effect.
- `box-shadow: 0 40px 100px rgba(0,0,0,0.6)`. `border: 1px solid rgba(255,255,255,0.06)`. `border-radius: 16px`.
- Faint `--accent-primary` and `--accent-secondary` blobs on each side, `opacity: 0.08`, `blur: 120px`.
- Width: 90% of container, max `1000px`.
- **Mobile:** Hidden entirely for performance. Replace with a single-scene card mockup at full width.

---

## 03 — PROOF STRIP

### Visual Design
- Full-width band. Background `--bg-surface`. `border-top/bottom: 1px solid rgba(255,255,255,0.04)`. `padding: 28px 0`.
- Flex row, centered. `gap: 64px` desktop. Mobile: 2×2 grid.

### Stats
```
< 10 min              5+                   7                   4
Active effort         Videos / day         Visual styles       Platforms
per video             achievable           to choose from      supported
```
- Number: Inter 800, 36px, `--text-primary`.
- Label: Inter 400, 13px, `--text-muted`. Uppercase, letter-spacing `0.05em`.
- Vertical `1px rgba(255,255,255,0.06)` dividers between. Hidden mobile.

---

## 04 — PROBLEM

### Visual Design
- Background `--bg-base`. `padding: 120px 0` desktop / `80px 0` mobile.

### Section Label
```
THE REAL COST OF DOING IT MANUALLY
```
- Inter 600, 11px, `--text-muted`, letter-spacing `0.15em`, ALL CAPS. Centered.
- 16px below: `1px` horizontal rule, 40px wide, centered, `--accent-primary`.

### Headline
```
You're not short on ideas.
You're short on hours.
```
- Inter 800, **64px desktop / 40px mobile**. Line height `1.05`. Letter-spacing `-0.02em`. `--text-primary`. Centered.
- "hours" colored `--accent-danger`. Same weight — only color changes. The contrast lands the blow.

### Body (centered, max-width 600px)
```
The math is brutal. Every video you make by hand costs 2–4 hours.
Script. Record. Edit. Caption. Thumbnail. Repeat.

To post 5 videos a day — what the algorithm rewards —
you'd need to work 10–20 hours. On just content.

The creators growing fastest aren't more creative than you.
They've removed themselves from the production line.
```
- Inter 400, 18px, `--text-secondary`, line-height `1.7`. Three paragraphs, 28px between.
- "2–4 hours", "5 videos a day", "10–20 hours" — `--text-primary` weight 600. Weight only, no color. Pulls the eye to data.

### Three Pain Cards (64px below body)
`grid grid-cols-3 gap-6` desktop, `grid-cols-1` mobile.
Each: `background: --bg-surface`, `border: 1px solid rgba(255,255,255,0.05)`, `border-radius: 16px`, `padding: 32px`. No hover — statements, not links.

**Card 1 — The Time Tax**
- Icon: Timer SVG, 28px, `--accent-danger`.
- Title: Inter 700, 18px, `--text-primary`: "2–4 hours per video"
- Body: Inter 400, 15px, `--text-secondary`, line-height `1.6`: "Every video you make manually is time you can't spend growing, engaging, or stepping back. The more you produce, the less runway you have."

**Card 2 — Consistency Kills**
- Icon: Down-trend SVG, 28px, `--accent-warning`.
- Title: "Miss 3 days. Lose 3 weeks."
- Body: "The algorithm doesn't forgive gaps. One exhausted week undoes a month of momentum. Consistency isn't optional — it's the product."

**Card 3 — Burnout Is the Ceiling**
- Icon: Flame SVG, 28px, `--accent-primary`.
- Title: "You started to create. Not to grind."
- Body: "Somewhere between the fifteenth edit and the third retake, the joy leaves. Burnout is what happens when output becomes the only mode."

---

## 05 — SOLUTION REVEAL *(new section)*

> **Design intent:** This is the emotional exhale after the problem section. It should feel like a breath of air. Not a product feature list — a single moment of relief. One viewport. Minimal elements. Maximum emotional impact.

### Visual Design
- Background: `--bg-surface`. `padding: 140px 0`.
- Center of section: a large radial glow — `radial-gradient(ellipse 900px 500px at 50% 50%, rgba(124,92,252,0.1), transparent)`. Warm, like a light turning on.
- No section label. No grid. Just the words, the visual, and one CTA.

### Headline
```
There's a better way
to run a content channel.
```
- Inter 800, **72px desktop / 44px mobile**. Line height `1.0`. Letter-spacing `-0.03em`. `--text-primary`. Centered.
- "better way" — colored `--accent-primary`. The phrase the whole page has been building to.

### Body (32px below headline, centered, max-width 560px)
```
What if writing the script, recording the voice, generating the visuals,
and assembling the final video weren't your job anymore?

What if your only job was the idea — and 10 minutes of review?

That's ReelForge.
```
- Inter 400, 20px, `--text-secondary`, line-height `1.7`.
- "That's ReelForge." — Inter 700, 20px, `--text-primary`. The period lands hard.

### Pipeline Visual (48px below body)
A horizontal arrow diagram — not a product screenshot. A simple, clean infographic:

```
[ Your Idea ]  →  [ Script ]  →  [ Voice ]  →  [ Visuals ]  →  [ Video ]
```

- Each node: a pill-shaped label, `background: --bg-elevated`, `border: 1px solid rgba(255,255,255,0.07)`, Inter 600, 13px, `--text-secondary`. `border-radius: 9999px`. `padding: 8px 20px`.
- Arrows between: `--accent-primary`, 1.5px, with animated pulse — a traveling dot that slides along the arrow path every 2s, looping. Subtle. Not distracting.
- Below the last node, a small pulse animation: the "Video" pill briefly glows `--accent-success` every 3 seconds — like a "ready" signal.
- This entire diagram is max-width `680px`, centered. On mobile: vertical stack with arrows pointing down.

### Inline CTA (40px below diagram)
```
See the full pipeline →
```
- Anchor link to Section 06. Inter 600, 15px, `--accent-primary`. No background. Right arrow moves 4px right on hover. Centered.

---

## 06 — PIPELINE

### Visual Design
- Background `--bg-base`. `padding: 120px 0`.

### Section Label
```
THE REELFORGE PIPELINE
```
Same label style throughout. Centered.

### Headline
```
One idea in.
Finished video out.
```
- Inter 800, **64px desktop / 40px mobile**. Letter-spacing `-0.02em`. Centered. "Finished video" colored `--accent-primary`.

### Sub-headline
```
Seven steps. Under 10 minutes of your attention.
The rest is automated.
```
- Inter 400, 20px, `--text-secondary`. Centered. Max-width 480px.

### Layout (80px below sub-headline)
**Desktop:** Alternating left/right zig-zag. Thin vertical connecting line down the center — `1px`, `linear-gradient(to bottom, transparent, --accent-primary 30%, --accent-primary 70%, transparent)`. Line passes through numbered circles: 28px diameter, `border: 1.5px solid --accent-primary`, `background: --bg-base`, Inter 700 14px `--accent-primary`.

**Mobile:** Single column. Line runs down the left side.

Each card: `background: --bg-surface`, `border: 1px solid rgba(255,255,255,0.05)`, `border-radius: 20px`, `padding: 36px`. Max-width `480px`.
On scroll-into-view: fade in + slide up 24px, 400ms ease-out. Staggered 80ms per step.

---

**Step 01 — Your Idea**
- Label: Inter 600, 11px, `--accent-primary`, letter-spacing `0.1em`: "START HERE"
- Title: Inter 700, 22px, `--text-primary`: "Type an idea — or let AI brainstorm one for you"
- Body: "Open a project and type your topic — 'Why most people fail at saving money' — and go. Or switch to Brainstorm mode: ReelForge gives you three distinct angle options. Pick one and the pipeline fires."
- Visual element: small UI mockup — a text input with placeholder "What's your video about?" and two option pills: "Brainstorm ideas" (outlined) and "Go straight to script" (filled purple).

**Step 02 — AI Script**
- Label: Inter 600, 11px, `--text-muted`, letter-spacing `0.1em`: "WRITTEN BY AI, APPROVED BY YOU"
- Title: "A script written for your niche, your platform, your audience"
- Body: "Claude writes a hook-first, CTA-ending script calibrated to your channel's style, tone, and language. Not a template — a purpose-built script. Edit it freely, approve it, or regenerate with one click."
- Detail pill: Inter 500, 12px, `rgba(124,92,252,0.1)` bg, `1px solid rgba(124,92,252,0.2)` border, `--accent-primary`, pill: "< 8 seconds to generate"

**Step 03 — Voiceover**
- Label: "BROADCAST QUALITY, ANY LANGUAGE"
- Title: "Natural-sounding voice, with millisecond-accurate word timing"
- Body: "ElevenLabs generates a voiceover in the voice you chose for this channel. Every word comes back with an exact timestamp — so subtitles sync to the frame, automatically. Play it. Approve it. Or regenerate."
- Detail pill: "30+ languages · < 15 seconds"

**Step 04 — Scene Visuals**
- Label: "AI-DIRECTED, SCENE BY SCENE"
- Title: "8–12 scenes. Each with a generated base image."
- Body: "Claude breaks your script into scenes and writes a cinematically precise prompt for each. Grok generates all base images in parallel — 8–12 images in roughly 15 seconds. Regenerate any image, edit any prompt, or upload your own. Every frame is your call."
- Visual element: 2×3 grid of tiny image cards — shimmer loading state cycling to generated state. CSS animation.

**Step 05 — Visual Style**
- Label: "SET ONCE, APPLIED EVERYWHERE"
- Title: "Choose how your video looks — and it stays consistent, every scene"
- Body: "Pick your render style when you create a channel: Cinematic, Cartoon, Mascot, 2D Animation, Motion Graphics, Whiteboard, or Stock Footage. Every generated image and every video clip follows that style exactly — no drift, no inconsistency."
- 7 style badges below body: Cinematic · Cartoon · Mascot · 2D Animation · Motion Graphics · Whiteboard · Stock Footage. Inter 500, 11px, `--text-muted`, `background: --bg-elevated`, pill, `padding: 3px 10px`.

**Step 06 — Subtitles & Music**
- Label: "TWO DECISIONS. THEN YOU'RE DONE."
- Title: "Pick a subtitle style. Toggle music. Submit."
- Body: "Four subtitle styles — Bold Pop, Word-by-Word Highlight, Minimal, Cinematic — burned directly into the final MP4. Add background music from the curated royalty-free library. FFmpeg ducks the music under your voice automatically."

**Step 07 — Submit & Step Away**
- Label: "FULLY AUTOMATED FROM HERE"
- Title: "Hit Generate. Close the tab. Get an email."
- Body: "Clips are generated, assembled in scene order, audio is mixed, subtitles are burned, and the final 1080×1920 MP4 is rendered. You get an email with a download link when it's done. No babysitting. No progress bar watching."
- Detail pill: `--accent-success` border/text: "Average queue-to-email: under 60 minutes"

---

## 07 — VISUAL STYLES & SUBTITLE STYLES

> **Design note:** Subtitle Styles is merged here as a sub-section. This consolidates two previously separate grid sections into one, breaking the three-consecutive-grids pacing problem.

### Visual Design
- Background `--bg-surface`. `padding: 120px 0`.

### Section Label
```
CHOOSE YOUR LOOK
```

### Headline
```
7 visual styles.
4 subtitle styles.
Zero compromises.
```
- Inter 800, 56px, `--text-primary`. Centered. Letter-spacing `-0.02em`.
- "Zero compromises." — colored `--accent-primary`. The payoff line.

### Sub-headline
```
Set your render style once per channel. 
Every image, every clip, every subtitle follows it — automatically.
```
- Inter 400, 18px, `--text-secondary`. Centered. Max-width 520px.

---

### Part A — Visual Style Grid

`grid grid-cols-4 gap-4` desktop (first 4), `grid-cols-3 gap-4` (second row, 3 items). Tablet: `grid-cols-2`. Mobile: horizontal scroll carousel.

Each card:
- `background: --bg-elevated`
- `border: 1px solid rgba(255,255,255,0.05)`
- `border-radius: 20px`
- `padding: 28px 24px`
- Hover: `border-color: --accent-primary`, `transform: translateY(-4px)`, `box-shadow: 0 8px 40px rgba(124,92,252,0.15)`. 200ms.

Card anatomy: icon (40px, rounded 12px bg) → style name (Inter 700, 17px) → mood tag (Inter 500, 12px, `--text-muted`, italic) → two-sentence description (Inter 400, 14px, `--text-secondary`).

---

**1. Cinematic**
- Icon bg: `rgba(91,141,239,0.15)`. Icon: film reel SVG, `--accent-secondary`.
- Mood: "Photorealistic · Immersive · Documentary feel"
- Copy: "Real-world photography and cinematic composition. Your script becomes a narrative, each scene a carefully composed shot. Looks like a Netflix short. Best for storytelling and lifestyle niches."

**2. Cartoon**
- Icon bg: `rgba(251,191,36,0.15)`. Icon: cartoon face, `--accent-warning`.
- Mood: "2D flat · Expressive · Maximum personality"
- Copy: "Bold outlines, saturated colors, exaggerated expressions and emotion bubbles. Impossible to scroll past. Built for niches that need to entertain before they can educate."

**3. Mascot**
- Icon bg: `rgba(52,211,153,0.15)`. Icon: character silhouette, `--accent-success`.
- Mood: "3D character · Brand identity · Playful"
- Copy: "Your topic becomes a 3D cartoon character that physically IS the subject — a talking egg for nutrition, a coin for finance. The mascot drives every scene. Built for channels building a recognizable identity."

**4. 2D Animation**
- Icon bg: `rgba(124,92,252,0.15)`. Icon: geometric shape cluster, `--accent-primary`.
- Mood: "Clean · Explainer · Vector-style"
- Copy: "Flat vector illustration. Clean icons, geometric shapes, bold diagrams. No characters — pure visual storytelling through shapes. The go-to style for educational and explainer content."

**5. Motion Graphics**
- Icon bg: `rgba(248,113,113,0.15)`. Icon: kinetic `Aa`, `--accent-danger`.
- Mood: "Kinetic · High-energy · Data-driven"
- Copy: "Stats, facts, and bold claims — each a graphic reveal. Ultra-fast pacing. Every sentence feels like it's been shot out of a cannon. Built for hooks that stop the scroll before the first second."

**6. Whiteboard**
- Icon bg: `rgba(255,255,255,0.07)`. Icon: marker/pen, `--text-secondary`.
- Mood: "Tutorial · Step-by-step · Trustworthy"
- Copy: "Hand-drawn visuals that build as the narration explains. The classic explainer format viewers trust for learning complex things simply. Best for how-to, finance, and skill-building niches."

**7. Stock Footage**
- Icon bg: `rgba(91,141,239,0.1)`. Icon: camera, `--accent-secondary`.
- Mood: "Professional · Polished · Brand-ready"
- Copy: "Warm, real-world visuals that feel like brand content. Polished studio aesthetic without the crew. For creators who want to look established before they are."

---

### Part B — Subtitle Styles

> Design: This sub-section sits **below the style grid with a 96px gap** and a thin `1px rgba(255,255,255,0.05)` divider. It's visually part of the same section but feels like a new chapter — no new background color needed.

### Sub-headline
```
Then choose how your words land.
```
- Inter 700, 32px, `--text-primary`. Centered. 48px below divider.

```
85% of short-form video is watched on mute. 
Subtitles aren't decoration — they're your voice.
```
- Inter 400, 17px, `--text-secondary`. Centered. Max-width 440px. 16px below sub-headline.

### 4-card grid (48px below copy)
`grid grid-cols-4 gap-4` desktop. `grid-cols-2` tablet. `grid-cols-1` mobile.

Each card: `background: --bg-base`, `border: 1px solid rgba(255,255,255,0.05)`, `border-radius: 20px`, `overflow: hidden`.
Top 160px: **visual preview area** on `--bg-base`. Contains a fake phone-screen viewport (dark rounded rectangle, no chrome) showing the subtitle style rendered live with example text.
Bottom: `padding: 20px 20px 24px`.

---

**Card 1 — Bold Pop**
- Preview: "SAVE YOUR MONEY" centered, large bold white text. The word "YOUR" inside a yellow `--accent-warning` pill. Black drop shadow.
- Name: Inter 700, 15px: "Bold Pop"
- Badge: `--accent-warning` tint pill: "Most Popular"
- Body: Inter 400, 13px, `--text-secondary`: "Large center-screen text with the active word highlighted yellow. Built for fast, high-energy content."

**Card 2 — Word Highlight**
- Preview: Words appearing at slightly different scales — oldest at 70%, newest at 100%. Implies sequential reveal. White text on dark.
- Name: "Word Highlight"
- Badge: `--accent-primary` tint: "Most Engaging"
- Body: "Each word scales into frame at its exact timestamp. Hypnotic and precise. Best when every word carries weight."

**Card 3 — Minimal**
- Preview: Small white text, bottom third, quiet. No background. No shadow. Three words: "Start saving now."
- Name: "Minimal"
- Badge: `--text-muted` tint: "Clean"
- Body: "Unobtrusive sentence-level text at the bottom third. Lets the visuals lead."

**Card 4 — Cinematic**
- Preview: White text on a semi-transparent black bar spanning full width, bottom third.
- Name: "Cinematic"
- Badge: `--accent-secondary` tint: "Premium Feel"
- Body: "Film-style subtitle band. Borrowed from documentary aesthetics. Elevates every frame."

---

## 08 — BEFORE / AFTER COMPARISON *(new section)*

> **Design intent:** This breaks the visual rhythm after two card-grid sections. It uses a two-column split layout — structurally different from everything above it. No cards, no icons. Raw comparison. Creates the highest-intensity desire just before pricing.

### Visual Design
- Background `--bg-base`. `padding: 120px 0`.
- The two columns sit inside a single container card: `background: --bg-surface`, `border: 1px solid rgba(255,255,255,0.06)`, `border-radius: 28px`, `overflow: hidden`. Max-width `960px`, centered.
- Left column (Without): `border-right: 1px solid rgba(255,255,255,0.05)`.
- No section label or headline above the card — drop straight into it. The contrast is the message.

### Layout
`grid grid-cols-2` — equal halves. Mobile: `grid-cols-1`, stacked (Without on top, With below).

### Left Column — Without ReelForge
- Column header: `padding: 32px 40px 0`. Inter 700, 11px, letter-spacing `0.12em`, ALL CAPS, `--accent-danger`: "WITHOUT REELFORGE"
- A thin `1px solid rgba(248,113,113,0.2)` underline below the header text, `width: 100%`.
- Content: `padding: 24px 40px 40px`.
- 8 line items. Each: a `✕` icon in `--accent-danger` (14px) + Inter 400, 16px, `--text-secondary` text. `gap: 20px` between items.

```
✕  2–4 hours per video, every day
✕  Manual scripting — blank page, every time
✕  Hiring voice actors or recording yourself
✕  Finding, licensing, and editing B-roll footage
✕  Subtitle sync done by hand or outsourced
✕  Posting gaps when life interrupts
✕  One channel at a time
✕  Burnout as a growth ceiling
```

- Column footer (bottom of left col): a faint, blurred `--accent-danger` radial glow at `opacity: 0.06`. Barely perceptible — feels dimmer than the right column.

### Right Column — With ReelForge
- Column header: `padding: 32px 40px 0`. Inter 700, 11px, letter-spacing `0.12em`, ALL CAPS, `--accent-success`: "WITH REELFORGE"
- `1px solid rgba(52,211,153,0.2)` underline.
- Content: `padding: 24px 40px 40px`.
- 8 matching line items. Each: `✓` icon in `--accent-success` (14px) + Inter 600, 16px, `--text-primary`.

```
✓  Under 10 minutes active effort per video
✓  Claude writes the script from your idea
✓  ElevenLabs voices it in 30+ languages
✓  7 visual styles, AI-generated per scene
✓  Subtitles synced to the millisecond, automatically
✓  New video ready every time you have an idea
✓  Multiple channels, all running simultaneously
✓  A system that scales while you sleep
```

- Column footer: a `--accent-primary` radial glow at `opacity: 0.08`. The right side feels warmer, lit, alive.

### Below the comparison card (48px gap)
```
Ready to switch sides?
```
- Inter 800, 36px, `--text-primary`. Centered.
- Below, 16px: Primary CTA button "Start for $5 →" — same spec as hero CTA but slightly smaller (`padding: 12px 28px`, Inter 700, 15px).
- Below button, 10px: Inter 400, 12px, `--text-muted`: "3 video credits · No monthly commitment · Secured by Stripe"

---

## 09 — PRICING

### Visual Design
- Background `--bg-base`. `padding: 120px 0`.

### Section Label
```
FOUNDING MEMBER PRICING
```
- `--accent-warning` (not `--text-muted`) — this label is different from every other section label. It signals urgency.

### Headline
```
Start for $5.
Scale when you're ready.
```
- Inter 800, 64px, `--text-primary`. Centered. Letter-spacing `-0.02em`. "$5" colored `--accent-primary`.

### Sub-headline
```
Try the full pipeline with 3 video credits.
See a finished video. Then decide.
```
- Inter 400, 18px, `--text-secondary`. Centered. Max-width 480px.

### Urgency Banner (24px below sub-headline)
A full-width pill-shaped banner inside the max-width container:
- `background: rgba(251,191,36,0.08)`. `border: 1px solid rgba(251,191,36,0.2)`. `border-radius: 12px`. `padding: 14px 24px`.
- Left: `⚡` emoji or lightning bolt SVG in `--accent-warning`.
- Text: Inter 600, 14px, `--text-primary`: "Founding member pricing — subscription rates are locked in for the life of your account when you join during launch."
- Right: Inter 400, 13px, `--text-muted`: "Rates increase after launch period."

### Notice (12px below banner)
Inter 400, 13px, `--text-muted`. Centered: "All subscriptions billed monthly. Cancel any time."

---

### Pricing Cards
`grid grid-cols-3 gap-6` desktop. `grid-cols-1` mobile. 48px below notice.

Cards: `background: --bg-surface`, `border: 1px solid rgba(255,255,255,0.06)`, `border-radius: 24px`, `padding: 36px`.

**Pro card only:** `border: 1.5px solid --accent-primary`. `box-shadow: 0 0 60px rgba(124,92,252,0.15)`. Badge: absolute `−16px` top center, `background: --accent-primary`, Inter 700 11px white, pill, `padding: 4px 16px`: "Most Popular"

---

**Plan 1 — Try Out**
- Name: Inter 600, 14px, `--text-muted`, uppercase, letter-spacing `0.1em`: "TRY OUT"
- Price: Inter 900, 48px, `--text-primary`: "$5" + Inter 400, 14px, `--text-muted`: "one time"
- Sub-price: Inter 400, 13px, `--text-muted`: "No subscription. Use your 3 credits at any time."
- Features (each: `✓` in `--accent-success`, Inter 400, 14px, `--text-secondary`):
  - 3 complete video credits
  - All 7 visual styles
  - All 4 subtitle styles
  - 20+ AI voices · 4 platforms
- CTA: full-width, `border: 1px solid rgba(255,255,255,0.1)`, `background: --bg-elevated`, Inter 600, 14px, `--text-primary`: "Get Started for $5". Hover: border `--accent-primary`, glow.

**Plan 2 — Starter**
- Name: Inter 600, 14px, `--text-muted`, uppercase: "STARTER"
- Price: Inter 900, 48px: "$49" + `/ month` in `--text-muted`.
- Sub-price: Inter 400, 13px, `--text-muted`: "~$0.33 per video at 5/day"
- Features:
  - 5 videos per day
  - 150 videos per month
  - All platforms & visual styles
  - BGM library + auto-ducking
  - Email delivery on completion
- CTA: "Start Starter Plan". Same ghost style as Try Out.

**Plan 3 — Pro**
- Name: Inter 600, 14px, `--accent-primary`, uppercase: "PRO"
- Price: Inter 900, 48px: "$99" + `/ month`.
- Sub-price: "~$0.22 per video at 15/day"
- Features (bolded):
  - **15 videos per day**
  - **450 videos per month**
  - All Starter features included
  - Priority generation queue
  - Custom voice prompts per project
- CTA: `background: --accent-primary`, white, Inter 700, 14px: "Start Pro Plan". Hover: `opacity: 0.9`, `box-shadow: 0 0 30px rgba(124,92,252,0.4)`.

### Below cards (32px gap)
Inter 400, 13px, `--text-muted`. Centered:
```
All plans: 1080×1920 MP4 · H.264 + AAC · 30fps · 7-day shareable links · Video library
```

---

## 10 — FAQ

### Visual Design
- Background `--bg-surface`. `padding: 120px 0`. Clean accordion, no extra chrome.

### Section Label
```
COMMON QUESTIONS
```

### Headline
```
Honest answers.
```
- Inter 800, 56px, `--text-primary`. Left-aligned in `max-width: 720px` centered container.

### Accordion (7 items)
Each item: `border-bottom: 1px solid rgba(255,255,255,0.06)`. `padding: 24px 0`.
Question: Inter 600, 18px, `--text-primary`. Cursor pointer. Right: `+` / `×` icon (16px, `--text-muted`), rotates 45° on open, 200ms.
Answer: Inter 400, 16px, `--text-secondary`, line-height `1.7`. Reveals via max-height animation, 300ms ease-out. `padding-top: 16px`.

---

**Q1: How is this different from just using ChatGPT and ElevenLabs myself?**
A: "You could assemble those tools yourself — and you'd spend your time doing it. You'd write prompts for each scene, generate images one by one, feed them into a video tool, manually line up the audio, burn the subtitles, export, and repeat. For every video. ReelForge isn't a collection of AI tools — it's a production pipeline. The orchestration, the scene direction, the timing sync, the FFmpeg assembly — that's the product. The AI tools are the ingredients. ReelForge is the kitchen."

**Q2: Will the videos look AI-generated?**
A: "Depends on the style you choose, and that's intentional. Cinematic style produces photorealistic imagery — indistinguishable from stock footage for most niches. Cartoon, Mascot, and Motion Graphics are designed to look stylized — that's the aesthetic, and it performs extremely well on short-form platforms. Every style was chosen because it works on the platforms people actually use."

**Q3: How much time does it actually take per video?**
A: "Under 10 minutes of your active attention. You review the script (~2 min), approve or adjust the voiceover (~1 min), review 8–12 scene images (~3 min), pick a subtitle style and toggle music (~1 min), and submit. Everything after that runs without you. You don't watch it render. You get an email."

**Q4: Can I control what the videos look like?**
A: "Yes — at every level. You set the visual render style for each channel. For each scene you can regenerate the base image, edit the visual prompt directly, or upload your own image. You read and edit the script before anything generates. The automation handles production. You keep creative direction."

**Q5: What languages does it support?**
A: "Any language ElevenLabs covers — 30+ including English, Spanish, Hindi, Bengali, Portuguese, French, German, and many more. Language is set at the channel level. Your script, voiceover, and subtitle files all match."

**Q6: How does the subscription work?**
A: "Starter is $49/month — 5 videos/day, up to 150/month. Pro is $99/month — 15/day, up to 450/month. Both month-to-month, no annual commitment. Cancel any time from your Billing page. Access runs to the end of your billing period."

**Q7: How long does it take from submitting to receiving the finished video?**
A: "The clip generation queue processes in order across all users. Average queue-to-email time is under 60 minutes. During high-demand periods it may be longer — your dashboard shows live queue position. You don't need to stay on the page; the email lands in your inbox when it's done."

---

## 11 — FINAL CTA

### Visual Design
- Background `--bg-base`. `padding: 160px 0`.
- Center: large radial glow — `radial-gradient(ellipse 1000px 600px at 50% 50%, rgba(124,92,252,0.12), transparent)`. The room feels lit from within.
- No section label. No dividers. Just words and button.

### Headline
```
The creators winning
tomorrow started
automating yesterday.
```
- Inter 900, **80px desktop / 48px mobile**. Line height `0.95`. Letter-spacing `-0.03em`. Centered. `--text-primary`.
- "automating" — `--accent-primary`. One word. The whole argument.

### Body (32px below headline, max-width 480px, centered)
```
Your ideas deserve to exist at scale.
Not rationed by how many hours you can work.
```
- Inter 400, 20px, `--text-secondary`. Line-height `1.7`.

### CTA (40px below body)
```
Start for $5 — your first 3 videos →
```
- Pill button. Inter 700, 18px. `padding: 18px 40px`. `background: --accent-primary`. White text. `border-radius: 9999px`.
- Hover: `box-shadow: 0 0 60px rgba(124,92,252,0.5)`, `transform: translateY(-2px)`. 250ms.

### Below button (16px gap)
```
3 video credits · No monthly commitment · Secured by Stripe
```
- Inter 400, 13px, `--text-muted`. Centered.

---

## 12 — FOOTER

### Visual Design
- Background `--bg-surface`. `border-top: 1px solid rgba(255,255,255,0.05)`. `padding: 48px 0 32px`.

### Top Row
- Left: ReelForge wordmark + icon (same as nav).
- Right: Inter 400, 14px, `--text-muted` — "Privacy Policy · Terms of Service · Contact"

### Bottom Row (16px below)
- Left: `© 2026 ReelForge. All rights reserved.` Inter 400, 13px, `--text-muted`.
- Right: decorative platform pills — TikTok · Instagram · YouTube Shorts · Facebook Reels. Inter 400, 12px, `--text-muted`. `background: --bg-elevated`. Pill. `padding: 4px 10px`.

---

## META / SEO

**`<title>`:**
`ReelForge — AI Short-Form Video Generator | Script to MP4 in Under 10 Minutes`

**`<meta name="description">`:**
`ReelForge automates the full short-form video pipeline — Claude writes your script, ElevenLabs voices it, AI generates your visuals in 7 styles, and FFmpeg assembles the final MP4. TikTok, Instagram, YouTube Shorts, Facebook Reels. Start for $5.`

**Open Graph:**
```
og:title       → Stop Making Videos by Hand. Start With ReelForge.
og:description → One idea in. Finished video out. Under 10 minutes of your time.
og:image       → Dark-mode Step 4 Scene Review grid — 
                 8 cinematic scene cards, purple accent highlights, ReelForge UI.
```

---

## PAGE ANIMATION SUMMARY

| Element | Animation | Trigger |
|---------|-----------|---------|
| Hero headline underline SVG | Draw left-to-right, 0.8s | Page load, once |
| Hero product mockup | `rotateX(4deg → 0deg)` | Scroll 0–200px |
| Solution reveal pipeline diagram | Traveling dot pulses along arrows | Loop, every 2s |
| Solution reveal "Video" node | Brief `--accent-success` glow | Loop, every 3s |
| Pipeline step cards | Fade + slide-up 24px, staggered 80ms | Scroll into view |
| Style cards hover | `translateY(-4px)` + glow | Hover |
| Before/After columns | Left fades in from left, right from right, 400ms | Scroll into view |
| Pricing urgency banner | Static — no animation (urgency shouldn't wiggle) | — |
| Pricing Pro card | Persistent glow, static | — |
| FAQ accordion | max-height expand, 300ms ease-out | Click |
| Final CTA button | `translateY(-2px)` + glow | Hover |
| Nav bar border | Appears after 60px scroll | Scroll |

---

## MOBILE BREAKPOINTS

| Breakpoint | Change |
|------------|--------|
| `< 1024px` (tablet) | Nav center links hidden. Pipeline → single column. Style grid `2-col`. Subtitle style grid `2-col`. |
| `< 768px` (mobile) | All grids → `1-col`. Hero headline `52px`. Hero product mockup → single scene card. Before/After → stacked. |
| `< 375px` (small mobile) | CTA buttons full-width. Headlines `44px`. Proof strip `2×2`. |

---

## PRODUCTION DEPENDENCIES (pre-launch checklist)

These items are referenced in the copy but don't exist yet:

| Item | Used in | Priority |
|------|---------|----------|
| 90-second product demo video | Hero secondary CTA | High — primary conversion path |
| 5 real user avatar photos or approved silhouettes | Hero social proof | Medium |
| Real `★★★★★` testimonials to replace placeholder | Hero proof | High before public launch |
| Actual founding member deadline / date | Pricing urgency banner | Must be set before launch |

---

## TYPOGRAPHY SCALE

| Use | Font | Weight | Size (desktop) | Color |
|-----|------|--------|----------------|-------|
| Section label | Inter | 600 | 11px | `--text-muted` or `--accent-primary` |
| Urgency label | Inter | 600 | 11px | `--accent-warning` |
| H1 (hero) | Inter | 900 | 88px | `--text-primary` |
| H2 (section headline) | Inter | 800 | 56–72px | `--text-primary` |
| H3 (card/step title) | Inter | 700 | 17–22px | `--text-primary` |
| Body large | Inter | 400 | 18–20px | `--text-secondary` |
| Body standard | Inter | 400 | 14–16px | `--text-secondary` |
| UI labels / badges | Inter | 500–600 | 11–13px | varies |
| CTA primary | Inter | 700 | 16–18px | white |
| Nav links | Inter | 400 | 14px | `--text-secondary` |
| Price | Inter | 900 | 48px | `--text-primary` |
| Before/After items (With) | Inter | 600 | 16px | `--text-primary` |
| Before/After items (Without) | Inter | 400 | 16px | `--text-secondary` |
