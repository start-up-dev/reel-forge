import type { BrandProfileRow } from "../lib/db/schema.js";

const VISUAL_STYLE_DESC: Record<string, string> = {
  realistic: "photorealistic, natural human proportions and skin textures",
  anime: "Japanese animation style, large expressive eyes, clean linework",
  "3d_animation": "smooth 3D CGI rendering, Pixar-quality, slightly stylised",
  cartoon: "flat 2D cartoon illustration, bold outlines, simple shapes",
  cinematic: "high-end CGI with dramatic lighting and film-quality rendering",
  minimalist: "clean minimal linework, limited palette, simple geometric forms",
};

const TONE_DESC: Record<string, string> = {
  energetic: "dynamic and expressive, full of energy",
  calm: "relaxed and approachable, serene expression",
  witty: "playful and clever, subtle smirk",
  inspirational: "uplifting and warm, confident posture",
  professional: "polished and authoritative, composed expression",
  dramatic: "bold and intense, strong presence",
};

export function buildCharacterSheetPrompt(brand: BrandProfileRow, feedback?: string): string {
  const styleDesc = VISUAL_STYLE_DESC[brand.visualStyle] ?? brand.visualStyle;
  const toneDesc = TONE_DESC[brand.tone] ?? brand.tone;

  const colorLine = brand.primaryColor
    ? `Color palette: Primary ${brand.primaryColor}${brand.secondaryColor ? `, Secondary ${brand.secondaryColor}` : ""}.`
    : "";

  // Podcast duo — instead of a single-character view grid, render the actual
  // two-shot studio scene that Grok will reproduce and animate for every clip.
  if (brand.characterType === "podcast") {
    return buildPodcastSheetPrompt(brand, styleDesc, toneDesc, colorLine, feedback);
  }

  return `Create a character reference sheet for a ${brand.visualStyle} style animated character.

The sheet must show a 2×3 grid on a plain white background with these six views labeled clearly:
Top row (left to right): Front view (full body) | 3/4 view (full body) | Side profile (full body)
Bottom row (left to right): Expression: Neutral | Expression: Happy/Excited | Expression: Speaking/Talking

Character description: ${brand.characterDescription ?? "A stylized character fitting the brand aesthetic"}
Art style: ${styleDesc}
${colorLine}
Tone: ${brand.tone} — the character should look ${toneDesc}.

Requirements:
- Consistent character design across all six views (same colors, features, proportions)
- Clean lines and clear detail
- Character occupies approximately 80% of each cell
- Plain white background between cells
- Each cell is clearly labeled with its view name
- No background scenery or props — white cell backgrounds only${feedback ? `\n\nRefinement requested by creator: ${feedback}` : ""}`.trim();
}

// ─── Podcast duo sheet ────────────────────────────────────────────────────────
// The "character sheet" for a podcast brand is the canonical two-shot studio
// scene. Grok attaches this image to every clip and reproduces the same two
// presenters in the same set, so it must read as the finished podcast frame —
// not a clean reference grid. Both presenters come from characterDescription.

function buildPodcastSheetPrompt(
  brand: BrandProfileRow,
  styleDesc: string,
  toneDesc: string,
  colorLine: string,
  feedback?: string,
): string {
  const presenters =
    brand.characterDescription ??
    "Two podcast presenters: a male host and a female co-host, both expressive and engaging.";

  return `Create a vertical 9:16 podcast studio reference image for a ${brand.visualStyle} style production.

The image is a two-shot of TWO presenters recording a podcast together — this exact framing and setting will be reused for every clip, so it must look like a finished podcast frame.

Composition (vertical 9:16):
- Two presenters, stacked vertically: ONE presenter in the upper half of the frame, the OTHER presenter in the lower half.
- Each presenter is seated at a podcast desk with a large studio microphone in front of them, wearing on-ear headphones.
- Both are framed from roughly the chest up, facing slightly toward each other / the camera, mid-conversation and expressive.
- Leave the vertical middle band of the frame relatively uncluttered (this is where large captions will sit later).

Presenters: ${presenters}

Studio setting:
- A warm, modern podcast studio: acoustic panels, soft ambient mood lighting, subtle background glow or neon accent.
- Both presenters share the SAME consistent studio environment, lighting, and color grade.

Art style: ${styleDesc}
${colorLine}
Tone: ${brand.tone} — the presenters should look ${toneDesc}.

Requirements:
- TWO distinct, consistent presenters — keep their faces, hair, skin tone, clothing, and proportions clearly defined so they can be replicated identically across many clips.
- Cohesive single scene (NOT a grid, NOT separate cells, NOT labeled views).
- Cinematic, scroll-stopping podcast look.
- No on-screen text, captions, logos, or UI elements in the image.${feedback ? `\n\nRefinement requested by creator: ${feedback}` : ""}`.trim();
}
