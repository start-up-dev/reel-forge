import type { BrandProfileRow } from "../lib/db/schema.js";

export interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

export function buildWeekPlanMessages(
  brand: BrandProfileRow,
  postsPerDay: number,
  weekStartDate: string,
): { system: string; messages: ClaudeMessage[] } {
  const totalPosts = postsPerDay * 7;

  const system = `You are a social media content strategist. Generate a 7-day short-form video content plan.

Return ONLY a valid JSON array of ${totalPosts} topic objects. No markdown, no explanation, no wrapper — just the raw JSON array.

Each object must have exactly these fields:
- index: integer (0-based, sequential)
- day: integer (1-7, Monday=1, Sunday=7)
- slot: integer (1-${postsPerDay}, post number within the day)
- title: string (punchy 4-8 word video title)
- hook: string (opening line that grabs attention — start with a pattern interrupt)
- format: string (one of: "ugc", "montage", "tutorial", "story")
- angle: string (content angle, e.g. "beginner mistake", "transformation reveal", "myth bust")
- scriptOutline: string (3-5 bullet points as a single string, bullets separated by \\n)
- overridden: false`;

  const brandDetails = [
    `Brand: ${brand.name}`,
    `Niche: ${brand.niche}`,
    brand.nicheDescription ? `Niche description: ${brand.nicheDescription}` : null,
    `Tone: ${brand.tone}`,
    `Visual style: ${brand.visualStyle}`,
    `Character type: ${brand.characterType}`,
    brand.characterDescription ? `Character: ${brand.characterDescription}` : null,
    brand.targetAudienceAge ? `Target audience age: ${brand.targetAudienceAge}` : null,
    brand.targetAudienceVibe ? `Target audience vibe: ${brand.targetAudienceVibe}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const userPrompt = `${brandDetails}

Week start date: ${weekStartDate} (Monday)
Posts per day: ${postsPerDay}
Total posts this week: ${totalPosts}

Instructions:
- Vary formats across the week (mix ugc, montage, tutorial, story — no more than 3 of the same format)
- Mix evergreen and trending angles
- Every hook must start with a pattern interrupt (a surprising stat, a provocative question, or a bold claim)
- Make each title and hook unique — no repetition
- scriptOutline bullets should be specific actions, not generic advice

Generate the plan now.`;

  return {
    system,
    messages: [{ role: "user", content: userPrompt }],
  };
}
