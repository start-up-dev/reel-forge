import type { BrandProfileRow } from "../lib/db/schema.js";

export function brandContext(brand: BrandProfileRow): string {
  return [
    `Niche: ${brand.niche}`,
    brand.nicheDescription ? `Niche detail: ${brand.nicheDescription}` : null,
    `Target audience: ${[brand.targetAudienceAge, brand.targetAudienceVibe].filter(Boolean).join(", ") || "general audience"}`,
    `Visual style: ${brand.visualStyle}`,
    `Tone: ${brand.tone}`,
    brand.characterType && brand.characterType !== "none"
      ? `Character type: ${brand.characterType}`
      : null,
    brand.characterDescription ? `Character: ${brand.characterDescription}` : null,
    brand.primaryColor ? `Brand colour: ${brand.primaryColor}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}
