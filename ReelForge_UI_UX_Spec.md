# ReelForge — UI/UX Design Specification
**Version:** 1.0  
**Status:** Draft  
**Date:** April 16, 2026

---

## Table of Contents

1. [Design System](#1-design-system)
2. [Landing Page](#2-landing-page)
3. [Auth Pages](#3-auth-pages)
4. [Onboarding Flow](#4-onboarding-flow)
5. [Dashboard — Project List](#5-dashboard--project-list)
6. [Project Detail Page](#6-project-detail-page)
7. [Video Creation Wizard](#7-video-creation-wizard)
   - Step 1: Idea Input
   - Step 2: Script Review
   - Step 3: Voiceover Review
   - Step 4: Scene & Base Image Review
   - Step 5: Subtitle & BGM Selection
   - Step 6: Processing Screen
   - Step 7: Video Ready
8. [Video Library](#8-video-library)
9. [Settings Pages](#9-settings-pages)
10. [Billing & Upgrade Modals](#10-billing--upgrade-modals)
11. [Operator Extension UI](#11-operator-extension-ui)
12. [Global Components](#12-global-components)
13. [Responsive Behavior](#13-responsive-behavior)
14. [Interaction & Animation Principles](#14-interaction--animation-principles)

---

## 1. Design System

### Brand Identity

ReelForge is a tool for serious content creators. The visual language should feel **professional, fast, and slightly cinematic** — not playful or toy-like. Think dark UI with punchy accent colors, the kind of dashboard a creator feels proud to have open on their screen.

### Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-base` | `#09090b` | Page background |
| `--bg-surface` | `#111113` | Cards, panels, sidebars |
| `--bg-elevated` | `#1a1a1e` | Modals, dropdowns, hover states |
| `--bg-border` | `#27272a` | Dividers, card borders |
| `--accent-primary` | `#f55c2a` | Primary CTA buttons, active states, highlights |
| `--accent-secondary` | `#4a90e2` | Secondary actions, links, progress indicators |
| `--accent-success` | `#34D399` | Success states, "done" badges |
| `--accent-warning` | `#FBBF24` | Queue position badges, warnings |
| `--accent-danger` | `#F87171` | Error states, failed status |
| `--text-primary` | `#F4F4F8` | Headings, primary content |
| `--text-secondary` | `#a1a1aa` | Labels, captions, helper text |
| `--text-muted` | `#52525b` | Placeholder text, disabled states |

### Typography

| Role | Font | Weight | Size |
|------|------|--------|------|
| Display headings | Inter | 700 | 36–48px |
| Section headings | Inter | 600 | 20–28px |
| Body text | Inter | 400 | 14–16px |
| Labels / caps | Inter | 500 | 11–12px (uppercase tracked) |
| Code / mono | JetBrains Mono | 400 | 13px |

Line height: 1.5 for body, 1.2 for headings. Letter spacing on uppercase labels: `0.08em`.

### Spacing Scale

Base unit: 4px. Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80px.

### Border Radius

| Component | Radius |
|-----------|--------|
| Cards | 12px |
| Buttons | 8px |
| Inputs | 8px |
| Badges / pills | 999px (full round) |
| Modals | 16px |
| Video thumbnails | 8px |

### Shadows

- `shadow-card`: `0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px var(--bg-border)`
- `shadow-modal`: `0 24px 64px rgba(0,0,0,0.7)`
- `shadow-glow-accent`: `0 0 24px rgba(245,92,42,0.25)` — used on active/focus states

### Button Variants

| Variant | Background | Text | Border | Use |
|---------|-----------|------|--------|-----|
| Primary | `--accent-primary` | White | None | Main CTA per screen |
| Secondary | `--bg-elevated` | `--text-primary` | `--bg-border` | Alternate actions |
| Ghost | Transparent | `--text-secondary` | None | Tertiary actions |
| Danger | `--accent-danger` at 15% opacity | `--accent-danger` | `--accent-danger` at 40% | Destructive actions |
| Success | `--accent-success` at 15% opacity | `--accent-success` | None | Confirmation states |

All buttons: 40px tall standard, 36px compact, 48px large. Minimum width 120px. Loading state shows spinner + disabled opacity.

---

## 2. Landing Page

The landing page is public-facing and conversion-focused. Single long-scroll page.

### 2.1 Navigation Bar

- Fixed top, full width, `--bg-surface` with a 1px bottom border in `--bg-border` and subtle backdrop blur
- Left: ReelForge wordmark logo (orange accent on the "R" glyph)
- Right: "Sign In" ghost button + "Get Started" primary button (small)
- On mobile: hamburger → slide-in drawer with same links

### 2.2 Hero Section

Full viewport height. Dark gradient background (`--bg-base` to a very subtle orange-tinted `#1A0E05` at the bottom).

Layout (centered):
- **Eyebrow label**: small all-caps pill badge — "AI-POWERED VIDEO CREATION"
- **H1 headline**: "5 Videos a Day, Under 10 Minutes Each." — 48px, bold, white
- **Subheadline**: "ReelForge turns your ideas into finished short-form videos — script, voiceover, scenes, and subtitles — automatically." — 18px, `--text-secondary`, max-width 560px, centered
- **CTA row**: "Start Free Trial — $2" primary button (large, 52px, full glow shadow) + "See how it works →" ghost link
- **Social proof strip**: 5 avatar circles overlapping + "Trusted by 1,200+ creators" in small text (post-launch placeholder)

**Animated background**: Faint looping grid of thin lines in `--bg-border` color, very low opacity. A subtle animated orange orb blur in the top-right quadrant.

**Below the fold hint**: Faint down-arrow chevron with "See the workflow" label, softly pulsing.

### 2.3 How It Works Section

Background: `--bg-surface`. Section heading: "From idea to finished video in minutes."

**Numbered step flow** — horizontal 5-step row on desktop, vertical stack on mobile. Each step is a card with:
- Step number in a small accent-colored circle
- Icon (simple line icon)
- 1-line bold title
- 2-line description

Steps:
1. **Write your idea** — Type a topic or brainstorm with AI
2. **Approve the script** — AI writes it, you review and edit
3. **Choose your voice** — AI records the voiceover with word-level sync
4. **Review your scenes** — AI generates a base image per scene
5. **Download your video** — Fully assembled with subtitles and music

Between each card: a right-pointing arrow icon (hidden on mobile).

### 2.4 Feature Highlights Section

Background: `--bg-base`. Three alternating content rows (image left / text right, then text left / image right):

**Row 1 — AI Pipeline:**
- Mock screenshot: the 7-step wizard progress bar with Step 4 scene cards visible
- Headline: "Every step of production, automated."
- Body: 2–3 sentences on the pipeline. Bullet list of 4 features: script, voice, scenes, subtitles.

**Row 2 — Scale:**
- Mock screenshot: the video library grid showing 9 thumbnails across 3 projects
- Headline: "Built for creators who post every day."
- Body: explanation of projects, multi-channel support, 5+ videos/day goal.

**Row 3 — Quality:**
- Mock screenshot: a single scene card with the subtitle style preview picker open
- Headline: "Cinematic quality, at scale."
- Body: mention of ElevenLabs voice, Grok visuals, ASS subtitle styles.

### 2.5 Platform Support Bar

Narrow strip: "Optimized for:" followed by platform logos/wordmarks in a row: TikTok, Instagram Reels, YouTube Shorts, Facebook Reels. Muted gray, centered.

### 2.6 Pricing Section

Background: `--bg-surface`. Section heading: "Simple pricing."

Three cards in a row (Trial, Starter, Pro). The Pro card has a "Most Popular" badge and a subtle `shadow-glow-accent` border.

Each card:
- Plan name (large, bold)
- Price (very large, e.g. "$2" or "$X") with period label
- 1-line description
- Feature list (4–6 bullets with checkmark icons in accent green)
- CTA button

Feature lists should emphasize daily limits and key capabilities.

**Below pricing**: small note — "No hidden fees. Cancel anytime. All plans include unlimited projects."

### 2.7 FAQ Section

Background: `--bg-base`. Accordion component — 6–8 questions. Each row expands on click with smooth height animation. Questions like:
- "How does the clip generation work?"
- "Do I need any technical skills?"
- "What platforms are supported?"
- "How long does a video take to generate?"
- "Can I use my own images or voice?"

### 2.8 Final CTA Section

Full-width dark gradient banner. Large centered headline: "Start making videos today." Subtext + "Get Started for $2" large primary button. No nav — just the action.

### 2.9 Footer

3-column layout on desktop:
- Col 1: ReelForge logo + 1-line tagline
- Col 2: Links — About, Pricing, FAQ, Contact
- Col 3: Social icons (Twitter/X, Instagram, TikTok)
- Bottom bar: copyright + Privacy Policy + Terms of Service links

---

## 3. Auth Pages

**Layout**: Centered card on a dark background with a faint animated gradient. The card is `--bg-surface`, 480px wide, 16px radius, with a top accent line in `--accent-primary`.

### 3.1 Sign Up Page

- ReelForge logo at top of card
- Page title: "Create your account"
- Google OAuth button (full width, secondary variant with Google icon)
- Divider: "or continue with email"
- Fields: Email, Password (toggle show/hide), Confirm Password
- "Create Account" primary button (full width)
- Below: "Already have an account? Sign in →"
- Clerk-powered — standard error messages inline below fields

### 3.2 Sign In Page

- Same layout as Sign Up
- Title: "Welcome back"
- Google OAuth button
- Fields: Email, Password
- "Forgot password?" link (right-aligned, below password field)
- "Sign In" primary button (full width)
- Below: "Don't have an account? Get started →"

---

## 4. Onboarding Flow

Triggered immediately after first sign-up. A **full-screen modal overlay** (not a separate page) with a dark backdrop. The modal is centered, 600px wide.

### Step 1 — Create Your First Project

- Modal header: "Let's set up your first project" (step indicator: 1 of 3)
- Progress bar: 3 segments, 1 filled
- Form fields (same as Project Creation form — see Section 6):
  - Project Name, Platform, Niche, Language, Target Audience, Video Style, Tone
  - Voice Picker: horizontal scrollable row of voice cards, each with a name, language tag, and "▶ Preview" button that plays a 5-second sample inline
- CTA: "Continue →" (disabled until required fields filled)

### Step 2 — How It Works

- Progress bar: 2 of 3 filled
- Header: "Here's how ReelForge works"
- Animated walkthrough: 5 short cards that auto-advance every 3 seconds (or user clicks through manually). Each card shows a stylized icon + 1-line step name + 1-line description. Same 5 steps as the landing page.
- Manual navigation: dot indicators + "← Back" / "Continue →" buttons
- Skip option: ghost "Skip tour" link in the top-right corner of the modal

### Step 3 — Ready to Go

- Progress bar: 3 of 3 filled (complete)
- Header: "You're all set!"
- Body: "Your first project is ready. When you create your first video, a $2 one-time payment will unlock your trial video. After that, choose a plan that fits your workflow."
- Checkmark animation (success lottie or CSS animation)
- CTA: "Go to Dashboard" primary button (large)

---

## 5. Dashboard — Project List

**URL**: `/dashboard`

### 5.1 Layout

- **Left sidebar** (240px, fixed): navigation
- **Main content area**: full remaining width, scrollable

### 5.2 Left Sidebar

Top section:
- ReelForge logo / wordmark (links to dashboard)
- User avatar + name + plan badge (e.g. "Pro") — clicking opens account dropdown

Navigation links (with icons):
- Dashboard (home icon) — active state: left accent bar + background highlight
- Library (film icon)
- Settings (gear icon)
- Billing (card icon)

Bottom section:
- Usage meter: "Videos today: 3 / 5" with a thin progress bar in accent color
- "Upgrade Plan" button (secondary, shown only if on Starter or trial)

### 5.3 Main Content

**Page header row**:
- Left: "Your Projects" heading (H2)
- Right: "New Project" primary button (with + icon)

**Project grid**: 3 columns on desktop, 2 on tablet.

Each **project card** (`--bg-surface`, `shadow-card`, 12px radius):
- Top area (160px tall): latest video thumbnail or a gradient placeholder with the platform icon centered if no videos yet
- Bottom area (padding 16px):
  - Row 1: Project name (bold, truncated) + platform icon badge (small pill)
  - Row 2: Niche tag (muted pill) + language tag
  - Row 3: "X videos · Last active Y days ago" in `--text-secondary`
  - Row 4: Two buttons — "＋ New Video" (primary, small) + gear icon (ghost, opens settings dropdown)

**Gear icon dropdown** (on project card):
- Edit Project
- View All Videos
- Delete Project (danger, with confirm dialog)

**Empty state** (no projects yet — shown during onboarding skip or after deletion):
- Centered illustration: simple line-art of a film clapperboard
- Heading: "No projects yet"
- Body: "Create a project for each channel or content niche you create for."
- "Create Your First Project" primary button

---

## 6. Project Detail Page

**URL**: `/projects/[id]`

Shows all videos created within a single project.

### 6.1 Layout

Same sidebar as Dashboard. Main area:

**Project header**:
- Breadcrumb: "Dashboard → [Project Name]"
- Project name (H1) + platform badge + niche pill
- Right side: "＋ New Video" primary button + gear icon (edit/delete project)

**Filter bar** (below header):
- Status filter: All · Completed · Processing · Draft · Failed (pill toggle buttons)
- Date filter: dropdown (All time, Last 7 days, Last 30 days)
- Search input: "Search videos…" (filters by title/idea)

**Video grid**: 3 columns on desktop.

Each **video card**:
- Top (16:9 thumbnail area at 9:16 aspect): first-frame thumbnail or processing placeholder
- Status badge (top-right corner of thumbnail): "Ready" (green), "Processing" (yellow, spinning), "Draft" (gray), "Failed" (red)
- Bottom area:
  - Video title (bold, truncated)
  - "Created Apr 14" in muted text
  - Row of icon buttons: ▶ Play · ↓ Download · 🔗 Share · ✕ Delete

**Empty state for project** (no videos):
- "No videos yet in this project."
- "＋ Create your first video" button

---

## 7. Video Creation Wizard

**URL**: `/videos/[id]`

The wizard is a **full-page experience** — no sidebar. Navigation is the persistent wizard header only.

### Wizard Header (persistent across all steps)

- Left: Back arrow → returns to project page (with confirm dialog if mid-progress)
- Center: Project name + "/" + Video title (editable inline on click, pencil icon)
- Step progress bar: 7 labeled steps, each with an icon and short label. Completed steps show checkmark. Active step is accent-highlighted. Future steps are muted. Steps are not clickable forward but clicking a completed step goes back.
- Right: "Save Draft" ghost button (auto-saves, shows "Saved" confirmation briefly)

Step labels:
1. Idea  2. Script  3. Voice  4. Scenes  5. Style  6. Processing  7. Done

---

### Step 1 — Idea Input

**Layout**: Centered single-column, max-width 640px.

**Mode toggle** (pill toggle, top of card):
- `[ Brainstorm with AI ]` | `[ I have an idea ]`

**Brainstorm mode (default)**:
- Label: "What's your video about?"
- Large textarea (4 rows): placeholder "e.g. 'Quick tips for building a morning routine'"
- "Generate Ideas" primary button
- Loading state: button becomes spinner + "Thinking…" text, textarea disabled
- **Results**: 3 idea cards appear below in a grid (or stack on mobile). Each card:
  - Idea title (bold, 1 line)
  - Idea body text (2–3 lines, `--text-secondary`)
  - "Use This Idea →" button (secondary, becomes primary accent on hover)
  - Selected card: accent border + checkmark in top-right corner

**Direct mode**:
- Single large textarea (6 rows): placeholder "Paste or type your full video idea here"
- Character counter bottom-right of textarea
- "Use This Idea →" primary button

**Below**: Small "Tips for great ideas" expandable hint section.

---

### Step 2 — Script Review

**Layout**: Centered, max-width 720px.

**Top info strip**: "Generated in 3.2s · 124 words · ~45 sec estimated duration" — muted text row

**Main area**: Large editable textarea — full script content. Font slightly larger (15px), good line-height for reading. Subtle `--bg-elevated` background, accent-colored focus ring on edit.

**Word count live indicator** at the bottom-right of the textarea: "124 / 80–150 words". If out of range, the number turns warning yellow or danger red.

**Estimated duration bar**: thin progress bar below the textarea. Fill color transitions green → yellow → red based on whether duration is within 30–60 seconds. Label: "~45 sec" or "~72 sec — too long, consider trimming."

**Action row** (below textarea):
- Left: "Regenerate" ghost button (with refresh icon) — shows confirm popover if script was manually edited
- Right: "Approve Script →" primary button

---

### Step 3 — Voiceover Review

**Layout**: Centered, max-width 640px.

**Audio player** (custom, full-width):
- Waveform visualization (static SVG bars in accent color with muted bars for unplayed portion)
- Playback controls: ◀◀ rewind 5s · ▶/⏸ play/pause · ▶▶ skip 5s
- Current time / total duration
- Playback speed toggle: 0.75x · 1x · 1.25x · 1.5x (small pills, defaults to 1x)

**Voice info strip**: "Voice: [Voice Name] · Language: English · Duration: 47 sec"

**Action row**:
- Left: "Regenerate Voice" ghost button — note: re-uses same voice and script. Small caveat text: "Slight variations between generations are normal."
- Right: "Approve Voice →" primary button

---

### Step 4 — Scene & Base Image Review

**Layout**: Full width with a 2-column scene grid (desktop), single column (mobile).

**Top summary bar**: "12 scenes generated · All images ready" or "10 / 12 images ready" with a progress indicator if still generating.

**Bulk action bar** (top right): "Approve All Scenes →" primary button (disabled until all images loaded) + "Regenerate All" ghost button

**Scene card** (for each of 8–12 scenes):
- Card header: "Scene 3 · 4 sec" in muted text, drag handle icon (for future reordering — grayed out in MVP)
- **Image area** (9:16 aspect ratio, fills card width at ~180px wide on desktop):
  - Loaded: shows the generated image, object-fit cover
  - Loading: skeleton shimmer animation
  - Failed: gray placeholder with retry icon
- **Visual prompt**: collapsible. Default shows first 2 lines with "Show more" expand. Full prompt shown in a small `--bg-elevated` text block when expanded.
- **Scene text excerpt**: italic, `--text-secondary`, 2–3 lines showing which part of the script this scene covers
- **Action row** (3 icon buttons, bottom of card):
  - 🔄 Regenerate (same prompt, new image)
  - ✏️ Edit Prompt (opens inline text edit mode in the prompt area + "Regenerate" confirm button)
  - ⬆️ Upload Image (opens OS file picker, accepts JPG/PNG, previews immediately)

**Per-scene approval toggle**: small checkbox or checkmark in top-left corner. "Approve All" checks all at once.

---

### Step 5 — Subtitle & BGM Selection

**Layout**: Centered, two sections stacked (Subtitles, then BGM).

**Subtitle Style Picker**:
- Section label: "Subtitle Style"
- 4 preview cards in a 2×2 grid (or 4-column row on desktop):
  - Each card: a short video preview mock (static screenshot with subtitle text overlaid in that style) + style name below
  - Selected card: accent border glow
  - Styles: Bold Pop, Minimal, Cinematic, Word-by-Word Highlight

**BGM Section**:
- Toggle row: "Background Music" label + ON/OFF switch. Default from project settings.
- When ON: expands below with:
  - **BGM library grid**: horizontal scroll row of track cards. Each track card:
    - Category badge (e.g. "Energetic")
    - Track name
    - Duration
    - ▶/⏸ play button (previews in-page using an HTML audio element)
    - Selected state: accent border
  - Volume slider: 0–100%, labeled "Volume: 30%". Thumb is accent-colored.

**Action row**: "Generate Video" large primary button (full-width on mobile). Below button: small muted text "Once submitted, your clips will be queued. You'll get an email when your video is ready."

---

### Step 6 — Processing Screen

**Layout**: Centered, max-width 480px. Full remaining viewport height with vertical centering.

**Top**: Video title heading + muted "Being processed…" subtext

**Progress timeline** (vertical, centered):
Each step is a row:
- Icon (checkmark circle if done, spinning ring if active, hollow circle if pending)
- Step label
- Status text (right-aligned): "Done", "In progress…", or muted "Waiting"

Timeline items:
1. Script approved ✓
2. Voiceover ready ✓
3. Base images ready ✓
4. Clips in queue — live text: "Position #4 in queue" or "Being generated…" (SSE update)
5. Assembling video… (spinner when active)

**Queue position indicator** (when clips are queued):
- Large muted number: "#4" in a circle
- "in the queue" label below
- "Estimated wait: ~8 min" (calculated from queue depth × avg time per clip)
- Updates in real-time via SSE

**Bottom message**: "You can close this tab — we'll email you when your video is ready." with an envelope icon. "Go to Library" ghost link.

**Failed state**: If status reaches `FAILED`, replace the spinner row with a red X icon + "Something went wrong" + error description in a collapsible `code`-style box + "Retry" primary button.

---

### Step 7 — Video Ready

**Layout**: Centered, max-width 640px.

**Top**: Success animation — a brief 1.5s confetti burst (CSS-only, subtle, not distracting) + large green checkmark in a circle.

**Heading**: "Your video is ready!" (H1, white)

**Video player**:
- Full-width, 9:16 aspect, rounded corners
- Custom HTML5 player controls with the app's dark styling
- Auto-plays muted on load, user can unmute

**Metadata strip below player**: "47 sec · 1080×1920 · MP4 · Created Apr 16"

**Action buttons** (vertical stack on mobile, row on desktop):
- "↓ Download MP4" — primary button
- "🔗 Copy Shareable Link" — secondary button. On click: shows a toast "Link copied! Expires in 7 days."
- "＋ Make Another Video" — ghost button (returns to Step 1 for a new video in the same project)

---

## 8. Video Library

**URL**: `/library`

### 8.1 Layout

Same sidebar. Main content area.

**Page header**: "Video Library" (H1) + "X videos total" count in muted text

**Filter bar** (sticky below header):
- Project filter: "All Projects" dropdown (lists user's projects)
- Date range: "All time" dropdown
- Search: "Search videos…" input
- View toggle: grid icon / list icon (grid is default)

### 8.2 Grid View

4-column grid on desktop, 2 on tablet, 1 on mobile.

Each card:
- Thumbnail (9:16 ratio, object-fit cover)
- On hover: overlay darkens + play button appears centered
- Clicking thumbnail opens inline video player in a modal overlay
- Bottom strip: video title (bold), project name (small pill with platform icon), date

Bottom-right icons on each card (appear on hover): ↓ Download · 🔗 Share · 🗑 Delete

**Soft delete confirm**: clicking Delete shows an inline confirm popover — "Delete this video? This cannot be undone." with "Cancel" and "Delete" (danger) buttons.

### 8.3 List View

Table layout:
- Columns: Thumbnail (small) · Title · Project · Duration · Created · Actions
- Row hover: subtle background highlight
- Actions column: Download · Share · Delete icon buttons

### 8.4 Inline Video Player Modal

Full-screen dark overlay. Centered modal (90vw max, 560px max-width):
- Video player (9:16)
- Title, project, date below
- Download + Share buttons
- Close button (X, top right)
- Keyboard shortcut: ESC closes

---

## 9. Settings Pages

**URL**: `/settings/[tab]`

Same sidebar layout. Settings content area has a sub-navigation tab row at the top.

### 9.1 Tabs

- Profile
- Projects (redirect to /dashboard)
- Notifications
- Billing (redirect to /billing)

### 9.2 Profile Tab

**Avatar section**: circular avatar (pulled from Clerk), "Change Photo" link below (links to Clerk's user settings)

**Form fields**:
- Display Name (text input, pre-filled)
- Email (read-only, managed by Clerk)

**Danger Zone section** (at bottom, separated by a divider):
- "Delete Account" — danger button. Opens a confirm modal requiring the user to type "DELETE" to confirm. Account deletion is irreversible — GCS assets purged within 24 hours.

### 9.3 Notifications Tab

- Toggle: "Email me when my video is ready" (default: ON)
- Toggle: "Email me when a video fails" (default: ON)
- Email address shown (read-only, from Clerk)

---

## 10. Billing & Upgrade Modals

### 10.1 Billing Page

**URL**: `/billing`

Same sidebar.

**Current Plan Card** (`--bg-surface`, full-width):
- Plan name badge (e.g. "Starter")
- "X videos used today (3 / 5)" + "X videos this month (47 / 150)" — two usage meters with progress bars
- Renewal date: "Renews May 16, 2026"
- "Manage Subscription" secondary button — opens Stripe billing portal in a new tab

**Plan Comparison Table** (below):
Same as landing page pricing section, but simpler and in-app context. Upgrade CTA buttons only shown for higher tiers.

### 10.2 Trial Payment Modal

Triggered when user clicks "Generate Video" on Step 5 for the first time (if trial not yet paid).

- Modal heading: "Get your first video for $2"
- Body: "Your trial video includes the full ReelForge pipeline — script, voiceover, scenes, and final video. After your trial, choose a plan to keep creating."
- Feature list (3 bullets, checkmarks): Full AI pipeline · HD download · 7-day shareable link
- "Pay $2 and Continue" primary button → opens Stripe Checkout
- "Cancel" ghost link — goes back to Step 5

### 10.3 Daily Quota Exceeded Modal

Triggered when a user on a paid plan tries to exceed their daily limit.

- Modal: "You've reached your daily limit"
- Shows usage: "5 / 5 videos today"
- Resets at: "Resets at midnight UTC (in ~6 hours)"
- If on Starter: "Upgrade to Pro for 15 videos/day" upgrade CTA
- "OK, Got It" dismiss button

### 10.4 Monthly Quota Exceeded Modal

Same structure as daily modal but shows monthly usage, and says "Resets on the 1st of next month."

### 10.5 Subscription Prompt Modal

Triggered after a trial video completes.

- Heading: "Keep the momentum going"
- Subtext: "Your trial video is done. Choose a plan to continue creating."
- Two plan cards: Starter and Pro (side-by-side). Pro has "Best Value" badge.
- Each card: price, daily limit, monthly limit, "Choose [Plan]" CTA
- "Not now" ghost link at bottom

---

## 11. Operator Extension UI

The extension is installed as an unpacked CRX by the operator. It has a popup UI only (no content page beyond the injected Grok scripts).

### 11.1 Extension Popup

480×520px popup. Dark background matching the app (`--bg-surface`). Branded header bar with "ReelForge Operator" label.

**Status section** (top card):
- Large number (accent orange): "47" — pending clips in queue
- Label below: "clips in queue"
- Last updated timestamp: "Updated 2s ago"
- Connection indicator: green dot "Connected" or red dot "Disconnected"

**Controls section**:
- "Batch size" field: number input (default 30, range 1–50)
- "Auto-click" toggle: pill toggle ON/OFF. When ON, shows delay mode selector below:
  - Delay mode: radio pills — Fast (1–2s) · Normal (2–5s) · Slow (5–10s)
- "Concurrent tabs" field: number input (default 30, max 50)

**Start/Stop button**:
- When idle: large "▶ Start Processing" primary button (full-width, green)
- When running: large "⏹ Stop" danger button (full-width, red), pulse animation on border

**Session stats** (shown when running or after session):
- "✓ Done: 12 clips" (success green)
- "✗ Failed: 0 clips" (danger red if >0)
- "⟳ Active: 4 tabs" (muted)
- "Est. remaining: ~18 min" (muted)

**Failed clips section** (only if failures exist):
- Heading: "Failed Clips (2)" in red
- List of failed clip IDs with "Retry" button per row

### 11.2 Settings Page (Extension Options)

Accessible via the gear icon in the popup header. Full-page options UI.

**API Configuration**:
- "Backend URL" text input (e.g. `https://api.reelforge.com`)
- "Operator Secret" password input (masked, with show/hide toggle)
- "Test Connection" button → shows success/failure inline

**DOM Selector Configuration**:
A table of editable selector rows:
| Selector Name | Current Value | Status |
|---|---|---|
| Image Upload Input | `input[type=file]#image-upload` | ✓ Valid |
| Prompt Text Field | `textarea.prompt-input` | ✓ Valid |
| Generate Button | `button[data-testid=generate]` | ✓ Valid |
| Output Video Element | `video.output-video` | ✓ Valid |

"Test Selectors" button opens the Grok tab and visually highlights each matched element.

**Save Settings** primary button (bottom).

---

## 12. Global Components

### 12.1 Toast Notifications

Bottom-right anchored. Stack up to 3. Auto-dismiss after 4 seconds. Manual close X button.
Variants: Success (green left border) · Error (red) · Info (blue) · Warning (yellow).

### 12.2 Empty States

Every list/grid view has a designed empty state:
- Simple line-art illustration (consistent monochrome style)
- Heading (what's missing)
- 1-line explanation
- Action button if applicable

### 12.3 Skeleton Loaders

All cards and content areas use skeleton shimmer loaders while data is fetching. The shimmer animation uses a gradient from `--bg-surface` to `--bg-elevated` and back, looping.

### 12.4 Confirmation Dialogs

Small popover-style for low-stakes confirms (e.g. "Regenerate script?").
Full modal with typed confirmation for destructive actions (e.g. "Delete Account").

### 12.5 Loading Button States

Every button that triggers an API call shows a spinner inside the button (replacing the icon) + becomes disabled. Text does not change — only the icon/spinner animates.

### 12.6 Error States

API errors surface as either:
- Toast notification (for background actions)
- Inline error below the relevant field (for form actions)
- Full error card replacing the content area (for page-level failures) with a "Try Again" button

### 12.7 Navigation Active States

Sidebar nav: active page has a `--accent-primary` left border bar (3px), slightly lighter background, and white text (vs `--text-secondary` for inactive).

### 12.8 Inline Video Player (Library)

Appears as a modal overlay. Contains:
- The `<video>` element in 9:16 aspect ratio
- Dark custom controls below
- Title, project name, created date
- Download + Share buttons

---

## 13. Responsive Behavior

### Breakpoints

| Name | Width |
|------|-------|
| Mobile | < 640px |
| Tablet | 640–1024px |
| Desktop | > 1024px |

### Key Adaptations

**Sidebar**: Collapses to a bottom navigation bar on mobile (icon only, 5 items: Home, Library, New Video, Settings, Billing). On tablet: icon-only sidebar (64px wide, with tooltips).

**Project Grid**: 3 col → 2 col → 1 col

**Scene Cards (Step 4)**: 2 col → 1 col

**Subtitle Picker**: 2×2 grid → horizontal scroll row on mobile

**Wizard header**: On mobile, step labels are hidden — only icons shown. Step number displayed ("3 / 7").

**Video player**: Full-width on all screen sizes.

---

## 14. Interaction & Animation Principles

**Speed philosophy**: The app should feel instant for navigation and deliberate for AI operations. Never fake loading — always reflect the real state.

**Page transitions**: Subtle fade (150ms opacity) between wizard steps. No slide animations (they feel slow on fast machines).

**Hover states**: Background lightens by ~8% on interactive elements. Transition: 120ms ease.

**Button press**: 2px scale-down transform on mousedown. `transform: scale(0.97)`, 80ms.

**Card hover**: Subtle lift effect — `box-shadow` expands slightly, `transform: translateY(-2px)`, 150ms ease.

**SSE updates (Step 6)**: Status items transition to "done" with a small checkmark pop-in (scale from 0.5 to 1, 200ms ease-out) + subtle green glow flash on the row.

**Success states**: Brief green pulse on the element that just succeeded (background flashes then fades over 600ms).

**Error states**: A brief horizontal shake animation (3 oscillations, 300ms) on the element that failed.

**Wizard step advance**: The progress bar fill animates smoothly to the new step (300ms ease). The previous step gets a checkmark pop-in.

**Skeleton to content**: Content fades in over 200ms once loaded (opacity 0 → 1). No layout shift — skeleton preserves exact dimensions.

**Accessibility**: All interactive elements have visible focus rings (2px `--accent-primary` outline, 2px offset). Keyboard navigation fully supported throughout the wizard. ARIA labels on all icon-only buttons.

---

*End of ReelForge UI/UX Design Specification v1.0*
