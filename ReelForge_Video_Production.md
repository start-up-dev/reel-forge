# ReelForge — Marketing Video Production Plan

**Format:** 1920×1080 · 30 fps · 45 seconds (1350 frames)  
**Output:** YouTube / Twitter / LinkedIn hero video  
**Bonus render:** 1080×1920 (9:16) same content for TikTok / Reels / Shorts  
**Tone:** Dark luxury tech × hype energy — premium but punchy  

---

## 1. Creative Brief

**One sentence:** ReelForge turns a sentence of text into a finished, platform-ready video in under 10 minutes — show that transformation so viscerally that the viewer feels FOMO the moment they see it.

**Emotional arc:**  
`Pain (this is slow and hard)` → `Curiosity (wait, how?)` → `Proof (look at all those outputs)` → `Desire (I want that)` → `Action (start now)`

**What the viewer should feel at the end:**  
"I can't believe I've been doing this the hard way."

---

## 2. Scene-by-Scene Script

### Scene 0 — Hook (frames 0–90 · 3 seconds)

**Visual:**  
Black screen. Then three words slam in one by one, each hitting on a beat:

```
MAKING VIDEOS
IS
BROKEN.
```

Each word arrives from a slightly different direction (left, right, bottom). On the word "BROKEN" — a red horizontal line slashes through it and the text cracks apart into fragments that fly offscreen. As the fragments clear, the ReelForge dark background fades in underneath.

No browser frame. No UI. Just raw kinetic typography against `#09090b`.

**Voiceover (VO):**  
*(None — let the visuals breathe. Music carries this.)*

**Typography:**  
- Font: Inter Black (900), ~280px  
- Color: `#F4F4F8` → last word in `#F87171` (danger red)  
- The crack/fragment effect: split each letter along a diagonal using CSS clip-path, animate the two halves flying apart with `spring({ stiffness: 300, damping: 8 })`

---

### Scene 1 — The Claim (frames 90–240 · 5 seconds)

**Visual:**  
The fragments from Scene 0 dissolve into orange particles that drift upward and reassemble into a new stat counter layout:

```
[  4 HOURS  ]        [  10 MINUTES  ]
   the old way    →    with ReelForge
```

The "4 HOURS" starts at 0 and counts up to 4:00:00 in fast forward (like a real timer burning). The "10 MINUTES" counts down from 0:10:00 to 0:00:00 in the same time — the contrast is visceral.

Below both counters, a thin animated arrow `→` draws itself left to right.

Under the arrow: tagline fades in one word at a time:
```
One idea. One click. Finished.
```

**VO (begins here, warm male voice, confident pacing):**  
> *"Creating a video used to take hours. ReelForge does it in ten minutes."*

**Typography:**  
- Counter numbers: JetBrains Mono Bold, ~160px  
- Labels: Inter Medium, `#a1a1aa`, 14px uppercase tracking-widest  
- Tagline: Inter ExtraBold 800, 48px, `#F4F4F8`

---

### Scene 2 — The Pipeline (frames 240–540 · 10 seconds)

**Visual:**  
A horizontal flow diagram animates from left to right across the full canvas. Each node lights up sequentially, with a glowing particle trail flowing along the connecting line to the next node.

```
[ Your Idea ] ──●──► [ Claude Script ] ──●──► [ ElevenLabs Voice ] ──●──► [ Grok Images ] ──●──► [ Your Video ]
```

Each node:
- Starts as a dim circle with an icon  
- When it activates: ring pulses outward (like a sonar ping), icon color shifts from `#52525b` → `#f55c2a` (orange), a small label fades in below  
- Particle trail: 8–12 small dots fly along the SVG path from node to node using `strokeDashoffset` animation  

Below each node, a micro-detail appears as it activates:
- **Your Idea**: `"Hidden coffee shops of Tokyo documentary."`  
- **Claude Script**: typewriter rendering 2 lines of script text  
- **ElevenLabs Voice**: animated audio waveform (sine-wave bars pulsing)  
- **Grok Images**: a 2×2 grid of blurry image thumbnails snapping into focus  
- **Your Video**: a vertical phone mockup that slides up  

The whole pipeline takes 8 seconds to complete left-to-right. On the last node ("Your Video"), a burst of orange sparks explodes outward.

**VO:**  
> *"Your idea becomes a script with Claude. A voice with ElevenLabs. Visuals with Grok. And a finished video — automatically assembled and ready to post."*

**Typography:**  
- Node labels: Inter SemiBold, 13px, `#a1a1aa`  
- Micro-detail text: Inter Medium, 11px, `#52525b`

---

### Scene 3 — Output Reel (frames 540–990 · 15 seconds)

**Visual:**  
**This is the hero moment of the entire video.** Six phone mockups (1080×1920 aspect ratio, scaled to ~280px wide × 500px tall) slide in from the bottom in a staggered arc — like cards being dealt onto a table.

Each phone shows a different visual style:

| Phone | Style | Overlay Color | Topic |
|---|---|---|---|
| 1 | Cinematic | Teal/black gradient | Tokyo Coffee Documentary |
| 2 | Cartoon | Bright primary colors | Kids Science Channel |
| 3 | Whiteboard | Clean white background | Business Explainer |
| 4 | Motion Graphics | Electric blue / neon | Tech Product Launch |
| 5 | 2D Animation | Warm orange tones | Travel Vlog |
| 6 | Stock Footage | Natural earth tones | Cooking Tutorial |

Each phone lands with a satisfying `spring({ stiffness: 180, damping: 14 })` bounce. 0.2s stagger between each.

All 6 phones visible simultaneously for ~3 seconds. Then the style name of each phone animates in underneath as a glowing pill badge.

Top of scene: a thin white counter animates:
```
6 styles   ·   4 platforms   ·   ∞ topics
```

At the 12-second mark of this scene, the 6 phones slide together into a tight cluster and the cluster scales up to fill the center. Then a single large headline slams in over them:

```
What will YOU make?
```

**VO:**  
> *"Cinematic. Cartoon. Whiteboard. Motion graphics. Seven visual styles, four platforms — TikTok, YouTube, Instagram, LinkedIn — all from one idea."*  
> *(3-second pause with music swell)*  
> *"What will you make?"*

**Typography:**  
- Style badge pills: Inter Bold, 10px, uppercase, border `#f55c2a/50`, bg `#f55c2a/10`  
- Counter strip: Inter Medium, 13px, `#a1a1aa`, tracking-widest  
- Final headline: Inter Black 900, 96px, `#F4F4F8`, centered

---

### Scene 4 — CTA (frames 990–1350 · 12 seconds)

**Visual:**  
Clean, quiet, confident. Dark `#09090b` background. The radial orange glow from the design spec.

Three elements land in sequence:

1. **Social proof strip** (frames 990–1050): Three mini stat counters animate up:
   ```
   [ 1,240+ creators ]   [ 12,000+ videos made ]   [ 4.9★ rating ]
   ```

2. **CTA button** (frames 1050–1140): The button materializes with a ripple effect — a circle expands outward from the center and the button snaps into existence inside it. Button pulses with a soft glow every 45 frames (like a heartbeat).
   ```
   [ ⚡ Start for $5 → ]
   ```
   Subtext below: `3 video credits · Cancel anytime · Powered by Stripe`

3. **Domain lock-in** (frames 1140–1350): The URL `reelforge.ai` types itself out in JetBrains Mono, then a cursor blink. Above it, a final line:
   ```
   Your first video is 10 minutes away.
   ```

**VO:**  
> *"Over a thousand creators are already using ReelForge. Start for five dollars — three videos, no commitment."*  
> *(pause)*  
> *"Your first one is ten minutes away."*

**Typography:**  
- Stat numbers: JetBrains Mono Bold, 48px, `#F4F4F8`  
- Stat labels: Inter Medium, 11px, `#a1a1aa`, uppercase  
- CTA button: Inter Black, 24px, `#FFFFFF`, bg `#f55c2a`, shadow `#f55c2a/40`  
- Subtext: Inter Medium, 13px, `#52525b`  
- URL: JetBrains Mono, 20px, `#a1a1aa`  
- Final line: Inter ExtraBold 800, 52px, `#F4F4F8`

---

## 3. Voiceover (Full Script)

**Voice character:** Warm, male, mid-30s, confident but not salesy. Think a slightly faster David Goggins energy delivered calmly. NOT a corporate "product explainer" voice.

**Delivery notes:**
- Scene 0: **Silence** — let the music and visuals land
- Scene 1: Start slowly, pick up pace on "ReelForge does it in ten minutes"
- Scene 2: Faster pace, technical but accessible — like explaining to a smart friend
- Scene 3: Breathy pause before "What will you make?" — let it hang
- Scene 4: Slower again, quiet confidence

**Full VO text:**

```
[Scene 1 – 0:03]
Creating a video used to take hours.
ReelForge does it in ten minutes.

[Scene 2 – 0:08]
Your idea becomes a script with Claude.
A voice with ElevenLabs.
Visuals with Grok.
And a finished video — automatically assembled and ready to post.

[Scene 3 – 0:18]
Cinematic. Cartoon. Whiteboard. Motion graphics.
Seven visual styles. Four platforms.
TikTok, YouTube, Instagram, LinkedIn.
All from one idea.

[pause 3 seconds]

What will you make?

[Scene 4 – 0:33]
Over a thousand creators are already using ReelForge.
Start for five dollars. Three videos. No commitment.

[pause 1 second]

Your first one is ten minutes away.
```

**Total VO length:** ~28 seconds  
**Suggested voice service:** ElevenLabs — voice "Adam" or "Charlie" (Multilingual v3, stability 0.65, similarity 0.75)

---

## 4. Background Music

### Track Characteristics
- **Genre:** Cinematic electronic / lo-fi trap hybrid
- **Energy curve:** Starts minimal (just a pulse beat), builds through Scene 2, peaks at Scene 3, resolves to quiet confident tone at Scene 4
- **BPM:** 85–95 (slow enough to feel premium, fast enough to feel modern)
- **Key:** Minor (A minor or D minor — matches the orange/dark visual palette)
- **No lyrics** — VO must sit on top cleanly

### Specific Track Recommendations (Royalty-Free)

| Source | Track | Why |
|---|---|---|
| **Epidemic Sound** | "Drift Into Darkness" by Ooyy | Exactly this energy — minimal beats, builds |
| **Artlist** | "Blue Dream" by Valdi Sabev | Cinematic, brooding, premium |
| **Artlist** | "Cascade" by AGST | Electronic, builds to a crescendo at 30s |
| **Pixabay (free)** | Search "cinematic trap minimal" | Budget option |
| **Soundraw.io** | Generate: Cinematic / Electronic / 90bpm / Dark | AI-generated, instant, royalty-free |

### Music Edit Notes

```
0:00–0:03  →  Intro pulse only (kick drum, single bass note). Let the typography hit silently.
0:03–0:08  →  Bass line enters. Subtle hi-hats.
0:08–0:18  →  Build: add a chord pad, synth layer, more percussion.
0:18–0:30  →  Peak energy: full beat, any melodic element. This is the output reel.
0:30–0:36  →  Drop: strip back to just bass + pad. Contemplative.
0:36–0:45  →  Outro: fade to near-silence. Last note resolves on "ten minutes away."
```

---

## 5. Technical Implementation Tasks

### Phase 1 — Foundation

- [ ] Update `Root.tsx`: set `durationInFrames: 1350`, keep `fps: 30`, `width: 1920`, `height: 1080`
- [ ] Add second `<Composition>` in `Root.tsx` for the 9:16 vertical version: `width: 1080`, `height: 1920`, `id: "vertical"`
- [ ] Install `@remotion/noise` for organic particle effects
- [ ] Add `@remotion/shapes` for SVG path utilities
- [ ] Verify Tailwind tokens (`--bg-base`, `--accent-primary`, etc.) are loading correctly in `style.css`
- [ ] Import Inter + JetBrains Mono via `@remotion/google-fonts` (avoid FOUT in render)

### Phase 2 — New Utility Components

- [ ] **`KineticWord.tsx`** — animates a single word: props `text`, `delay`, `direction` (`left | right | top | bottom | slam`). Handles the split-letter fragment effect using clip-path.
- [ ] **`ParticleTrail.tsx`** — renders N dots that travel along an SVG `<path>` using `strokeDashoffset` math. Props: `path`, `count`, `color`, `speed`.
- [ ] **`StatCounter.tsx`** — animates a number from 0 to `target` over `durationInFrames`. Supports suffix ("+", "★", "k"). Uses `interpolate` + `Math.floor`.
- [ ] **`WaveformBars.tsx`** — a row of ~24 bars that animate height using `@remotion/noise` (Perlin noise for organic feel). Props: `color`, `barCount`, `speed`.
- [ ] **`PhoneMockup.tsx`** — a vertical phone frame (rounded corners, notch, status bar) that accepts `children`. Handles its own entry animation via `spring`. Props: `delay`, `children`, `glowColor`.
- [ ] **`PipelineNode.tsx`** — a circle with icon + label + activation animation (sonar ring pulse). Props: `icon`, `label`, `activateAtFrame`, `detail`.
- [ ] **`GlowButton.tsx`** — CTA button with heartbeat glow pulse. Props: `label`, `subtext`, `appearAtFrame`.
- [ ] **`RippleReveal.tsx`** — expanding circle reveal effect. A circle grows from center using `spring`, and the wrapped content is revealed inside using `clip-path: circle(...)`.

### Phase 3 — Rebuild Scenes

- [ ] **Delete** old `Scene0_Hero.tsx` — replace entirely
- [ ] **`Scene0_Hook.tsx`** — Kinetic typography. "MAKING VIDEOS / IS / BROKEN." Three `KineticWord` components, staggered 8 frames apart. Word 3 gets the crack/fragment split effect. Background: pure `#09090b`, no glow yet.
- [ ] **`Scene1_Claim.tsx`** — Two `StatCounter` components side by side. Left: count up to "4:00:00". Right: count down from "10:00" to "0:00". Connecting arrow SVG draws itself. Tagline fades in character-by-character below.
- [ ] **`Scene2_Pipeline.tsx`** — Five `PipelineNode` components connected by SVG paths. `ParticleTrail` components travel between nodes. Each node activation triggers its micro-detail panel. Final node triggers particle burst using `@remotion/noise`.
- [ ] **`Scene3_OutputReel.tsx`** — Six `PhoneMockup` components, staggered entry. Each contains a styled background gradient + title overlay (no real video needed — styled divs). Style badge pills animate in below each phone. Phones cluster together for the final headline "What will YOU make?"
- [ ] **`Scene4_CTA.tsx`** — Three-beat sequence: stat strip → CTA button (`GlowButton` + `RippleReveal`) → domain typewriter. Radial orange glow bg.

### Phase 4 — Rewire Main.tsx

- [ ] Rewrite `Main.tsx` to use new scene sequence with correct frame offsets:
  ```
  Scene0_Hook:      frames 0   → 90
  Scene1_Claim:     frames 90  → 240
  Scene2_Pipeline:  frames 240 → 540
  Scene3_OutputReel: frames 540 → 990
  Scene4_CTA:       frames 990 → 1350
  ```
- [ ] Remove `BrowserFrame` wrapper — scenes run full-bleed (no browser chrome)
- [ ] Remove `Cursor` component — not needed in the new structure
- [ ] Add scene transition: a single-frame black flash (`<Sequence>` with a black `AbsoluteFill` for 2 frames) between Scene 0 and Scene 1 for a hard-cut punch effect

### Phase 5 — Polish

- [ ] Add `<Audio>` component in `Main.tsx` for BGM track (import local file `src/assets/bgm.mp3`)
- [ ] Add `<Audio>` component for VO track (`src/assets/voiceover.mp3`)
- [ ] Volume mix: BGM at `volume={0.35}` during VO sections, `volume={0.65}` during silent Scene 0
- [ ] Add subtle scanline overlay component (CSS repeating-linear-gradient, 2px lines, 3% opacity) during Scene 2 pipeline for "AI processing" texture
- [ ] Color-grade Scene 3 Output Reel: add a very subtle orange vignette behind the phones using a radial gradient `AbsoluteFill`
- [ ] Test full render: `npx remotion render src/index.ts walkthrough out/reelforge_marketing.mp4 --codec=h264`
- [ ] Test vertical render: `npx remotion render src/index.ts vertical out/reelforge_vertical.mp4 --codec=h264`

### Phase 6 — Assets Needed

- [ ] **Voiceover audio file** — Record using ElevenLabs (see VO script above). Export as MP3 320kbps. Save to `apps/video/src/assets/voiceover.mp3`
- [ ] **BGM track** — License or download recommended track. Trim to 46 seconds. Edit energy curve per music notes above. Save to `apps/video/src/assets/bgm.mp3`
- [ ] **Phone content backgrounds** — 6 styled gradient divs (no real images needed; pure CSS gradients matching each style's color palette — see Scene 3 table above)
- [ ] **Pipeline node icons** — Use `lucide-react`: `Lightbulb` (Idea), `FileText` (Script), `Mic2` (Voice), `Image` (Grok), `Video` (Output)

---

## 6. Component Architecture Overview

```
apps/video/src/
├── Main.tsx                    ← rewrite: scene sequencing + audio
├── Root.tsx                    ← update: 1350 frames, add vertical composition
├── style.css                   ← keep: Tailwind tokens
├── index.ts                    ← keep as-is
│
├── assets/
│   ├── bgm.mp3                 ← NEW: licensed BGM track
│   └── voiceover.mp3           ← NEW: ElevenLabs VO
│
├── scenes/
│   ├── Scene0_Hook.tsx         ← NEW (replaces Scene0_Hero)
│   ├── Scene1_Claim.tsx        ← NEW (replaces Scene1_Idea)
│   ├── Scene2_Pipeline.tsx     ← NEW (replaces Scene2_Script)
│   ├── Scene3_OutputReel.tsx   ← NEW (replaces Scene3_Assembly)
│   └── Scene4_CTA.tsx          ← NEW
│
└── components/
    ├── KineticWord.tsx          ← NEW
    ├── ParticleTrail.tsx        ← NEW
    ├── StatCounter.tsx          ← NEW
    ├── WaveformBars.tsx         ← NEW
    ├── PhoneMockup.tsx          ← NEW
    ├── PipelineNode.tsx         ← NEW
    ├── GlowButton.tsx           ← NEW
    ├── RippleReveal.tsx         ← NEW
    ├── Typewriter.tsx           ← keep (reuse in Scene 2 pipeline detail)
    ├── BrowserFrame.tsx         ← keep (not used in video but keep for reference)
    └── Cursor.tsx               ← keep (not used in video but keep for reference)
```

---

## 7. Render & Export Checklist

- [ ] `pnpm --filter video dev` — preview in Remotion Studio, scrub every scene
- [ ] Check all spring animations don't clip at scene boundaries (no jarring cuts mid-animation)
- [ ] Verify font loading — fonts must be statically imported, not loaded via CSS `@import` in render
- [ ] Final render 16:9: `npx remotion render src/index.ts walkthrough out/reelforge_16x9.mp4`
- [ ] Final render 9:16: `npx remotion render src/index.ts vertical out/reelforge_9x16.mp4`
- [ ] Output quality: H.264, CRF 18, 1920×1080 @ 30fps ≈ 80–120 MB
- [ ] Upload 16:9 to YouTube as unlisted first — check colors (YouTube applies its own color space conversion)
- [ ] Trim vertical version to 30s for TikTok (platform sweet spot for SaaS demos)

---

## 8. Quality Bar

A scene is **done** only when it passes all three:

1. **The pause test** — scrub to any random frame and freeze. Does it look like a premium still image? Every frame should be poster-worthy.
2. **The mute test** — watch without audio. Is the story still clear? Do you still feel the energy?
3. **The scroll test** — imagine seeing the first 3 seconds as an autoplay video on Twitter at 2am. Does your thumb stop?

If any scene fails one of these, it needs another pass before moving to the next.
