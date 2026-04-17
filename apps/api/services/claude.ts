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
  durationHintSeconds: number;
}

function projectContext(project: ProjectRow): string {
  return [
    `Platform: ${project.platform}`,
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

export async function generateIdeas(project: ProjectRow, topic: string): Promise<IdeaCard[]> {
  const message = await client.messages.create({
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

  const raw = message.content[0]?.type === "text" ? message.content[0].text.trim() : "[]";
  const match = raw.match(/\[[\s\S]*\]/);
  return JSON.parse(match?.[0] ?? "[]") as IdeaCard[];
}

export async function generateScript(project: ProjectRow, idea: string): Promise<string> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are a viral short-form video scriptwriter.

Project context:
${projectContext(project)}

Rules:
- Script must be 80-150 words (30-60 seconds at natural speech pace)
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

  const script = message.content[0]?.type === "text" ? message.content[0].text.trim() : "";
  if (!script) throw new Error("Script generation returned empty.");
  return script;
}

export async function splitScenes(
  script: string,
  audioDurationSeconds: number,
): Promise<SceneSplit[]> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `You are a video production assistant. Split this voiceover script into scenes for a short-form video.

Script:
${script}

Total audio duration: ${audioDurationSeconds} seconds

Rules:
- Create 6–12 scenes (never fewer than 6, never more than 12)
- Each scene covers a logical chunk of the script (2–4 sentences or a natural pause)
- textExcerpt: the exact words from the script this scene covers
- visualPrompt: a detailed, vivid image generation prompt (no text overlays, cinematic style, no specific real people)
- durationHintSeconds: how many seconds this scene lasts (all values must sum to approximately ${audioDurationSeconds})

Return ONLY a JSON array, no markdown:
[{"sceneIndex":0,"textExcerpt":"...","visualPrompt":"...","durationHintSeconds":N}, ...]`,
      },
    ],
  });

  const raw = message.content[0]?.type === "text" ? message.content[0].text.trim() : "[]";
  const match = raw.match(/\[[\s\S]*\]/);
  const result = JSON.parse(match?.[0] ?? "[]") as SceneSplit[];
  if (result.length === 0) throw new Error("Scene split returned no scenes.");
  return result;
}
