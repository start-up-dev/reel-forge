import Anthropic from "@anthropic-ai/sdk";
import { env } from "../lib/env.js";
import type { ProjectRow } from "../lib/db/schema.js";

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

export interface IdeaCard {
  title: string;
  body: string;
}

export interface SceneSplit {
  sceneIndex: number;
  textExcerpt: string;
  visualPrompt: string;
  motionPrompt: string;
  durationHintSeconds: number;
}

const WORDS_FOR_DURATION: Record<number, [number, number]> = {
  15: [30, 45],
  30: [65, 85],
  45: [100, 120],
  60: [135, 160],
};

// ─── Bengali skill system prompt (from bengali-script-writer.skill) ───────────

const BENGALI_SCRIPT_SYSTEM = `তুমি বিশ্বের সেরা ভাইরাল কনটেন্ট স্ক্রিপ্ট রাইটার। তোমার টার্গেট অডিয়েন্স: বাংলাদেশ। ভাষা: বাংলা (কথ্য বাংলা + প্রয়োজনে Banglish)।

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

// ─── Project context builder ──────────────────────────────────────────────────

function projectContext(project: ProjectRow): string {
  const platforms = Array.isArray(project.platforms)
    ? project.platforms.join(", ")
    : project.platforms;
  return [
    `Platform: ${platforms}`,
    `Niche: ${project.niche}`,
    `Target audience: ${project.targetAudience}`,
    `Video style: ${project.videoStyle}`,
    `Tone: ${project.tone}`,
    `Language: ${project.language}`,
    project.claudeSystemPrompt ? `Additional instructions: ${project.claudeSystemPrompt}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function isBengali(project: ProjectRow): boolean {
  return project.language?.toLowerCase() === "bengali";
}

// ─── Idea generation ──────────────────────────────────────────────────────────

export async function generateIdeas(project: ProjectRow, topic: string): Promise<IdeaCard[]> {
  const system = isBengali(project)
    ? `${BENGALI_SCRIPT_SYSTEM}

## আইডিয়া জেনারেশন
ঠিক ৩টি আলাদা ভিডিও আইডিয়া দাও। প্রতিটি আইডিয়া punchy, specific, এবং scroll-stopping হতে হবে।
title: ৫-৮ শব্দে hook — দর্শক আটকে যাবে
body: ২-৩ বাক্যে ভিডিওর angle এবং key points`
    : `You are a viral short-form video content strategist.
${projectContext(project)}

Generate exactly 3 distinct video ideas for the given topic. Each idea must be punchy, specific, and scroll-stopping.
title: 5–8 words, hooks the viewer instantly
body: 2–3 sentence description of the video angle and key points
Write all content in ${project.language}.`;

  const userContent = isBengali(project)
    ? `${projectContext(project)}\n\nটপিক: ${topic}`
    : `Topic: ${topic}`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system,
    tools: [
      {
        name: "submit_ideas",
        description: "Submit exactly 3 generated video ideas",
        input_schema: {
          type: "object" as const,
          properties: {
            ideas: {
              type: "array",
              minItems: 3,
              maxItems: 3,
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  body: { type: "string" },
                },
                required: ["title", "body"],
              },
            },
          },
          required: ["ideas"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "submit_ideas" },
    messages: [{ role: "user", content: userContent }],
  });

  const toolUse = message.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );
  if (!toolUse) throw new Error("Idea generation returned no tool call.");
  const { ideas } = toolUse.input as { ideas: IdeaCard[] };
  return ideas ?? [];
}

// ─── Script generation ────────────────────────────────────────────────────────

export async function generateScript(
  project: ProjectRow,
  idea: string,
  targetDurationSeconds = 30,
): Promise<string> {
  const [minW, maxW] = WORDS_FOR_DURATION[targetDurationSeconds] ?? [65, 85];

  const userContent = isBengali(project)
    ? `${projectContext(project)}

সময়: ${targetDurationSeconds} সেকেন্ড (${minW}-${maxW} শব্দ)
আইডিয়া: ${idea}

এখনই স্ক্রিপ্ট লিখো। শুধু spoken text — কোনো label, title, বা markdown নয়।`
    : `You are a viral short-form video scriptwriter.

Project context:
${projectContext(project)}

Rules:
- Script must be ${minW}-${maxW} words (${targetDurationSeconds} seconds at natural speech pace)
- No scene directions — spoken words only
- Hook must land in the first 3 seconds
- End with a clear call to action
- Write entirely in ${project.language}
- Return ONLY the script text, no titles, no labels, no markdown
${project.claudeSystemPrompt ? `\nAdditional instructions: ${project.claudeSystemPrompt}` : ""}

User's idea: ${idea}

Write the script now.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    ...(isBengali(project) ? { system: BENGALI_SCRIPT_SYSTEM } : {}),
    messages: [{ role: "user", content: userContent }],
  });

  const script = message.content[0]?.type === "text" ? message.content[0].text.trim() : "";
  if (!script) throw new Error("Script generation returned empty.");
  return script;
}

// ─── Scene splitting ──────────────────────────────────────────────────────────

export async function splitScenes(
  script: string,
  audioDurationSeconds: number,
): Promise<SceneSplit[]> {
  const minScenes = Math.ceil(audioDurationSeconds / 6);
  const targetCount = Math.max(minScenes, Math.round(audioDurationSeconds / 5));

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    tools: [
      {
        name: "submit_scenes",
        description: "Submit the scene split for the voiceover script",
        input_schema: {
          type: "object" as const,
          properties: {
            scenes: {
              type: "array",
              minItems: targetCount,
              maxItems: targetCount,
              items: {
                type: "object",
                properties: {
                  sceneIndex: {
                    type: "integer",
                    description: "0-based scene index",
                  },
                  textExcerpt: {
                    type: "string",
                    description: "Exact words from the script this scene covers",
                  },
                  visualPrompt: {
                    type: "string",
                    description:
                      "Detailed image generation prompt (cinematic style, no text overlays, no specific real people)",
                  },
                  motionPrompt: {
                    type: "string",
                    description:
                      "1–2 sentences describing camera movement and subject animation (no text overlays, no real people)",
                  },
                  durationHintSeconds: {
                    type: "integer",
                    minimum: 1,
                    maximum: 6,
                    description: `Whole-number seconds this scene lasts (1–6). All scenes must sum to exactly ${audioDurationSeconds}.`,
                  },
                },
                required: [
                  "sceneIndex",
                  "textExcerpt",
                  "visualPrompt",
                  "motionPrompt",
                  "durationHintSeconds",
                ],
              },
            },
          },
          required: ["scenes"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "submit_scenes" },
    messages: [
      {
        role: "user",
        content: `You are a video production assistant. Split this voiceover script into exactly ${targetCount} scene${targetCount === 1 ? "" : "s"} for a short-form video.

Script:
${script}

Total audio duration: ${audioDurationSeconds} seconds
Required scene count: exactly ${targetCount} scene${targetCount === 1 ? "" : "s"}

Rules:
- Create EXACTLY ${targetCount} scene${targetCount === 1 ? "" : "s"} — no more, no fewer
- Each scene covers a logical chunk of the script
- textExcerpt: the exact words from the script this scene covers
- visualPrompt: detailed, vivid image generation prompt (cinematic style, no text overlays, no specific real people)
- motionPrompt: 1–2 sentences on camera movement and subject animation (no text overlays, no real people)
- durationHintSeconds: whole-number integer 1–6. All values must sum to exactly ${audioDurationSeconds}.

Call submit_scenes with your result.`,
      },
    ],
  });

  const toolUse = message.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );
  if (!toolUse) throw new Error("Scene split returned no tool call.");
  const { scenes } = toolUse.input as { scenes: SceneSplit[] };
  if (!scenes || scenes.length === 0) throw new Error("Scene split returned no scenes.");
  return scenes;
}
