import type { BrandProfileRow } from "../lib/db/schema.js";
import { brandContext } from "./utils.js";
import type { PromptPair } from "./script.js";

// ─── UGC character description prompt builder ─────────────────────────────────
// Phase A of Track 13: generate a locked character description before scene
// generation. The output is stored on the video row and injected into every
// scene prompt as a fixed CHARACTER anchor.
//
// When a character sheet IMAGE also exists, Claude uses this description only
// for the WORLD/SETTING sections — the character's physical appearance is
// handled entirely by the reference image attached to Grok.

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
  brand: BrandProfileRow,
  ugcVisualStyle: string,
): PromptPair {
  const styleContext = UGC_STYLE_CONTEXT[ugcVisualStyle] ?? "Natural proportions, real-world clothing and skin tones";

  return {
    system: "You are a character designer creating a locked visual identity for a short-form video creator. Your output will be used in two ways: (1) as the CHARACTER anchor injected into AI image generation prompts to produce the same person reliably across many scenes, and (2) as the WORLD anchor that establishes the character's consistent background environment. The character must look like a genuine expert and passionate enthusiast in their niche — someone the target audience would immediately recognise, trust, and want to follow.",
    user: `Project context:
${brandContext(brand)}

Visual style: ${ugcVisualStyle.replace(/_/g, " ")}
Style context: ${styleContext}

Write a 220–280 word character description using exactly these eleven labelled lines in this order:

HAIR: [exact colour with undertone, length, texture (fine/thick/curly/straight/wavy), specific styling — e.g. "warm chestnut brown, shoulder-length, thick and slightly wavy, worn loose with a natural centre part"]
HEAD & FACE SHAPE: [face geometry — oval/square/heart/round, jaw width (strong/soft/narrow), cheekbone prominence, forehead proportions]
SKIN: [precise tone with warmth description + any texture note — e.g. "warm medium-tan with golden undertone, smooth with faint freckle dusting across the nose bridge"]
EYES: [shape (almond/round/hooded/upturned), relative size, exact colour with depth, any distinctive feature — lash fullness, visible crease, eye makeup if niche-appropriate]
NOSE & LIPS: [nose width and profile (broad/narrow, straight/turned-up/aquiline), lip fullness (thin/medium/full), natural lip colour]
CLOTHING: [niche-authentic outfit — every layer named with exact colour and texture; must make the niche instantly obvious at a glance]
FEATURE: [one permanent anchoring detail — earring style, freckle cluster, tattoo placement, badge, glasses frame, scar, birthmark]
BUILD: [apparent age, height impression, physique descriptor, energy level that matches the niche]
POSTURE: [default head angle, shoulder set, body energy — e.g. "slight forward lean, shoulders relaxed and open, projects confident approachability"]
PROPS: [1–2 niche-specific items permanently visible — held in hand, worn, or in immediate foreground; must make the niche unmistakable]
WORLD: [3–4 sentences. The character's permanent home environment with full visual specificity: name the exact surface they stand/sit on with texture detail; describe the immediate background within 1–2 metres; describe the depth/far background; name the dominant light source, its quality, and direction. This world appears in every single scene by default.]

Critical rules:
- Every line must be specific enough that two different artists produce the same result
- CLOTHING + PROPS together must make the niche obvious at a glance with zero ambiguity
- WORLD must be a complete, paintable environment description — not just a label like "gym" or "kitchen"
- PROPS are permanent anchors — they appear in every scene regardless of the action

Output ONLY the eleven-line character description. No preamble. No explanation.`,
  };
}

// ─── Character sheet prompt builder ──────────────────────────────────────────
// Used by Track 2 (cartoon/mascot consistency) to generate a character
// description that gets injected into every subsequent scene's visualPrompt.
// The returned prompt is passed to Claude to produce the reference description,
// which is then used to generate the character sheet image via GPT-image-2.

export function buildCharacterSheetPrompt(
  brand: BrandProfileRow,
  renderStyle: "cartoon" | "mascot",
): PromptPair {
  const styleLabel = renderStyle === "mascot" ? "3D mascot character" : "2D cartoon character";
  const styleRules =
    renderStyle === "mascot"
      ? "3D render, vibrant saturated colours, smooth surfaces, large expressive eyes — the character physically embodies or is visually inseparable from the niche (e.g. fitness: cartoon dumbbell with arms, face, and gym-chalk hands; cooking: cheerful chef's knife character with a toque; finance: coin mascot with a tie and magnifying glass)"
      : "2D flat cartoon, thick black outlines, bold primary colours, exaggerated proportions: large head, small body, enormous expressive eyes — the character's design must scream the niche at a glance";

  return {
    system: `You are a character designer creating a definitive visual reference for a ${styleLabel}. Your output will be used as an AI image generation prompt that must produce a visually consistent, instantly lovable character across many different scenes and across months of content.

Your character description must be:
- Hyper-specific: every colour (use named colour values), shape, proportion, and distinguishing feature locked down so precisely that another AI model generates the same character on the first attempt
- Niche-embedded: the character's silhouette, accessories, and props must make the niche immediately obvious — a viewer should know the niche within one second of seeing the character
- World-grounded: the character's home environment must be defined completely enough to appear consistently behind them across every scene
- Likable: give the character personality through specific expressive features and one or two charming quirks`,
    user: `Project context:
${brandContext(brand)}

Render style: ${styleLabel}
Style rules: ${styleRules}

Write a character sheet description (220–270 words) covering ALL of these sections in order:

SILHOUETTE & TYPE: species/type, overall body shape impression, size relative to frame
COLOUR PALETTE: exact named colours for every body region — skin/surface, hair/top material, primary clothing, secondary clothing, eyes, outline colour, any accent colours. Be specific: "cobalt blue" not "blue", "warm cream" not "white".
NICHE PROPS (2–3 items, required): specific objects permanently attached to or held by the character that instantly signal the niche — they appear in every single scene (e.g. for fitness: always gripping a miniature barbell, always wearing a tiny lifting belt; for cooking: always holding a wooden spoon, always wearing a striped apron)
DISTINGUISHING FEATURES: hat style/colour, marking, texture pattern, accessory, facial detail — the one thing that makes this character instantly recognisable in a crowd
EXPRESSION & PERSONALITY: default face expression described precisely + one charming quirk (e.g. one eyebrow perpetually slightly raised, permanent tiny sweat drop on forehead, wide grin showing two square front teeth)
POSE ENERGY: exactly how the character stands or floats — their default body language and energy
WORLD: [3–4 sentences. The character's permanent home environment: name the exact ground surface with texture; describe the 1–2 metre immediate background; describe the far background; name the dominant light source, quality, and direction. This environment appears in every scene.]

End the description with this exact line:
"9:16 vertical frame, no text — character centred, character sheet reference pose, environment as described above."`,
  };
}
