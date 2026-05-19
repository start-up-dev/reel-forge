import type { BrandProfileRow } from "../lib/db/schema.js";
import type { TopicEntry } from "../services/claude.js";

export interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

export function buildPostCaptionMessages(
  brand: BrandProfileRow,
  topic: TopicEntry,
  script: string,
): { system: string; messages: ClaudeMessage[] } {
  const system = `You are a social media copywriter. Write an engaging Facebook video caption that maximizes reach and engagement.

Rules:
- 2–3 punchy sentences. Start with the hook from the video, then tease what the viewer will get.
- End with 5–8 relevant hashtags on a new line. Mix broad (#fitness) and niche (#homeworkoutmotivation) tags.
- No emojis unless naturally fitting.
- No "Watch now" or "Check out our video" — be direct and value-first.
- Match the brand tone exactly.
- Return ONLY the caption text + hashtags. No explanation, no extra formatting.`;

  const userPrompt = `Brand: ${brand.name}
Niche: ${brand.niche}
Tone: ${brand.tone}

Video title: ${topic.title}
Opening hook: ${topic.hook}
Script excerpt: ${script.slice(0, 400)}

Write the Facebook caption now.`;

  return {
    system,
    messages: [{ role: "user", content: userPrompt }],
  };
}
