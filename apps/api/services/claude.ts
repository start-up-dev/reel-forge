import Anthropic from "@anthropic-ai/sdk";
import { jsonrepair } from "jsonrepair";
import { env } from "../lib/env.js";
import type { ProjectRow } from "../lib/db/schema.js";
import {
  buildCharacterSheetPrompt,
  buildIdeasMessages,
  buildScriptMessages,
  buildScenesMessages,
  buildTalkingSceneMessages,
  isBengali,
} from "../prompts/index.js";

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

// ─── Idea generation ──────────────────────────────────────────────────────────

export async function generateIdeas(project: ProjectRow, topic: string): Promise<IdeaCard[]> {
  const { system, user } = buildIdeasMessages(project, topic);

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
    messages: [{ role: "user", content: user }],
  });

  const toolUse = message.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );
  if (!toolUse) throw new Error("Idea generation returned no tool call.");
  const { ideas } = toolUse.input as { ideas: IdeaCard[] };
  return ideas ?? [];
}

// ─── Character sheet generation ───────────────────────────────────────────────

export async function generateCharacterSheet(
  project: ProjectRow,
  renderStyle: "cartoon" | "mascot",
): Promise<string> {
  const { system, user } = buildCharacterSheetPrompt(project, renderStyle);

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system,
    messages: [{ role: "user", content: user }],
  });

  const text = message.content[0]?.type === "text" ? message.content[0].text.trim() : "";
  if (!text) throw new Error("Character sheet generation returned empty.");
  return text;
}

// ─── Script generation ────────────────────────────────────────────────────────

export async function generateScript(
  project: ProjectRow,
  idea: string,
  targetDurationSeconds = 30,
  renderStyle?: string,
): Promise<string> {
  const { system, user } = buildScriptMessages(project, idea, targetDurationSeconds, renderStyle);

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    ...(isBengali(project) && system ? { system } : {}),
    messages: [{ role: "user", content: user }],
  });

  const script = message.content[0]?.type === "text" ? message.content[0].text.trim() : "";
  if (!script) throw new Error("Script generation returned empty.");
  return script;
}

// ─── Scene splitting ──────────────────────────────────────────────────────────

function tryParseArray(s: string): unknown[] | null {
  try {
    const parsed = JSON.parse(s);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    // fall through to repair
  }
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
  videoType: string,
  renderStyle?: string,
  talkingSubtype?: string,
  characterNote?: string | null,
): Promise<unknown> {
  const { system, user } =
    videoType === "talking"
      ? buildTalkingSceneMessages(script, audioDurationSeconds, targetCount, talkingSubtype, characterNote)
      : buildScenesMessages(script, audioDurationSeconds, targetCount, renderStyle, characterNote);

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 16000,
    system,
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
                      "Hyper-specific AI image prompt following the system's style rules. 9:16 vertical.",
                  },
                  motionPrompt: {
                    type: "string",
                    description:
                      "2–3 sentences: camera movement + subject animation + atmosphere motion.",
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
    messages: [{ role: "user", content: user }],
  });

  if (message.stop_reason === "max_tokens") {
    throw new Error("Scene split response was truncated (max_tokens). Reduce scene count or prompt length.");
  }

  const toolUse = message.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );
  if (!toolUse) throw new Error("Scene split returned no tool call.");
  return toolUse.input;
}

export async function splitScenes(
  script: string,
  audioDurationSeconds: number,
  videoType: string,
  renderStyle?: string | null,
  talkingSubtype?: string | null,
  characterNote?: string | null,
): Promise<SceneSplit[]> {
  const minScenes = Math.ceil(audioDurationSeconds / 6);
  const targetCount = Math.max(minScenes, Math.round(audioDurationSeconds / 5));

  for (let attempt = 1; attempt <= 3; attempt++) {
    const raw = await callSplitScenes(
      script,
      audioDurationSeconds,
      targetCount,
      videoType,
      renderStyle ?? undefined,
      talkingSubtype ?? undefined,
      characterNote,
    );
    const scenes = extractScenes(raw);
    if (scenes && scenes.length >= minScenes) return scenes;
    console.warn(
      `[splitScenes] attempt ${attempt} returned invalid shape (got ${scenes?.length ?? 0} scenes, need ≥${minScenes}):`,
      JSON.stringify(raw),
    );
  }

  throw new Error("Scene split failed after 3 attempts: model did not return a valid scenes array.");
}
