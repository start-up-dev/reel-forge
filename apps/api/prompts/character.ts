import type { ProjectRow } from "../lib/db/schema.js";
import { projectContext } from "./utils.js";
import type { PromptPair } from "./script.js";

// ─── UGC character description prompt builder ─────────────────────────────────
// Phase A of Track 13: generate a locked five-line character description before
// scene generation. The output is stored on the video row and injected into every
// scene prompt as a fixed CHARACTER anchor.

const UGC_STYLE_CONTEXT: Record<string, string> = {
  realistic:     "Natural proportions, real-world clothing and skin tones, no stylisation",
  anime:         "Large expressive eyes, cel-shaded skin tone, stylised hair with sharp highlights, vibrant saturated colour palette",
  ghibli:        "Rounded soft features, warm muted natural colours, gentle expressive eyes, painterly soft-outline feel",
  pixar:         "Oversized expressive eyes, smooth 3D proportions, physically-based material descriptions (subsurface skin, fabric texture)",
  cartoon:       "Exaggerated proportions, bold saturated colours, thick black outline feel, rubbery limbs",
  mascot:        "Could be any object or animal brought to life; large simplified head, oversized friendly features, bold flat colour",
  comic_book:    "Bold ink-line feel, high-contrast two-tone colouring, heroic or dramatic proportions",
  watercolor:    "Soft features, slightly blurred edges, muted pastel palette, loose organic outline",
  oil_painting:  "Classical portrait proportions, rich deep colours, painterly impasto texture feel",
  "3d_render":   "Photorealistic 3D proportions, PBR-appropriate texture descriptions (SSS skin, woven fabric, specular highlights)",
  cyberpunk:     "Futuristic clothing with LED accents, neon-lit skin tone descriptions, chrome and glass textures",
  fantasy:       "Fantasy costume appropriate to the content, magical or ethereal features, rich saturated colours",
  vintage:       "Era-appropriate styling (70s/80s), slightly desaturated warm colour descriptions, retro clothing details",
  neon_synthwave: "Synthwave outfit with neon accents, chrome reflections, electric colour palette (pink/purple/blue)",
};

export function buildUGCCharacterDescriptionPrompt(
  project: ProjectRow,
  ugcVisualStyle: string,
): PromptPair {
  const styleContext = UGC_STYLE_CONTEXT[ugcVisualStyle] ?? "Natural proportions, real-world clothing and skin tones";

  return {
    system: "You are a character designer creating a locked visual identity for a short-form video creator. Your output will be used as the CHARACTER section of an AI image generation prompt and must produce the same person reliably across many different scenes. The character must look like a genuine expert and passionate enthusiast in their niche — someone the target audience would immediately recognise, trust, and want to follow.",
    user: `Project context:
${projectContext(project)}

Visual style: ${ugcVisualStyle.replace(/_/g, " ")}
Style context: ${styleContext}

Write a 80–110 word character description using exactly these seven labelled lines in this order:
HAIR: [exact colour, length, style, any distinguishing detail]
FACE: [skin tone with warmth description, eye colour, brow character]
CLOTHING: [niche-authentic outfit — specific garment + exact colour + texture; must immediately signal the niche to any viewer]
FEATURE: [one anchoring detail — earring, freckle, tattoo, badge, glasses, scar, etc.]
BUILD: [brief impression — apparent age, physique, energy that matches the niche]
PROPS: [1–2 niche-specific items permanently visible — held in hand, worn, or in the immediate foreground; e.g. for gym fitness: chalk-dusted barbell gripped in right hand, worn leather gym belt; for cooking: wooden spatula in right hand, apron strings tied at front]
WORLD: [5–8 words — the character's home environment that reinforces niche; e.g. "rubber gym floor, iron weight rack behind" or "marble kitchen counter, cast-iron pans hanging"]

Critical rules:
- CLOTHING + PROPS together must make the niche instantly obvious at a glance — no viewer should be unsure what this person does
- PROPS are permanent anchors — they appear in every single scene
- WORLD is the default setting — it informs every scene's background even when the camera is tight on the character

Output ONLY the seven-line character description. No preamble. No scene context. No explanation.`,
  };
}

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
      ? "3D render, vibrant saturated colours, smooth surfaces, large expressive eyes — the character physically embodies or is visually inseparable from the niche (e.g. fitness: cartoon dumbbell with arms, face, and gym-chalk hands; cooking: cheerful chef's knife character with a toque; finance: coin mascot with a tie and magnifying glass)"
      : "2D flat cartoon, thick black outlines, bold primary colours, exaggerated proportions: large head, small body, enormous expressive eyes — the character's design must scream the niche at a glance";

  return {
    system: `You are a character designer creating a definitive visual reference for a ${styleLabel}. Your output will be used as an AI image generation prompt that must produce a visually consistent, instantly lovable character across many different scenes.

Your character description must be:
- Hyper-specific: every detail (colour, shape, expression range, distinguishing features) locked down
- Repeatable: another AI model reading this description generates the same character every time
- Niche-embedded: the character's silhouette, accessories, and props must make the niche immediately obvious — a viewer should know the niche within one second of seeing the character
- Likable: give the character personality through specific expressive features and one or two charming quirks`,
    user: `Project context:
${projectContext(project)}

Render style: ${styleLabel}
Style rules: ${styleRules}

Write a character sheet prompt (180–240 words) that describes this character so precisely that an AI image generator will produce the same character reliably. Include ALL of these:

SILHOUETTE & TYPE: species/type, overall shape, size impression
COLOUR PALETTE: exact named colours for every body region (skin/surface, hair/top, clothing, eyes, outline)
NICHE PROPS (required — 2–3 items): specific objects permanently attached to or held by the character that instantly signal the niche — they appear in every single scene (e.g. for gym fitness: always gripping a miniature barbell, always wearing a tiny lifting belt, chalk dust on hands; for cooking: always holding a wooden spoon, always wearing a striped apron; for finance: always holding a gold coin, always wearing a tiny tie)
DISTINGUISHING FEATURES: hat, marking, texture, accessory, facial detail that makes this character unique
EXPRESSION & PERSONALITY: default face expression + one quirk that makes it charming (e.g. one eyebrow always slightly raised, perpetual tiny sweat drop, permanent wide grin)
POSE ENERGY: how the character typically stands or floats — their default body language
ENVIRONMENT MOTIFS: 2–3 background/scene elements that appear whenever the character is shown (e.g. for fitness: rubber gym floor tiles, iron weight rack, chalk cloud; for cooking: wooden cutting board surface, steam wisps, herb sprigs)

End with: "9:16 vertical frame, no text — character centred on a simple gradient background matching the niche colour palette for reference sheet"`,
  };
}
