import Anthropic from "@anthropic-ai/sdk";
import { jsonrepair } from "jsonrepair";
import { env } from "../lib/env.js";
import type { BrandProfileRow } from "../lib/db/schema.js";
import {
  buildIdeasMessages,
  buildImageScriptMessages,
  buildScriptMessages,
  buildTalkingSceneMessages,
} from "../prompts/index.js";
import { buildWeekPlanMessages } from "../prompts/content-plan.js";
import { buildPostCaptionMessages } from "../prompts/caption.js";

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

export async function generateIdeas(brand: BrandProfileRow, topic: string): Promise<IdeaCard[]> {
  const { system, user } = buildIdeasMessages(brand, topic);

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

// ─── Script generation ────────────────────────────────────────────────────────

export async function generateScript(
  brand: BrandProfileRow,
  idea: string,
  targetDurationSeconds = 30,
): Promise<string> {
  const { system, user } = buildScriptMessages(brand, idea, targetDurationSeconds);

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

// ─── Image-driven script generation (vision) ──────────────────────────────────

export interface ImageScriptResult {
  script: string;
  // True when the uploaded image shows two people → route the rest of the
  // pipeline through the existing podcast (two-shot, alternating) logic.
  isPodcast: boolean;
  // Plain-language description of the subjects' on-screen layout, e.g.
  // "two people side by side — man on the LEFT, woman on the RIGHT". Carried
  // into scene direction so lipsync lands on the correct face.
  layout: string;
}

/**
 * Looks at a user-uploaded image and writes the spoken script for the person(s)
 * in it, detecting whether it is a single talking head or a two-person podcast.
 * Used by the image-driven video flow (see batch-generator.processVideo).
 */
export async function generateScriptFromImage(
  brand: BrandProfileRow,
  image: { base64: string; mediaType: string },
  targetDurationSeconds = 30,
): Promise<ImageScriptResult> {
  const { system, user } = buildImageScriptMessages(brand, targetDurationSeconds);

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    ...(system ? { system } : {}),
    tools: [
      {
        name: "submit_script",
        description: "Submit the spoken script and the analysis of the uploaded image.",
        input_schema: {
          type: "object" as const,
          properties: {
            script: {
              type: "string",
              description: "The spoken script, one sentence per line, spoken words only.",
            },
            isPodcast: {
              type: "boolean",
              description: "True if the image shows two people (a two-person podcast); false for a single talking head.",
            },
            layout: {
              type: "string",
              description: "Short description of the subjects' on-screen layout (e.g. 'single person centre frame' or 'two people side by side — man LEFT, woman RIGHT').",
            },
          },
          required: ["script", "isPodcast", "layout"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "submit_script" },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: image.mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
              data: image.base64,
            },
          },
          { type: "text", text: user },
        ],
      },
    ],
  });

  const toolUse = message.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );
  if (!toolUse) throw new Error("Image script generation returned no tool call.");
  const result = toolUse.input as Partial<ImageScriptResult>;
  const script = (result.script ?? "").trim();
  if (!script) throw new Error("Image script generation returned empty script.");
  return {
    script,
    isPodcast: Boolean(result.isPodcast),
    layout: result.layout ?? "",
  };
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
  ugcVisualStyle?: string,
  characterNote?: string | null,
  hasCharacterSheet?: boolean,
  isPodcast?: boolean,
): Promise<unknown> {
  const { system, user } = buildTalkingSceneMessages(
    script,
    audioDurationSeconds,
    targetCount,
    ugcVisualStyle,
    characterNote,
    hasCharacterSheet,
    isPodcast,
  );

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
                    minimum: 6,
                    maximum: 6,
                    description: "Always exactly 6 — every Grok clip is exactly 6 seconds.",
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
  ugcVisualStyle?: string | null,
  characterNote?: string | null,
  hasCharacterSheet?: boolean,
  isPodcast?: boolean,
): Promise<SceneSplit[]> {
  // Talking videos: each Grok clip is exactly 6s.
  const targetCount = Math.ceil(audioDurationSeconds / 6);
  const effectiveDuration = targetCount * 6;
  const minScenes = targetCount;

  for (let attempt = 1; attempt <= 3; attempt++) {
    const raw = await callSplitScenes(
      script,
      effectiveDuration,
      targetCount,
      ugcVisualStyle ?? undefined,
      characterNote,
      hasCharacterSheet,
      isPodcast,
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

// ─── Post caption generation ──────────────────────────────────────────────────

export async function generatePostCaption(
  brand: BrandProfileRow,
  topic: TopicEntry,
  script: string,
): Promise<string> {
  const { system, messages } = buildPostCaptionMessages(brand, topic, script);

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    system,
    messages,
  });

  const block = message.content[0];
  if (block?.type !== "text" || !block.text.trim()) {
    return topic.title;
  }
  return block.text.trim();
}

// ─── Brand profile suggestion ─────────────────────────────────────────────────

export interface BrandSuggestion {
  niche: string;
  nicheDescription: string;
  targetAudienceAge: "gen_z" | "millennial" | "gen_x" | "all";
  targetAudienceVibe: "entertainment" | "education" | "inspiration" | "humor";
  tone: string;
  visualStyle: string;
  characterType: "human" | "mascot" | "abstract" | "none";
  characterDescription: string;
  primaryColor: string;
  secondaryColor: string;
  reasoning: string;
}

export async function extractWebsiteContext(url: string, pageText: string): Promise<string> {
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    system: "You extract brand facts from website text. Be concise and specific — no filler, no preamble.",
    messages: [{
      role: "user",
      content: `Website: ${url}

Page text:
${pageText}

Extract these facts as "Label: value" lines:
- Business name
- Products/services (list main offerings, be specific)
- Key offer or value proposition
- Target customer
- Brand tone/voice

Return only the extracted lines.`,
    }],
  });
  return message.content[0]?.type === "text" ? message.content[0].text.trim() : "";
}

export async function suggestBrandProfile(channelInfo: {
  pageName: string;
  platform: string;
  pageAvatarUrl?: string | null;
  websiteContext?: string;
  feedback?: string;
}): Promise<BrandSuggestion> {
  const systemPrompt = `You are a brand strategist helping creators build their content identity.
Analyze the social media channel info provided and suggest a complete brand profile.
Be specific and opinionated — give concrete suggestions, not generic ones.
For colors, suggest hex codes that match the brand vibe.
For characterDescription, be vivid and specific (2-3 sentences on appearance, personality, style).
For visualStyle, prefer "realistic" for most brand, lifestyle, and personal-creator channels — it suits authentic UGC-style content. Only choose "cinematic" for documentary, editorial, or high-production channels where that aesthetic is clearly the core identity.`;

  const userContent = `Channel: "${channelInfo.pageName}" on ${channelInfo.platform}.
${channelInfo.websiteContext ? `\nWebsite brand context:\n${channelInfo.websiteContext}\n` : ""}
${channelInfo.feedback ? `\nUser feedback on previous suggestion: "${channelInfo.feedback}"\nAdjust your suggestions accordingly.` : ""}

Based on this channel${channelInfo.websiteContext ? " and website content" : ""}, suggest a brand profile. Be specific and creative.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: systemPrompt,
    tools: [
      {
        name: "suggest_brand_profile",
        description: "Submit brand profile suggestions for this channel",
        input_schema: {
          type: "object" as const,
          properties: {
            niche: { type: "string", description: "Short niche label, e.g. 'Tech productivity'" },
            nicheDescription: { type: "string", description: "1-2 sentence description of the specific niche" },
            targetAudienceAge: { type: "string", enum: ["gen_z", "millennial", "gen_x", "all"] },
            targetAudienceVibe: { type: "string", enum: ["entertainment", "education", "inspiration", "humor"] },
            tone: { type: "string", enum: ["energetic", "calm", "witty", "inspirational", "professional", "dramatic"] },
            visualStyle: { type: "string", enum: ["realistic", "anime", "3d_animation", "cartoon", "cinematic", "minimalist"] },
            characterType: { type: "string", enum: ["human", "mascot", "abstract", "none"] },
            characterDescription: { type: "string", description: "Vivid description of the character's appearance and personality. Empty string if characterType is 'none'." },
            primaryColor: { type: "string", description: "Hex color code, e.g. #f55c2a" },
            secondaryColor: { type: "string", description: "Hex color code, e.g. #4a90e2" },
            reasoning: { type: "string", description: "1-2 sentences explaining why these choices fit the channel" },
          },
          required: ["niche", "nicheDescription", "targetAudienceAge", "targetAudienceVibe", "tone", "visualStyle", "characterType", "characterDescription", "primaryColor", "secondaryColor", "reasoning"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "suggest_brand_profile" },
    messages: [{ role: "user", content: userContent }],
  });

  const toolUse = message.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );
  if (!toolUse) throw new Error("Brand suggestion returned no tool call.");
  return toolUse.input as BrandSuggestion;
}
