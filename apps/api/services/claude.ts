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
  // Each scene maps to one Grok Imagine clip (~6s); FFmpeg trims to durationHintSeconds.
  // Target ~5s per scene so clips have a little headroom after the trim.
  const targetSceneCount = Math.max(1, Math.round(audioDurationSeconds / 5));

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
Required scene count: exactly ${targetSceneCount} scene${targetSceneCount === 1 ? "" : "s"}

Rules:
- Create EXACTLY ${targetSceneCount} scene${targetSceneCount === 1 ? "" : "s"} — no more, no fewer
- Each scene covers a logical chunk of the script
- textExcerpt: the exact words from the script this scene covers (if only 1 scene, use the full script)
- visualPrompt: a detailed, vivid image generation prompt for the static base image (no text overlays, cinematic style, no specific real people)
- motionPrompt: 1–2 sentences describing camera movement and subject animation for the video clip (e.g. "slow push-in toward the glowing screen, dust particles drift upward"). No text overlays, no real people.
- durationHintSeconds: whole-number integer seconds this scene lasts. All values must sum to exactly ${audioDurationSeconds}. MUST be an integer ≥ 1.

Return ONLY a JSON array, no markdown:
[{"sceneIndex":0,"textExcerpt":"...","visualPrompt":"...","motionPrompt":"...","durationHintSeconds":N}, ...]`,
      },
    ],
  });

  const raw = message.content[0]?.type === "text" ? message.content[0].text.trim() : "[]";
  const match = raw.match(/\[[\s\S]*\]/);
  const result = JSON.parse(match?.[0] ?? "[]") as SceneSplit[];
  if (result.length === 0) throw new Error("Scene split returned no scenes.");
  return result;
}
