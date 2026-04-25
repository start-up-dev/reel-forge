import Anthropic from "@anthropic-ai/sdk";
import { jsonrepair } from "jsonrepair";
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

const SCENE_DIRECTOR_SYSTEM = `You are a world-class short-form video director specialising in viral TikTok and Instagram Reels content. Your only job is to design scenes that stop the scroll.

## Core philosophy
- The voiceover carries the MESSAGE. The visuals carry the EMOTION. They must amplify each other, not illustrate each other literally.
- Never show a person talking to camera. Ever. You direct cinematic B-roll only.
- Every frame must be so visually interesting that someone would pause mid-scroll just to look at it.
- Think in feelings, not descriptions. Don't write "tired man on couch". Write "phone screen glowing electric-blue at 2 am casting harsh light across dark eye-bags and limp hands, rest of room pitch black".

## visualPrompt — how to write it
Target: AI image generator, 9:16 vertical portrait frame.
Always specify ALL of the following:

CAMERA ANGLE — pick one that creates drama:
  extreme close-up (ECU), low-angle hero, high-angle god-view, POV first-person, Dutch tilt, silhouette against bright background, over-the-shoulder reveal

LENS CHARACTER — pick one:
  anamorphic flare + horizontal bokeh streaks, 85mm shallow depth of field (subject sharp, world blurred), wide 24mm environmental, macro hyper-detail

LIGHTING — pick one that matches the emotion:
  harsh cold blue-white phone/screen glow in total darkness, warm amber single lamp cutting through shadow, golden hour rim light turning edges to fire, neon magenta-cyan urban spill, god rays / volumetric light beams through haze, cool silver moonlight through curtain, clinical harsh white fluorescent

COLOR GRADE — pick one:
  muted teal-orange cinematic, high-contrast vivid oversaturated, desaturated grey with single colour pop, moody dark crushed blacks with glow highlights

SUBJECT — be hyper-specific, no generic people:
  a specific object or environment or abstract visual. If a person is needed: silhouette only, or hands/feet only, or extreme close-up of one body part (eye, hand, nape). No faces. No mouth moving.

ATMOSPHERE — layer one or two:
  cigarette/incense smoke curling, steam rising from tea, rain beads on glass, dust motes in light beam, shallow bokeh bubbles of city lights, lens flare

## motionPrompt — how to write it
2–3 sentences covering:
1. CAMERA MOVE: slow push-in building tension | pull-back reveal expanding scale | smooth handheld urgency | silky orbital 360 | tilt up from feet to sky | rack focus foreground→background | whip pan cut energy | floating glide
2. SUBJECT ANIMATION: what specifically moves — phone screen notification flash, steam curling upward, curtain billowing, hands trembling, light flicker, water surface ripple, clock hands spinning
3. ATMOSPHERE MOTION: bokeh orbs drifting, dust particles floating up through beam, rain streaks accelerating, smoke wisping, shadows slowly shifting

## Visual metaphor toolkit — use when the script discusses abstract concepts
- Fatigue / cortisol / stress → red particles exploding outward, shattered glass in slow-mo, clock face melting, chaotic blurred Dhaka traffic at rush hour
- Sleep / rest / recovery → star-field timelapse overhead, still water mirror reflection, white curtain in gentle breeze, soft amber dawn light creeping across floor
- Phone addiction / screen time → blue screen glow as only light source, endless scroll reflection in eyes, notification icons raining like confetti
- Relationship tension / family → two untouched tea cups going cold, empty chair at dining table, light split between two sides of a room
- Health / energy / vitality → heartbeat pulse visualised as light wave, clear water flowing over stones, sunlight breaking through leaves in slow-mo
- Urban Bangladesh context → Dhaka neon-lit street at night shot low-angle with rickshaws blurred, steaming tea-stall closeup, CNG interior POV at golden hour, rooftop with city bokeh below

## Hard bans — NEVER include these
- Any person talking, facing camera, or with visible moving mouth
- Generic stock-photo compositions (person at laptop, couple walking, handshake)
- Plain or studio backgrounds
- Text, numbers, subtitles, logos, or UI elements in frame
- Named real celebrities or public figures`;

function tryParseArray(s: string): unknown[] | null {
  // First attempt: strict JSON
  try {
    const parsed = JSON.parse(s);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    // fall through to repair
  }
  // Second attempt: jsonrepair handles unescaped quotes, trailing commas, etc.
  try {
    const parsed = JSON.parse(jsonrepair(s));
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    // unrecoverable
  }
  return null;
}

function extractScenes(rawInput: unknown): SceneSplit[] | null {
  const input = rawInput as { scenes?: unknown };
  let candidate = input.scenes;

  // Claude sometimes JSON-encodes the array as a string; repair+parse it
  if (typeof candidate === "string") {
    candidate = tryParseArray(candidate);
  }

  if (!Array.isArray(candidate) || candidate.length === 0) return null;
  return candidate as SceneSplit[];
}

async function callSplitScenes(
  script: string,
  audioDurationSeconds: number,
  targetCount: number,
): Promise<unknown> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: SCENE_DIRECTOR_SYSTEM,
    tools: [
      {
        name: "submit_scenes",
        description: "Submit the final scene breakdown",
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
                      "Hyper-specific AI image prompt: camera angle + lens + lighting + colour grade + subject + atmosphere. 9:16 vertical. No text, no talking faces, no generic compositions.",
                  },
                  motionPrompt: {
                    type: "string",
                    description:
                      "2–3 sentences: camera movement + subject animation + atmosphere motion. Cinematic and specific. No text overlays, no real people.",
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
        content: `Split this voiceover script into exactly ${targetCount} scene${targetCount === 1 ? "" : "s"}.

SCRIPT:
${script.replace(/"/g, "“").replace(/"/g, "”")}

Total audio duration: ${audioDurationSeconds} seconds
Required scene count: exactly ${targetCount}

Rules:
- EXACTLY ${targetCount} scene${targetCount === 1 ? "" : "s"} — no more, no fewer
- textExcerpt: exact words from the script this scene covers
- visualPrompt: follow the director system instructions precisely — specific camera angle, lens, lighting, grade, subject, atmosphere. Make it scroll-stopping.
- motionPrompt: camera move + subject animation + atmosphere motion. 2–3 sentences. Cinematic, not generic.
- durationHintSeconds: integer 1–6, all scenes sum to exactly ${audioDurationSeconds}
- The "scenes" field must be a JSON array, not a stringified JSON value.

Apply the visual metaphor toolkit where the script discusses emotions or abstract concepts. Go bold.`,
      },
    ],
  });

  const toolUse = message.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );
  if (!toolUse) throw new Error("Scene split returned no tool call.");
  return toolUse.input; // raw shape; extractScenes validates
}

export async function splitScenes(
  script: string,
  audioDurationSeconds: number,
): Promise<SceneSplit[]> {
  const minScenes = Math.ceil(audioDurationSeconds / 6);
  const targetCount = Math.max(minScenes, Math.round(audioDurationSeconds / 5));

  for (let attempt = 1; attempt <= 2; attempt++) {
    const raw = await callSplitScenes(script, audioDurationSeconds, targetCount);
    const scenes = extractScenes(raw);
    if (scenes) return scenes;
    console.warn(`[splitScenes] attempt ${attempt} returned invalid shape:`, JSON.stringify(raw));
  }

  throw new Error("Scene split failed after 2 attempts: model did not return a valid scenes array.");
}
