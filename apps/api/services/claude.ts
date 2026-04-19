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

// ─── Skill helpers ────────────────────────────────────────────────────────────

function isPlaceholder(id: string | undefined): boolean {
  return !id || id.startsWith("PLACEHOLDER_");
}

const SCRIPT_SKILL_BY_LANGUAGE: Record<string, string | undefined> = {
  Bengali: env.CLAUDE_SKILL_SCRIPT_BENGALI,
  English: env.CLAUDE_SKILL_SCRIPT_ENGLISH,
};

function getScriptSkillId(language: string): string | undefined {
  return SCRIPT_SKILL_BY_LANGUAGE[language] ?? env.CLAUDE_SKILL_SCRIPT_ENGLISH;
}

const WORDS_FOR_DURATION: Record<number, [number, number]> = {
  15: [30, 45],
  30: [65, 85],
  45: [100, 120],
  60: [135, 160],
};

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

// ─── Idea generation ──────────────────────────────────────────────────────────

export async function generateIdeas(project: ProjectRow, topic: string): Promise<IdeaCard[]> {
  const skillId = env.CLAUDE_SKILL_IDEAS;
  const platforms = Array.isArray(project.platforms)
    ? project.platforms.join(", ")
    : project.platforms;

  const userMessage = `Platform: ${platforms}
Niche: ${project.niche}
Target audience: ${project.targetAudience}
Language: ${project.language}
Style: ${project.videoStyle}
Tone: ${project.tone}

Topic: ${topic}

Generate 3 distinct video ideas. Return ONLY JSON:
[{"title":"...","body":"..."},{"title":"...","body":"..."},{"title":"...","body":"..."}]`;

  let message: Anthropic.Message;

  if (isPlaceholder(skillId)) {
    // Fallback: use system prompt
    message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: `You are a viral short-form video content strategist.
${projectContext(project)}

Generate exactly 3 distinct video ideas for the given topic. Each idea must be punchy, specific, and scroll-stopping.
Return ONLY a JSON array with this exact shape, no markdown, no explanation:
[{"title":"...", "body":"..."}, {"title":"...", "body":"..."}, {"title":"...", "body":"..."}]
title: 5–8 words, hooks the viewer instantly
body: 2–3 sentence description of the video angle and key points`,
      messages: [{ role: "user", content: `Topic: ${topic}` }],
    });
  } else {
    message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: [{ type: "skill" as const, id: skillId } as unknown as Anthropic.TextBlockParam],
      messages: [{ role: "user", content: userMessage }],
    });
  }

  const raw = message.content[0]?.type === "text" ? message.content[0].text.trim() : "[]";
  const match = raw.match(/\[[\s\S]*\]/);
  return JSON.parse(match?.[0] ?? "[]") as IdeaCard[];
}

// ─── Script generation ────────────────────────────────────────────────────────

export async function generateScript(
  project: ProjectRow,
  idea: string,
  targetDurationSeconds = 30,
): Promise<string> {
  const skillId = getScriptSkillId(project.language);
  const [minW, maxW] = WORDS_FOR_DURATION[targetDurationSeconds] ?? [65, 85];
  const platforms = Array.isArray(project.platforms)
    ? project.platforms.join(", ")
    : project.platforms;

  const userMessage = `Target: ${targetDurationSeconds} seconds spoken (${minW}–${maxW} words).
Platform: ${platforms}
Niche: ${project.niche}
Target audience: ${project.targetAudience}
Tone: ${project.tone}
Additional: ${project.claudeSystemPrompt ?? "none"}

Idea: ${idea}

Write the script now. Return ONLY the script text.`;

  let message: Anthropic.Message;

  if (isPlaceholder(skillId)) {
    // Fallback: use system prompt
    message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `You are a viral short-form video scriptwriter.

Project context:
${projectContext(project)}

Rules:
- Script must be ${minW}-${maxW} words (${targetDurationSeconds} seconds at natural speech pace)
- No scene directions — spoken words only
- Hook must land in the first 3 seconds
- End with a clear call to action
- Write entirely in ${project.language}
- Return ONLY the script text, no titles, no labels, no markdown

User's idea: ${idea}

Write the script now.`,
        },
      ],
    });
  } else {
    message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: [{ type: "skill" as const, id: skillId } as unknown as Anthropic.TextBlockParam],
      messages: [{ role: "user", content: userMessage }],
    });
  }

  const script = message.content[0]?.type === "text" ? message.content[0].text.trim() : "";
  if (!script) throw new Error("Script generation returned empty.");
  return script;
}

// ─── Scene splitting ──────────────────────────────────────────────────────────

export async function splitScenes(
  script: string,
  audioDurationSeconds: number,
): Promise<SceneSplit[]> {
  const skillId = env.CLAUDE_SKILL_GROK_PROMPTS;
  const minScenes = Math.ceil(audioDurationSeconds / 6);
  const targetCount = Math.max(minScenes, Math.round(audioDurationSeconds / 5));

  const userMessage = `Script:\n${script}

Audio duration: ${audioDurationSeconds} seconds
Required scenes: exactly ${targetCount}
Max durationHintSeconds per scene: 6 (Grok generates 6-second clips)
Sum of all durationHintSeconds: must equal exactly ${audioDurationSeconds}

Return ONLY a JSON array:
[{"sceneIndex":0,"textExcerpt":"...","visualPrompt":"...","motionPrompt":"...","durationHintSeconds":N}]`;

  let message: Anthropic.Message;

  if (isPlaceholder(skillId)) {
    // Fallback: use system prompt
    message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `You are a video production assistant. Split this voiceover script into scenes for a short-form video.

Script:
${script}

Total audio duration: ${audioDurationSeconds} seconds
Required scene count: exactly ${targetCount} scene${targetCount === 1 ? "" : "s"}

Rules:
- Create EXACTLY ${targetCount} scene${targetCount === 1 ? "" : "s"} — no more, no fewer
- Each scene covers a logical chunk of the script
- textExcerpt: the exact words from the script this scene covers (if only 1 scene, use the full script)
- visualPrompt: a detailed, vivid image generation prompt for the static base image (no text overlays, cinematic style, no specific real people)
- motionPrompt: 1–2 sentences describing camera movement and subject animation for the video clip (e.g. "slow push-in toward the glowing screen, dust particles drift upward"). No text overlays, no real people.
- durationHintSeconds: whole-number integer seconds this scene lasts, max 6. All values must sum to exactly ${audioDurationSeconds}. MUST be an integer ≥ 1.

Return ONLY a JSON array, no markdown:
[{"sceneIndex":0,"textExcerpt":"...","visualPrompt":"...","motionPrompt":"...","durationHintSeconds":N}, ...]`,
        },
      ],
    });
  } else {
    message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: [{ type: "skill" as const, id: skillId } as unknown as Anthropic.TextBlockParam],
      messages: [{ role: "user", content: userMessage }],
    });
  }

  const raw = message.content[0]?.type === "text" ? message.content[0].text.trim() : "[]";
  const match = raw.match(/\[[\s\S]*\]/);
  const result = JSON.parse(match?.[0] ?? "[]") as SceneSplit[];
  if (result.length === 0) throw new Error("Scene split returned no scenes.");
  return result;
}
