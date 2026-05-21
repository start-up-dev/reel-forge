# ReelForge — First Sale Launch Taskboard

**Goal:** First paying customer within 7 days.
**Constraint:** Free channels only. No ad spend.
**Date drafted:** 2026-05-21

**How to use this board:** Each `- [ ]` is a task. Change it to `- [x]` when done. Work boards top to bottom — Board 1 before Board 4.

---

## Key Facts (get these right in every asset)

- **What the user does:** Connect Facebook page → ReelForge analyzes the page and auto-builds a full brand profile → user reviews/tweaks it (edit any field, or just tell Claude what to change) → confirm character sheet → review the weekly plan → approve. There is no long setup form. Hands-on time is minutes.
- **Onboarding is agentic, not a wizard.** Claude reads the connected Facebook page and proposes the niche, tone, audience, visual style, and character. The user corrects it conversationally. Sell this: "No setup forms — we figure out your brand for you."
- **What happens after approve:** Generation runs in the background. Our team personally reviews and produces the video clips. The user gets an email the moment each video finishes assembly (subject: "Your video '<title>' is ready"), so videos arrive one by one across the week. **It is not instant — never claim "in 90 seconds" or "in 4 minutes."**
- **The user installs nothing.** The Chrome operator extension is our internal admin tool. Users never see it, never hear about it. Do not mention it in any public copy.
- **Human-in-the-loop is a selling point:** "Every video is personally reviewed by our team before it goes live." This is your quality angle vs. raw AI-slop competitors.
- **Pricing:** $5 — one full week, 1 video/day (7 videos total) · Starter $49/mo — 1 video/day (30/mo) · Pro $99/mo — 3 videos/day (90/mo).
- **Honest time claim:** "Minutes of setup. A full week of videos delivered — reviewed by humans — and auto-posted to Facebook."

---

## Positioning & Core Message (reference — not tasks)

| | |
|---|---|
| **One-liner** | "Set it and go. A full week of Facebook videos — written, made, human-reviewed, and posted." |
| **Who it's for** | Local service professionals (real estate/insurance agents, brokers, advisors, coaches) who need authority content but have nothing to film — plus faceless digital brands where the AI character *is* the brand |
| **The villain** | Spending 3–5 hours per week manually creating, editing, and scheduling video content |
| **The hero** | ReelForge: approve a plan, our team produces your week, it auto-posts to Facebook |
| **Trust angle** | Human-reviewed clips — not raw AI output. Quality you can put your brand name on. |
| **Proof point** | The finished video itself — the output IS the proof |

---

## Who to Target (read before Boards 4 & 5)

**Primary ICP — local service professionals.** Real estate & insurance agents, mortgage brokers, financial advisors, coaches/consultants, dentists, lawyers, accountants. They need constant authority/educational content, have nothing photogenic to film, hate being on camera, and $49–99/mo is a rounding error against one closed deal. Highest willingness to pay, lowest churn. **This is the long-term business.**

**First-sale beachhead — faceless digital/content brands.** Affiliate pages, digital-product sellers, niche content pages. The AI character *is* the brand, so product fit is 100%. They live on the exact free channels you're launching on, are early adopters, and will impulse-buy a $5 trial. **This is your fastest realistic path to sale #1 this week.**

**Why the split:** service pros are worth more but aren't on launch platforms — they need direct outreach (Board 5), which takes 1–2 weeks. Faceless brands are reachable through the launch itself (Board 4) and convert in days. So: **launch platforms → faceless brands; direct outreach → service pros.**

**Dropped: restaurants, salons, retail.** Those businesses need real footage of their actual space and products — AI-generated video can't sell a specific physical storefront. They are not a fit; do not target them.

---

## Board 1 — Fix Site Clarity (do this first, before any launch)

If even you get confused, a cold visitor bounces in 8 seconds.

### Hero section
- [x] Rewrite the H1 to sell the **outcome**, not the process: "A full week of Facebook videos — written, made, and posted for you."
- [x] Add a sub-headline naming the audience: "For small business owners who want to stay active on Facebook without touching a camera or editor."
- [x] Single primary CTA button — "Get your first week for $5" — remove competing buttons like "Sign Up" / "Get Started." (Don't say "Free" — the trial costs $5.)
- [x] Remove all process jargon from the landing page (no "agentic pipeline," "Claude," "FFmpeg" — users don't care).

### Show the output
- [x] Embed 2–3 real ReelForge output videos in the first scroll. Caption: "Real output. Made by ReelForge."
- [x] Add a "human-reviewed" trust badge near the videos: "Every clip personally reviewed by our team."

### Explain the flow honestly
- [x] Add a simple 3-step "How it works" section: 1) Connect your Facebook page and add your website — we analyze both and build your brand profile · 2) Approve your weekly plan · 3) We produce and post your week — you get an email each time a video is ready.
- [x] Surface website analysis as a quality selling point in the hero/how-it-works copy: "We study your Facebook page and your website so every script is accurate and on-brand — not generic AI filler." (Depends on the Board 2 website-ingestion feature.)
- [x] Make clear the videos are delivered (not instant) — set the expectation so no one feels misled.

### FAQ page
- [x] Build an FAQ page with at least these 8 questions:
  1. What kind of videos does ReelForge create?
  2. Do I need to be on camera or film anything? (No.)
  3. Who actually makes the videos? (AI drafts them; our team reviews and produces every clip.)
  4. Can I edit or reject videos before they post?
  5. Will the videos look obviously AI-generated?
  6. What Facebook pages can I connect?
  7. How long until my week is ready after I approve?
  8. What happens if I cancel?

---

## Board 2 — Prepare Assets (no launch without these)

### Prerequisite — website ingestion for richer brand context (feature in progress)
Lets users add their brand website during onboarding so Claude has real, specific brand info — products, offers, tone, customer — and produces accurate, on-brand scripts instead of generic filler. This directly raises the quality of every sample video and demo below, so ship it before producing them.
- [x] Add a website URL field to brand onboarding (`/brands/[id]/onboard`).
- [x] Fetch and parse the site — extract products/services, value props, offers, tone, and target customer.
- [x] Feed the extracted context into both the brand-profile suggestion and the script-generation prompt.
- [ ] Verify a generated script references real, specific brand details (not generic filler).

### Video assets (non-negotiable)
- [ ] Create 3 sample output videos for ICP niches — a real estate agent, an insurance/financial advisor, and a coach/consultant. **This is your #1 conversion tool — do it first.**
- [ ] Record a 3–5 min narrated demo: onboarding → approve plan → finished videos delivered + posted. Title it "Minutes of setup → a full week of Facebook videos."
- [ ] Cut a 30-sec GIF/clip of the dashboard (calendar plan + pipeline progress view) for Product Hunt & Twitter.

### Static assets
- [ ] Product Hunt gallery — 5 screenshots: hero UI, calendar plan view, pipeline progress view, a finished video, pricing page.
- [ ] OG image (1200×630): headline + a sample output video thumbnail.
- [ ] Logo variants: full, icon-only, dark bg, light bg.
- [ ] Social banner (Twitter/LinkedIn header): one-liner + a frame from a sample output video.

### Copy assets (write all in advance, post later)
- [ ] Product Hunt description (~260 chars): "Generate a full week of Facebook videos in one click. Tell us about your brand, approve the plan, and ReelForge produces every video — human-reviewed — and posts them automatically."
- [ ] Twitter launch thread — 8 tweets drafted.
- [ ] 4 distinct Reddit posts (one per subreddit — never copy-paste).
- [ ] LinkedIn post — founder-story angle, 300–500 words.
- [ ] Indie Hackers intro — transparent numbers + build story + ask for feedback.

---

## Board 3 — SEO & Geo (2–3 hours of work)

### On-page SEO
- [x] Set `<title>`: "ReelForge — Automatic Facebook Video Maker for Small Business"
- [x] Set `<meta description>`: "Generate a full week of Facebook videos in one click. We write the scripts, produce the clips, review every video, and auto-post. Try free." (implemented as "Try your first week for $5" — "Try free" contradicts the $5 trial price per Key Facts)
- [x] H1 matches the new hero positioning.
- [x] Add alt text to all landing-page images.
- [x] Add `<link rel="canonical">` to the landing page.
- [x] Generate `/sitemap.xml` (Next.js can auto-generate).
- [x] Add `robots.txt`.
- [ ] Run mobile Lighthouse — fix until score > 80.
- [x] Add `SoftwareApplication` JSON-LD schema to the homepage (name, category BusinessApplication, offer $5 trial).

### Target keywords (low competition, high intent — use in copy + blog)
- [x] Weave these into page copy and the blog post: `facebook video maker for small business`, `automatic facebook video scheduler`, `AI video generator for facebook business page`, `weekly facebook content creator tool`, `facebook video automation software`.
- [x] Avoid broad terms (`video maker`, `AI video`) — too competitive to rank this week.

### SEO blog post
- [x] Write one post: "How to Create a Week of Facebook Videos Automatically (Without Filming Anything)" — 800–1200 words, real screenshots, target keyword `how to create facebook videos automatically`, link to the trial. (screenshots are placeholders — replace with real product screenshots before launch)

### Geo targeting
- [x] Launch copy targets Tier 1 only: **US, UK, Australia, Canada** (English, high Facebook SMB usage, willingness to pay).
- [x] Focus example niches on service professionals — real estate & insurance agents, mortgage brokers, financial advisors, coaches, dentists, lawyers. Do NOT use restaurants, salons, or retail — those need real footage of their actual space/products, which AI video can't provide.
- [ ] (Optional, 1 day) Cloudflare geo-detection to swap local business examples by visitor country.
- [x] Do NOT build language translations yet — Tier 2 (Philippines, India, Nigeria, South Africa) is a Month-2 task. Ship English perfectly first.

---

## Board 4 — Launch Platforms (Top 10 free, in order)

Do not start this board until Boards 1–3 are checked.

**Audience note:** these platforms are full of faceless creators and digital-brand operators — your fastest first-sale segment. Speak to them here. Save service-professional language for the direct outreach in Board 5.

### Product Hunt
- [ ] Build the PH product page (logo 240×240, 5 gallery images 1270×760, 30-sec GIF, tagline).
- [ ] Line up 5–10 PH-active contacts to upvote at launch.
- [ ] Launch 12:01 AM PST on a Tuesday or Wednesday.
- [ ] Reply to every comment within 24h.

### Hacker News — Show HN
- [ ] Post `Show HN: ReelForge – generate, human-review, and auto-post a week of Facebook videos`.
- [ ] Post on a weekday 9–10am EST.
- [ ] Lead with how it works honestly (AI drafts scripts/scenes; team reviews and produces clips) — HN respects the human-in-the-loop detail.
- [ ] Don't pitch — explain. Reply to comments.

### Reddit (space out — never two on the same day)
- [ ] `r/SaaS` — founder perspective: what you built and why.
- [ ] `r/smallbusiness` — value angle: automating Facebook content for a local business.
- [ ] `r/socialmediamarketing` — lead with a real output video.
- [ ] `r/entrepreneur` — the building story + any early numbers.
- [ ] Each post is distinct and native to that sub. Always include a real output video as proof.

### Indie Hackers
- [ ] Post a "What I'm Building" with real numbers (run cost, signups, ARR goal) + demo video link. Reply to every comment.

### BetaList
- [ ] Submit at betalist.com (free; ~1–2 week wait, ongoing traffic).

### LinkedIn
- [ ] Post the founder-story carousel/video. Story first, link in the first comment. Tag relevant SMB/creator people. Tue–Thu 8–10am.

### Facebook Groups (your customers are literally here — high priority)
- [ ] Identify target groups: real estate agent networks, insurance/mortgage broker groups, coaching & consulting communities, "Social Media Marketing" groups, local city business groups.
- [ ] Post a demonstration, not a pitch: "I generated a week of Facebook videos for a fictional real estate agent — here's what they look like." Reveal you built the tool in the comments.

### Twitter/X
- [ ] Post the 8-tweet thread (problem → each step → finished video → pricing/link). Monday morning. Engage replies for 3 hours.

### Dev.to / Hashnode
- [ ] Publish a technical post on building the pipeline (drives developer shares + PH upvote base).

### YouTube
- [ ] Upload the demo video before Product Hunt so you can link it in the PH description.

---

## Board 5 — Direct Outreach (the real path to sale #1)

Run this in parallel with Board 4. This is faster than any platform.

- [ ] Find 10 service-professional Facebook pages that have gone quiet (last post 2–3 weeks ago) — real estate agents, insurance/mortgage brokers, financial advisors, coaches in Tier 1 countries.
- [ ] Send each a genuine, no-pitch DM offering 3 free videos for their brand:
  > "Hi [name] — noticed your page has been quiet lately. I built a tool that produces a full week of Facebook videos for [agents/advisors/coaches], all human-reviewed. I'd love to make you 3 free videos to test with your brand. Want me to?"
- [ ] Get one "yes" → produce their videos → turn it into a case study ("Real estate agent in Austin went from 1 post/month to 7 videos/week with minutes of setup").
- [ ] Offer hands-on 1:1 onboarding (15-min call) to the first 10 customers — drives trust, feedback, and testimonials.
- [ ] Make the $5 trial CTA impossible to miss — $5 is a commitment filter that removes tire-kickers.

---

## Board 6 — The 7-Day Schedule

- [ ] **Thu (today):** Boards 1 — fix hero copy. Start Board 2 — create 3 sample output videos, record demo.
- [ ] **Fri:** Upload demo to YouTube. Write all launch copy (Board 2). Build the Product Hunt page.
- [ ] **Sat:** Submit to BetaList. Do the 10 direct Facebook DMs (Board 5).
- [ ] **Sun:** Finish Board 3 — OG tags, schema, sitemap, Lighthouse, FAQ page live.
- [ ] **Mon:** Post LinkedIn + Twitter thread. Post in 2 Facebook Groups.
- [ ] **Tue:** Launch on Product Hunt (12:01am PST). Post Show HN. Post r/SaaS.
- [ ] **Wed:** Post r/smallbusiness. Post Indie Hackers. Reply to all PH/HN comments.
- [ ] **Thu:** Post r/socialmediamarketing + r/entrepreneur. Follow up on the direct DMs.

---

## Metrics to Track (reference)

| Metric | Tool | Week-1 goal |
|---|---|---|
| Landing page visits | Plausible / GA | 500+ |
| Trial signups ($5) | Stripe | 5+ |
| Paid conversions ($49/$99) | Stripe | 1 |
| PH ranking | Product Hunt | Top 5 of the day |
| Demo video views | YouTube | 200+ |
| DM responses | Manual | 3+ |

---

## What NOT to Do This Week (reference)

- Don't mention the Chrome extension anywhere public — it's an internal admin tool.
- Don't claim instant generation — it's delivered, not real-time.
- Don't spend time on TikTok/Instagram — your users are on Facebook.
- Don't write 5 blog posts — write 1 good one.
- Don't endlessly tweak the landing page — ship it with the sample videos.
- Don't pitch in Reddit comments or Facebook Groups — demonstrate, never pitch.
- Don't chase AppSumo yet — that's for scale, not validation.
- Don't A/B test copy — you need traffic data first.
