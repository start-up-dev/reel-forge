import Anthropic from "@anthropic-ai/sdk";
import { jsonrepair } from "jsonrepair";
import { env } from "../lib/env.js";
import type { BrandProfileRow, ProjectRow } from "../lib/db/schema.js";
import {
  buildIdeasMessages,
  buildScriptMessages,
  buildScenesMessages,
  buildTalkingSceneMessages,
  buildActionReelSceneMessages,
  buildUGCCharacterDescriptionPrompt,
} from "../prompts/index.js";
import { buildWeekPlanMessages } from "../prompts/content-plan.js";

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

export async function generateIdeas(project: ProjectRow, topic: string, videoType?: string, actionReelStyle?: string | null): Promise<IdeaCard[]> {
  const { system, user } = buildIdeasMessages(project, topic, videoType, actionReelStyle);

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

// ─── UGC character description generation ─────────────────────────────────────

export async function generateUGCCharacter(
  project: ProjectRow,
  ugcVisualStyle: string,
): Promise<string> {
  const { system, user } = buildUGCCharacterDescriptionPrompt(project, ugcVisualStyle);

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 200,
    system,
    messages: [{ role: "user", content: user }],
  });

  const text = message.content[0]?.type === "text" ? message.content[0].text.trim() : "";
  if (!text) throw new Error("UGC character generation returned empty.");
  return text;
}

// ─── Script generation ────────────────────────────────────────────────────────

export async function generateScript(
  project: ProjectRow,
  idea: string,
  targetDurationSeconds = 30,
  renderStyle?: string,
  videoType?: string,
  actionReelStyle?: string | null,
): Promise<string> {
  const { system, user } = buildScriptMessages(project, idea, targetDurationSeconds, renderStyle, videoType, actionReelStyle);

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    ...(system ? { system } : {}),
    messages: [{ role: "user", content: user }],
  });

  const script = message.content[0]?.type === "text" ? message.content[0].text.trim() : "";
  if (!script) throw new Error("Script generation returned empty.");
  return script;
}

export async function generateTitle(idea: string): Promise<string> {
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 30,
    messages: [
      {
        role: "user",
        content: `Generate a short, punchy video title (3–6 words) for this idea. Return only the title, no quotes, no punctuation at the end.\n\nIdea: ${idea}`,
      },
    ],
  });
  const title = message.content[0]?.type === "text" ? message.content[0].text.trim() : "";
  return title || "Untitled Video";
}

// ─── Dialogue segment generation ─────────────────────────────────────────────

export interface DialogueSegment {
  sceneIndex: number;
  dialogue: string;
}

export async function generateDialogueSegments(
  script: string,
  sceneCount: number,
): Promise<DialogueSegment[]> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 500,
    system:
      "You are a script editor. Given a script and a number of scenes, break the narration into exactly N segments, one per scene. Return a JSON array: [{\"sceneIndex\": 0, \"dialogue\": \"...\"}, ...]. Each segment should be 1–3 sentences. The segments in order must together cover the full script.",
    messages: [
      {
        role: "user",
        content: `Split this script into exactly ${sceneCount} segments.\n\nSCRIPT:\n${script}\n\nReturn only the JSON array, no other text.`,
      },
    ],
  });

  const raw = message.content[0]?.type === "text" ? message.content[0].text.trim() : "[]";
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed as DialogueSegment[];
    }
  } catch {
    // return empty if parse fails
  }
  return [];
}

// ─── Week plan generation ─────────────────────────────────────────────────────

export interface TopicEntry {
  index: number;
  day: number;
  slot: number;
  title: string;
  hook: string;
  format: string;
  angle: string;
  scriptOutline: string;
  overridden: boolean;
}

const VALID_FORMATS = new Set(["ugc", "montage", "tutorial", "story"]);

function isValidTopic(t: unknown): t is TopicEntry {
  if (!t || typeof t !== "object") return false;
  const o = t as Record<string, unknown>;
  return (
    typeof o.index === "number" &&
    typeof o.day === "number" &&
    typeof o.slot === "number" &&
    typeof o.title === "string" && o.title.length > 0 &&
    typeof o.hook === "string" && o.hook.length > 0 &&
    typeof o.format === "string" && VALID_FORMATS.has(o.format) &&
    typeof o.angle === "string" &&
    typeof o.scriptOutline === "string"
  );
}

export async function generateWeekPlan(
  brand: BrandProfileRow,
  postsPerDay: number,
  weekStartDate: string,
): Promise<TopicEntry[]> {
  const { system, messages } = buildWeekPlanMessages(brand, postsPerDay, weekStartDate);

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8000,
    system,
    messages,
  });

  if (message.stop_reason === "max_tokens") {
    throw new Error("Week plan generation was truncated (max_tokens). Reduce posts per day or try again.");
  }

  const raw = message.content[0]?.type === "text" ? message.content[0].text.trim() : "[]";

  let parsed: unknown = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    try {
      parsed = JSON.parse(jsonrepair(raw));
    } catch {
      throw new Error("Week plan generation returned unparseable JSON.");
    }
  }

  if (!Array.isArray(parsed)) throw new Error("Week plan generation did not return a JSON array.");

  const topics = (parsed as unknown[]).map((t, i) => {
    const entry = t as Record<string, unknown>;
    return {
      index: typeof entry.index === "number" ? entry.index : i,
      day: typeof entry.day === "number" ? entry.day : Math.floor(i / postsPerDay) + 1,
      slot: typeof entry.slot === "number" ? entry.slot : (i % postsPerDay) + 1,
      title: typeof entry.title === "string" ? entry.title : `Topic ${i + 1}`,
      hook: typeof entry.hook === "string" ? entry.hook : "",
      format: typeof entry.format === "string" ? entry.format : "ugc",
      angle: typeof entry.angle === "string" ? entry.angle : "",
      scriptOutline: typeof entry.scriptOutline === "string" ? entry.scriptOutline : "",
      overridden: false,
    };
  });

  if (!topics.every(isValidTopic)) {
    throw new Error("Week plan generation returned topics with missing required fields.");
  }

  return topics;
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

function isValidScene(s: unknown): s is SceneSplit {
  if (!s || typeof s !== "object") return false;
  const o = s as Record<string, unknown>;
  return (
    typeof o.sceneIndex === "number" &&
    typeof o.textExcerpt === "string" && o.textExcerpt.length > 0 &&
    typeof o.visualPrompt === "string" && o.visualPrompt.length > 0 &&
    typeof o.motionPrompt === "string" && o.motionPrompt.length > 0 &&
    typeof o.durationHintSeconds === "number"
  );
}

function extractScenes(rawInput: unknown): SceneSplit[] | null {
  const input = rawInput as { scenes?: unknown };
  let candidate = input.scenes;

  if (typeof candidate === "string") {
    candidate = tryParseArray(candidate);
  }

  if (!Array.isArray(candidate) || candidate.length === 0) return null;
  if (!candidate.every(isValidScene)) return null;
  return candidate;
}

async function callSplitScenes(
  script: string,
  audioDurationSeconds: number,
  targetCount: number,
  videoType: string,
  renderStyle?: string,
  ugcVisualStyle?: string,
  characterNote?: string | null,
  actionReelStyle?: string | null,
): Promise<unknown> {
  const { system, user } =
    videoType === "talking"
      ? buildTalkingSceneMessages(script, audioDurationSeconds, targetCount, ugcVisualStyle, characterNote)
      : videoType === "action_reel"
      ? buildActionReelSceneMessages(script, audioDurationSeconds, targetCount, actionReelStyle, characterNote)
      : buildScenesMessages(script, audioDurationSeconds, targetCount, renderStyle, characterNote);

  const message = await client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 12000,
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
                    minimum: (videoType === "talking" || videoType === "action_reel") ? 6 : 1,
                    maximum: 6,
                    description: (videoType === "talking" || videoType === "action_reel")
                      ? "Always exactly 6 — every Grok clip is exactly 6 seconds."
                      : `Whole-number seconds this scene lasts (1–6). All scenes must sum to exactly ${audioDurationSeconds}.`,
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
  }).finalMessage();

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
  ugcVisualStyle?: string | null,
  characterNote?: string | null,
  actionReelStyle?: string | null,
): Promise<SceneSplit[]> {
  // Talking and Action Reel videos: each Grok clip is exactly 6s.
  const isFixedClip = videoType === "talking" || videoType === "action_reel";
  const targetCount = isFixedClip
    ? Math.ceil(audioDurationSeconds / 6)
    : Math.max(Math.ceil(audioDurationSeconds / 6), Math.round(audioDurationSeconds / 5));
  const effectiveDuration = isFixedClip
    ? targetCount * 6
    : audioDurationSeconds;
  const minScenes = targetCount;

  for (let attempt = 1; attempt <= 3; attempt++) {
    const raw = await callSplitScenes(
      script,
      effectiveDuration,
      targetCount,
      videoType,
      renderStyle ?? undefined,
      ugcVisualStyle ?? undefined,
      characterNote,
      actionReelStyle ?? undefined,
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
