import type { ProjectRow } from "../lib/db/schema.js";
import { projectContext, isBengali } from "./utils.js";
import { BENGALI_SCRIPT_SYSTEM } from "./script.js";
import type { PromptPair } from "./script.js";

const BENGALI_IDEAS_SUFFIX = `

## আইডিয়া জেনারেশন
ঠিক ৩টি আলাদা ভিডিও আইডিয়া দাও। প্রতিটি আইডিয়া punchy, specific, এবং scroll-stopping হতে হবে।
title: ৫-৮ শব্দে hook — দর্শক আটকে যাবে
body: ২-৩ বাক্যে ভিডিওর angle এবং key points`;

export function buildIdeasMessages(project: ProjectRow, topic: string): PromptPair {
  if (isBengali(project)) {
    return {
      system: `${BENGALI_SCRIPT_SYSTEM}${BENGALI_IDEAS_SUFFIX}`,
      user: `${projectContext(project)}\n\nটপিক: ${topic}`,
    };
  }

  return {
    system: `You are a viral short-form video content strategist.
${projectContext(project)}

Generate exactly 3 distinct video ideas for the given topic. Each idea must be punchy, specific, and scroll-stopping.
title: 5–8 words, hooks the viewer instantly
body: 2–3 sentence description of the video angle and key points
Write all content in ${project.language}.`,
    user: `Topic: ${topic}`,
  };
}
