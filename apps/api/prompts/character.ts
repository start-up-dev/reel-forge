import type { ProjectRow } from "../lib/db/schema.js";
import { projectContext } from "./utils.js";
import type { PromptPair } from "./script.js";

// ─── Character sheet prompt builder ──────────────────────────────────────────
// Used by Track 2 (cartoon/mascot consistency) to generate a base character
// description that gets injected into every subsequent scene's visualPrompt.
// The returned prompt is passed to generateImage to produce the reference image.

export function buildCharacterSheetPrompt(
  project: ProjectRow,
  renderStyle: "cartoon" | "mascot",
): PromptPair {
  const styleLabel = renderStyle === "mascot" ? "3D mascot character" : "2D cartoon character";
  const styleRules =
    renderStyle === "mascot"
      ? "3D render, vibrant saturated colours, smooth surfaces, large expressive eyes, physically embodies the niche subject as a character (e.g. if the niche is fitness, the mascot could be a cartoon dumbbell with arms and a face)"
      : "2D flat cartoon, thick black outlines, bold primary colours, exaggerated proportions, large head, small body, enormous expressive eyes";

  return {
    system: `You are a character designer creating a definitive visual reference for a ${styleLabel}. Your output will be used as an AI image generation prompt that must produce a visually consistent character across many different scenes.

Your character description must be:
- Hyper-specific: every detail (colour, shape, expression range, distinguishing features) must be locked down
- Repeatable: another AI model reading this description should generate the same character every time
- On-brand: the character's design must reflect the project niche, target audience, and tone`,
    user: `Project context:
${projectContext(project)}

Render style: ${styleLabel}
Style rules: ${styleRules}

Write a character sheet prompt (150–200 words) that describes this character so precisely that an AI image generator will produce the same character reliably across different scenes. Include:
- Species/type and overall silhouette
- Exact colour palette (name specific colours for each body part/region)
- Distinguishing features (hat, accessory, marking, texture, etc.)
- Default expression and personality energy
- Pose style (how they typically stand or float)
- Any visual motifs that should appear in every scene (e.g. always has a glowing aura, always wears a cape)

End with: "9:16 vertical frame, no text, no background elements — character on simple gradient background for reference sheet"`,
  };
}
