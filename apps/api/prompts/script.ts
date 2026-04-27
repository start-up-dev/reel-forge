import type { ProjectRow } from "../lib/db/schema.js";
import { projectContext, isBengali } from "./utils.js";

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

// ─── Bengali base system prompt ───────────────────────────────────────────────
// Shared between idea generation and script generation for Bengali projects.

export const BENGALI_SCRIPT_SYSTEM = `তুমি বিশ্বের সেরা ভাইরাল কনটেন্ট স্ক্রিপ্ট রাইটার। তোমার টার্গেট অডিয়েন্স: বাংলাদেশ। ভাষা: বাংলা (কথ্য বাংলা + প্রয়োজনে Banglish)।

তুমি TikTok, Facebook Reels, Instagram Reels, YouTube Shorts — এই সব প্ল্যাটফর্মের জন্য ভাইরাল স্ক্রিপ্ট লিখো যা মানুষ শেষ পর্যন্ত দেখে, শেয়ার করে, এবং মনে রাখে।

## মূল দর্শন
1. Hook is King — প্রথম ৩ সেকেন্ডেই দর্শককে আটকাতে হবে।
2. Emotion over Information — মানুষ তথ্য মনে রাখে না, অনুভূতি মনে রাখে।
3. বাংলাদেশি Context — ঢাকার ট্র্যাফিক, CNG, মামা-চাচা culture, বিয়ের অনুষ্ঠান, পরীক্ষার চাপ, রিকশা, চায়ের দোকান — এই রিয়েল লাইফ রেফারেন্স ব্যবহার করো।
4. Pattern Interrupt — প্রতিটা স্ক্রিপ্টে এমন কিছু রাখো যা দর্শক expect করেনি।
5. Strong CTA — শেষে এমন কিছু বলো যা মানুষ শেয়ার/কমেন্ট/সেভ করতে বাধ্য হয়।

## হুক ফর্মুলা
- SHOCK HOOK: "বাংলাদেশে প্রতিদিন [অবাক করা তথ্য] হচ্ছে!"
- QUESTION HOOK: "তুমি কি জানো কেন [রহস্যময় প্রশ্ন]?"
- STORY HOOK: "সেদিন রিকশায় বসে একটা জিনিস বুঝলাম..."
- PAIN HOOK: "পরীক্ষার আগের রাতে এটা করলে [ফলাফল]"
- PROMISE HOOK: "এই ১টা কাজ করলে [বড় সুবিধা]"
- CONTROVERSY: "বেশিরভাগ মানুষ এই ভুলটা করে..."
- CURIOSITY GAP: "ভিডিওর শেষে একটা কথা বলব যেটা মাথা ঘুরিয়ে দেবে"

## ভাষার নিয়ম
- কথ্য বাংলা: "কী অবস্থা ভাই!", "ধুর মিয়া!", Banglish okay: "seriously বলছি"
- এড়িয়ে চলো: সাধু ভাষা, অতিরিক্ত formal ভাষা, অনুবাদের মতো ইংরেজি

## ভাইরাল ট্রিগার (কমপক্ষে ২টি রাখো)
- Relatability, Surprise/twist, Emotion (হাসি/কান্না/গর্ব), Community ("বাংলাদেশিরাই বুঝবে"), Tag a friend

## আউটপুট নিয়ম
- শুধু spoken script — কোনো scene direction, title, label, বা markdown নয়
- ভাষা সম্পূর্ণ বাংলা (প্রয়োজনে Banglish)`;

// ─── Render style script modifiers ───────────────────────────────────────────
// Appended to the script generation prompt to colour the writing style
// per visual render type. Add new render styles here.

export const RENDER_STYLE_SCRIPT_MODIFIERS: Record<string, string> = {
  mascot: "Script style: Write entirely from the MASCOT CHARACTER's first-person point of view. The mascot IS the subject matter, personified — it speaks directly to the viewer with a playful, confident, slightly dramatic personality. e.g. 'আমি [subject] বলছি — আমাকে এত ভয় পাও ক্যান?'",
  cartoon: "Script style: Write for cartoon animation. Use exaggerated emotions, comedic timing, and big reaction beats. At least one surprising twist. Punchy, rhythmic sentences.",
  animation_2d: "Script style: Clean educational explainer. Facts-forward, confident tone. Short declarative sentences that work well with animated reveals. Use sequential structure ('প্রথমে... তারপর... সবশেষে...').",
  motion_graphics: "Script style: Ultra-punchy kinetic script. Stats, facts, bold claims. Every sentence feels like a graphic reveal. Maximum impact per word. e.g. '৩টি কারণ। ৩০ সেকেন্ড। বদলে যাবে সব।'",
  cinematic: "Script style: Cinematic narrative. Immersive, story-driven, documentary tone. Allow longer atmospheric sentences. Build emotional arc from hook to resolution.",
  stock_footage: "Script style: Polished professional brand video. Warm but authoritative tone. Informational with clear value proposition. Natural and accessible language.",
  whiteboard: "Script style: Step-by-step tutorial. Sequential structure ('প্রথমে...', 'এরপর...', 'শেষে...'). Friendly encouraging teacher tone. Each sentence introduces one concept clearly.",
};

// ─── Builder ──────────────────────────────────────────────────────────────────

export function buildScriptMessages(
  project: ProjectRow,
  idea: string,
  targetDurationSeconds: number,
  renderStyle?: string,
): PromptPair {
  const [minW, maxW] = WORDS_FOR_DURATION[targetDurationSeconds] ?? [65, 85];
  const styleModifier = renderStyle ? (RENDER_STYLE_SCRIPT_MODIFIERS[renderStyle] ?? "") : "";

  if (isBengali(project)) {
    return {
      system: BENGALI_SCRIPT_SYSTEM,
      user: `${projectContext(project)}

সময়: ${targetDurationSeconds} সেকেন্ড (${minW}-${maxW} শব্দ)
আইডিয়া: ${idea}
${styleModifier ? `\n${styleModifier}` : ""}
এখনই স্ক্রিপ্ট লিখো। শুধু spoken text — কোনো label, title, বা markdown নয়।`,
    };
  }

  return {
    user: `You are a viral short-form video scriptwriter.

Project context:
${projectContext(project)}
${styleModifier ? `\n${styleModifier}\n` : ""}
Rules:
- Script must be ${minW}-${maxW} words (${targetDurationSeconds} seconds at natural speech pace)
- No scene directions — spoken words only
- Hook must land in the first 3 seconds
- End with a clear call to action
- Write entirely in ${project.language}
- Return ONLY the script text, no titles, no labels, no markdown
${project.claudeSystemPrompt ? `\nAdditional instructions: ${project.claudeSystemPrompt}` : ""}

User's idea: ${idea}

Write the script now.`,
  };
}
