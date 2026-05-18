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

export function buildCharacterSheetPrompt(brand: BrandProfileRow): string {
  const styleDesc = VISUAL_STYLE_DESC[brand.visualStyle] ?? brand.visualStyle;
  const toneDesc = TONE_DESC[brand.tone] ?? brand.tone;

  const colorLine = brand.primaryColor
    ? `Color palette: Primary ${brand.primaryColor}${brand.secondaryColor ? `, Secondary ${brand.secondaryColor}` : ""}.`
    : "";

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
- No background scenery or props — white cell backgrounds only`.trim();
}
