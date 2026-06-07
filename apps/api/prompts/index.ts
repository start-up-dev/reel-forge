export { buildIdeasMessages } from "./ideas.js";
export { buildScriptMessages, buildImageScriptMessages, WORDS_FOR_DURATION } from "./script.js";
export { buildCharacterSheetPrompt, buildUGCCharacterDescriptionPrompt } from "./character.js";
export { buildTalkingSceneMessages, TALKING_SCENE_DIRECTOR_SYSTEM, UGC_VISUAL_STYLE_MODIFIERS } from "./talking.js";
export { brandContext } from "./utils.js";
export type { PromptPair } from "./script.js";
export type { UGCVisualStyleModifier } from "./talking.js";

export const PROMPT_REGISTRY = [
  {
    id: "ideas",
    label: "Idea Generation",
    description: "Generates 3 viral video ideas from a topic.",
    file: "apps/api/prompts/ideas.ts",
  },
  {
    id: "script",
    label: "Script Writing",
    description: "Writes a spoken voiceover script from a selected idea (talking / podcast).",
    file: "apps/api/prompts/script.ts",
  },
  {
    id: "character",
    label: "Character Sheet",
    description: "Generates a hyper-detailed character description prompt for cartoon/mascot style consistency across scenes.",
    file: "apps/api/prompts/character.ts",
  },
  {
    id: "talking",
    label: "Scene Direction (Talking Video)",
    description: "Splits a script into lipsync talking-head / podcast scenes.",
    file: "apps/api/prompts/talking.ts",
  },
] as const;

export type PromptRegistryEntry = (typeof PROMPT_REGISTRY)[number];
