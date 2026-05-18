export { buildIdeasMessages } from "./ideas.js";
export { buildScriptMessages, RENDER_STYLE_SCRIPT_MODIFIERS, WORDS_FOR_DURATION } from "./script.js";
export { buildScenesMessages, SCENE_DIRECTOR_SYSTEM, RENDER_STYLE_SCENE_SYSTEMS } from "./scenes.js";
export { buildCharacterSheetPrompt, buildUGCCharacterDescriptionPrompt } from "./character.js";
export { buildTalkingSceneMessages, TALKING_SCENE_DIRECTOR_SYSTEM, UGC_VISUAL_STYLE_MODIFIERS } from "./talking.js";
export { buildActionReelScriptMessages, buildActionReelSceneMessages, ACTION_REEL_STYLE_SYSTEMS } from "./action-reel.js";
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
    description: "Writes a spoken voiceover script from a selected idea. Includes render-style modifiers.",
    file: "apps/api/prompts/script.ts",
  },
  {
    id: "scenes",
    label: "Scene Direction (Generated Video)",
    description: "Splits a script into cinematic B-roll scenes for generated videos. Includes per-render-style overrides.",
    file: "apps/api/prompts/scenes.ts",
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
    description: "Splits a script into lipsync talking-head scenes for UGC-style content.",
    file: "apps/api/prompts/talking.ts",
  },
  {
    id: "action_reel",
    label: "Action Reel (Shot Plan + Scene Direction)",
    description: "Generates a shot-by-shot action plan and converts it into cinematic action scenes. No voiceover.",
    file: "apps/api/prompts/action-reel.ts",
  },
] as const;

export type PromptRegistryEntry = (typeof PROMPT_REGISTRY)[number];
