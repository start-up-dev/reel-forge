import type { BrandProfileRow } from "../lib/db/schema.js";
import { brandContext } from "./utils.js";
import { buildActionReelScriptMessages } from "./action-reel.js";

export interface PromptPair {
  system?: string;
  user: string;
}

// Words-per-second ranges used to enforce target duration at script generation time.
// Key = target duration in seconds; value = [minWords, maxWords].
export const WORDS_FOR_DURATION: Record<number, [number, number]> = {
  15: [30, 45],
  30: [65, 85],
  45: [100, 120],
  60: [135, 160],
};

export const ENGLISH_SCRIPT_SYSTEM = `You are an elite viral short-form video scriptwriter with a proven track record on TikTok, Instagram Reels, and YouTube Shorts. You write content that stops the scroll, triggers real emotion, and compels sharing.

## Core philosophy
1. Hook is King — the first 3 seconds must create an irresistible reason to keep watching: curiosity, shock, pain recognition, or a bold claim they didn't expect
2. Emotion beats information — people share feelings, not facts. Every fact you include must serve an emotional purpose
3. Pattern interrupt — always lead with the unexpected angle. If the obvious take exists, find what's beneath it
4. Conversational punch — write how the audience actually talks: short bursts, rhythm that sounds right spoken aloud, contractions always
5. One idea, done right — one sharp insight delivered with total commitment beats five mediocre points

## Hook formulas — pick ONE, execute it hard
- SHOCK: "This [common thing] is [surprisingly wrong/dangerous/misunderstood]—"
- QUESTION: "Why does [thing everyone experiences] actually [unexpected answer]?"
- STORY DROP: "I [specific action] and what happened next completely changed [belief]—"
- PAIN MIRROR: "If you've ever [hyper-specific relatable struggle], this is exactly for you."
- PROMISE: "Do [one specific thing] and [specific, credible, meaningful result]."
- CONTROVERSY: "Most people get [topic] completely wrong. Here's the part they always skip."
- CURIOSITY GAP: "There's one thing about [topic] nobody talks about — and it changes everything."

## Script structure
- Hook (0–3s): Drop into tension, curiosity, or recognition immediately — no warm-up, no intro
- Body: Deliver on the hook with 1–2 punchy insights; never 5 weak ones. Build momentum toward the payoff
- CTA (last 10%): ONE clear action tied to the video's specific value — not generic "like and subscribe"

## Language rules
- Sentences under 15 words. Always.
- Contractions everywhere: "you're", "it's", "that's", "don't"
- Speak to ONE person: always "you", never "people" or "everyone"
- No corporate language, no passive voice, no hedging ("kind of", "sort of", "maybe")
- Every sentence must either advance tension, deepen curiosity, or punch an emotion — if it does none of these, cut it

## What to actively avoid
- Opening with "Today we're going to talk about..." or "In this video..."
- Information dump without emotional stakes
- Weak CTA: "Let me know what you think in the comments below!"
- Vague hooks: "This is so important" / "You need to hear this"
- Trailing off — the last line must be your hardest punch, not a soft landing`;

export const RENDER_STYLE_SCRIPT_MODIFIERS: Record<string, string> = {
  mascot: "Script style: Write entirely from the MASCOT CHARACTER's first-person point of view. The mascot IS the subject matter, personified — it speaks directly to the viewer with a playful, confident, slightly dramatic personality.",
  cartoon: "Script style: Write for cartoon animation. Use exaggerated emotions, comedic timing, and big reaction beats. At least one surprising twist. Punchy, rhythmic sentences.",
  animation_2d: "Script style: Clean educational explainer. Facts-forward, confident tone. Short declarative sentences that work well with animated reveals. Use sequential structure (First... Then... Finally...).",
  motion_graphics: "Script style: Ultra-punchy kinetic script. Stats, facts, bold claims. Every sentence feels like a graphic reveal. Maximum impact per word.",
  cinematic: "Script style: Cinematic narrative. Immersive, story-driven, documentary tone. Allow longer atmospheric sentences. Build emotional arc from hook to resolution.",
  stock_footage: "Script style: Polished professional brand video. Warm but authoritative tone. Informational with clear value proposition. Natural and accessible language.",
  whiteboard: "Script style: Step-by-step tutorial. Sequential structure (First... Then... Finally...). Friendly encouraging teacher tone. Each sentence introduces one concept clearly.",
};

function talkingWordRange(targetDurationSeconds: number): [number, number, number] {
  const sceneCount = Math.ceil(targetDurationSeconds / 6);
  return [sceneCount * 12, sceneCount * 16, sceneCount];
}

export function buildScriptMessages(
  brand: BrandProfileRow,
  idea: string,
  targetDurationSeconds: number,
  renderStyle?: string,
  videoType?: string,
  actionReelStyle?: string | null,
): PromptPair {
  if (videoType === "action_reel") {
    return buildActionReelScriptMessages(brand, idea, targetDurationSeconds, actionReelStyle);
  }

  const styleModifier = renderStyle ? (RENDER_STYLE_SCRIPT_MODIFIERS[renderStyle] ?? "") : "";

  if (videoType === "talking") {
    const [minW, maxW, sceneCount] = talkingWordRange(targetDurationSeconds);
    return {
      system: ENGLISH_SCRIPT_SYSTEM,
      user: `Brand context:
${brandContext(brand)}
${styleModifier ? `\n${styleModifier}\n` : ""}
VIDEO TYPE: TALKING HEAD — each sentence becomes one 6-second video clip.

CRITICAL STRUCTURE RULES:
- Write EXACTLY ${sceneCount} sentences — one per clip.
- Each sentence must be 12–16 words (fits 6 seconds at natural speech pace).
- Every sentence must be grammatically complete — never end mid-thought.
- Count words in each sentence before writing the next. Adjust until it's 12–16.
- Total word count: ${minW}–${maxW} words across all ${sceneCount} sentences.
- Write as a continuous spoken script — sentences flow naturally into each other.

Video idea: ${idea}

Write the script now. Spoken words only — no scene directions, no titles, no labels, no markdown, no sentence numbers.`,
    };
  }

  const [minW, maxW] = WORDS_FOR_DURATION[targetDurationSeconds] ?? [65, 85];

  return {
    system: ENGLISH_SCRIPT_SYSTEM,
    user: `Brand context:
${brandContext(brand)}
${styleModifier ? `\n${styleModifier}\n` : ""}
Word count: ${minW}–${maxW} words (${targetDurationSeconds} seconds at natural speech pace)

Video idea: ${idea}

Write the script now. Spoken words only — no scene directions, no titles, no labels, no markdown.`,
  };
}
