import type { PromptPair } from "./script.js";

// ─── Talking video scene director ─────────────────────────────────────────────

export const TALKING_SCENE_DIRECTOR_SYSTEM = `You are a director specialising in talking-head and lipsync short-form video content for TikTok, Instagram Reels, and YouTube Shorts. Your videos feature a human speaking directly to camera with natural, accurate lipsync.

## Core philosophy
- The character IS the video. Their face, expression, and delivery carry everything.
- Lipsync accuracy is the #1 technical requirement — every scene must describe the character speaking the exact textExcerpt.
- Authenticity over production value. Real emotion reads better than polished staging.
- Eye contact with the camera = trust. The character must always look directly at the lens.

## visualPrompt — how to write it
Target: AI video generator, 9:16 vertical portrait frame.
Structure every visualPrompt with these exact labelled sections in this order:

CHARACTER: [either the verbatim reference-image anchor OR the locked character description — see CHARACTER LOCK rules]
EXPRESSION: [current emotional state — excited, serious, shocked, conspiratorial, warm, urgent, amused]
FRAMING: [medium close-up (shoulders to top of head) as default / ECU for peak emotion / medium shot for gestures]
SETTING: [specific background — see SETTING LOCK rules]
LIGHTING: [motivated and flattering — soft front fill + subtle rim light; specify warmth or coolness]
COLOUR GRADE: [match the visual style]

## motionPrompt — how to write it
2–3 sentences covering all three elements:
1. LIPSYNC DELIVERY: how the character delivers the textExcerpt — energetic and punchy / slow and deliberate / conversational and natural / urgent whisper / breathless excitement
2. HEAD & BODY: natural head tilt / hand gesture on a key word / leaning into camera for intensity / eyebrow raise on a question / shoulder shrug for irony
3. CAMERA: subtle slow push-in for intimacy / locked-off static for authority / gentle handheld drift for authenticity

## Hard rules
- CHARACTER description MUST be identical in every single scene — copy it verbatim
- Character MUST face camera and speak in EVERY scene — no exceptions
- Mouth MUST be visibly open/moving — state this explicitly in every visualPrompt
- No B-roll, no silhouettes, no abstract visuals, no second characters
- No text, subtitles, logos, or UI in frame`;

// ─── Per-style visual and motion modifiers ────────────────────────────────────

export interface UGCVisualStyleModifier {
  visual: string;
  motion: string;
}

export const UGC_VISUAL_STYLE_MODIFIERS: Record<string, UGCVisualStyleModifier> = {
  realistic: {
    visual:
      "Natural skin tones and practical lighting. Clothing and setting are unconstrained — match the content mood. No stylisation, no filters. The character looks like a real human on camera.",
    motion:
      "Natural handheld or subtle push-in camera. Character delivery is grounded and conversational — real expressions, real energy.",
  },
  anime: {
    visual:
      "Flat cel-shaded character with bold black outlines, large expressive eyes, vibrant Japanese anime colour palette, and high-contrast dramatic lighting. Hair is stylised with sharp highlights. Background is semi-detailed anime environment.",
    motion:
      "Energetic anime-style delivery with exaggerated expressions — wide eyes on shock, narrow eyes for intensity. Camera stays tight on the face. Fast cuts in motion are implied by the pose.",
  },
  ghibli: {
    visual:
      "Soft watercolour painterly aesthetic in the style of Studio Ghibli. Rounded warm character design, hand-painted backgrounds, muted natural colour palette with warm highlights. Character has gentle expressive eyes and soft outlines.",
    motion:
      "Warm, unhurried delivery — the character speaks with genuine emotion and slight hesitation. Camera is a gentle slow push-in that feels handcrafted and human.",
  },
  mascot: {
    visual:
      "Bold simplified character design with thick black outlines, oversized head, exaggerated friendly features, and brand-mascot proportions. Could be any object, animal, or abstract shape brought to life as a mascot. Flat or lightly shaded. Colour-popping background.",
    motion:
      "Bouncy, enthusiastic delivery with broad physical gestures. The character's whole body reacts. Camera is locked-off or very slightly zoomed in — lets the mascot's movement carry the frame.",
  },
  cartoon: {
    visual:
      "Saturated cartoon colour palette, exaggerated proportions, classic 2D cartoon style with smooth clean lines. Expressive rubber-hose limbs. Background is illustrated cartoon environment.",
    motion:
      "Classic cartoon energy — rubbery movement, big facial reactions, comedic timing. Camera is punchy and direct.",
  },
  pixar: {
    visual:
      "High-quality 3D CGI render in the style of Pixar Animation. Subsurface scattering on skin, physically based materials, expressive oversized eyes, smooth character design. Studio-quality HDRI lighting.",
    motion:
      "Emotionally rich delivery — the character's face conveys every micro-expression. Camera does a slow cinematic push-in to emphasise the emotional peak.",
  },
  comic_book: {
    visual:
      "Halftone dot pattern overlay, bold black ink outlines in Marvel/DC comic style, high-contrast two-tone colouring with dramatic shadows. Action lines and panel-border feel. Speech-bubble energy without actual text bubbles.",
    motion:
      "Dramatic, punchy delivery with bold gesture. Character leans into the frame like a panel hero. Camera angle is slightly heroic — low angle or Dutch tilt.",
  },
  watercolor: {
    visual:
      "Soft wet-on-wet watercolour washes with visible paper texture and paint bleed at edges. Muted pastel palette. Loose outlines. Background bleeds into character edges.",
    motion:
      "Gentle, reflective delivery. Soft body language — slight lean, quiet gestures. Camera barely moves — a delicate held frame.",
  },
  oil_painting: {
    visual:
      "Visible impasto brushstrokes and rich oil paint texture. Classical portrait style with dramatic chiaroscuro lighting. Deep saturated background with shallow depth of field. Character looks painted from life.",
    motion:
      "Deliberate, measured delivery — like a classical subject sitting for a portrait. One slow push-in over the duration of the scene.",
  },
  "3d_render": {
    visual:
      "Photorealistic 3D CGI render. Detailed PBR textures on skin, hair, and clothing. Studio HDRI three-point lighting with subtle specular highlights. Background is a rendered environment with depth.",
    motion:
      "Clean, polished delivery that matches the high-fidelity look. Subtle camera movement — slight push or rotation — that showcases the 3D space.",
  },
  cyberpunk: {
    visual:
      "Neon-lit dark urban environment with holographic overlays, rain-slicked reflections, and high-tech low-life aesthetic. Character has LED accent lighting and futuristic clothing. Deep shadow with neon pink/blue/green rim light.",
    motion:
      "Intense, urgent delivery with a conspiratorial edge. Camera is close — ECU is appropriate for this style. Slight handheld shake.",
  },
  fantasy: {
    visual:
      "High fantasy setting with magical particle effects, bioluminescent ambient lighting, and ethereal glow. Character wears fantasy costume appropriate to the content. Rich saturated colour with magical realism.",
    motion:
      "Awe-inspiring or dramatic delivery depending on script. Character's gestures have weight and purpose. Camera does a slow reveal-style push-in.",
  },
  vintage: {
    visual:
      "Film grain overlay, desaturated warm sepia-and-amber tone, retro 70s/80s photography aesthetic. Light leaks at frame edges. Character styling appropriate to the era. Slightly soft focus.",
    motion:
      "Warm, nostalgic delivery — relaxed pace, authentic feeling. Camera is slightly unsteady as if shot on Super 8.",
  },
  neon_synthwave: {
    visual:
      "Retrowave aesthetic: neon pinks, purples, and electric blues against a dark grid-horizon background. Chrome and glass textures. Character has synthwave outfit with neon accents. Deep shadow with coloured rim lights.",
    motion:
      "High-energy, confident delivery. The character owns every word. Slow camera pull-back to reveal the neon landscape.",
  },
  ai_clone: {
    visual: "Handled by hasCharacterSheet flag — this entry is never evaluated at runtime.",
    motion: "Handled by hasCharacterSheet flag — this entry is never evaluated at runtime.",
  },
};

// ─── Builder ──────────────────────────────────────────────────────────────────

// PODCAST DUO MODE — overrides the single-character rules so both presenters
// appear in every scene as a two-shot, with one active speaker per line.
const PODCAST_SYSTEM_SECTION = `

## PODCAST DUO MODE (OVERRIDE — takes precedence over all single-character rules above)
This is a TWO-PERSON podcast. The "no second person / single character / no second character" rules are OVERRIDDEN:
- EVERY scene shows BOTH presenters together in the SAME two-shot podcast studio — one presenter in the upper half of the 9:16 frame, the other in the lower half, each seated at the desk with a studio microphone and headphones.
- In each scene exactly ONE presenter is the ACTIVE SPEAKER for that line: their mouth moves with visible, accurate lipsync. The OTHER presenter LISTENS and reacts naturally (slight nod, attentive look, small reaction) and does NOT speak.
- Keep both presenters, the desk, mics, headphones, studio set, lighting, and framing IDENTICAL across every scene. Only the expressions, which presenter is speaking, and small reactions change.
- Leave the vertical MIDDLE band of the frame relatively uncluttered — large captions will sit there later.
- The script is a STRICT turn-by-turn dialogue. Assign speakers deterministically: even scene indices (0, 2, 4, …) → the UPPER presenter (Speaker A) is the active speaker; odd scene indices (1, 3, 5, …) → the LOWER presenter (Speaker B). Alternate every single scene with no exceptions.`;

export function buildTalkingSceneMessages(
  script: string,
  audioDurationSeconds: number,
  targetCount: number,
  ugcVisualStyle?: string,
  characterNote?: string | null,
  hasCharacterSheet?: boolean,
  isPodcast?: boolean,
): PromptPair {
  // Style modifier section — applies to SETTING/LIGHTING/COLOUR GRADE feel.
  // When hasCharacterSheet is true the CHARACTER appearance comes from the
  // reference image, so the style modifier still shapes the environment aesthetic.
  let styleSection: string;
  if (ugcVisualStyle && ugcVisualStyle !== "ai_clone") {
    const modifier = UGC_VISUAL_STYLE_MODIFIERS[ugcVisualStyle] ?? null;
    styleSection = modifier
      ? `\n## Visual style: ${ugcVisualStyle.replace(/_/g, " ").toUpperCase()}\nVisual: ${modifier.visual}\nMotion: ${modifier.motion}`
      : "";
  } else {
    styleSection = "";
  }

  // CHARACTER LOCK — how Claude should write the CHARACTER section in every scene.
  // Priority: podcast > hasCharacterSheet > characterNote > free invention.
  let characterLockSection: string;

  if (isPodcast) {
    // Podcast brands always have a two-shot character sheet attached to Grok.
    characterLockSection = `CHARACTER LOCK — the attached two-shot reference sheet is the ground truth:
A podcast two-shot character sheet showing BOTH presenters in their studio is attached to Grok. Write the CHARACTER section in EVERY scene as this single line, copied verbatim with zero variation:
"CHARACTER: Replicate BOTH presenters exactly as shown in the attached two-shot character sheet — same faces, hair, skin tones, clothing, headphones, microphones, desk, and studio set. Keep them in the same upper/lower positions. Do not alter, omit, or invent anyone."

After the CHARACTER line, write ONLY: SPEAKER (the active speaker by the deterministic rule — even sceneIndex = UPPER presenter, odd sceneIndex = LOWER presenter), EXPRESSION (of both — speaker animated, listener reacting), FRAMING (always the two-shot), SETTING, LIGHTING, COLOUR GRADE.
Never describe the presenters' appearance anywhere else — defer entirely to the sheet.`;
  } else if (hasCharacterSheet) {
    // The operator extension attaches the character sheet image to Grok Imagine.
    // Claude must NOT describe the character — it must defer entirely to the image.
    characterLockSection = `CHARACTER LOCK — the attached reference sheet is the ground truth:
A character sheet image is attached to Grok. Write the CHARACTER section in EVERY scene as this single line, copied verbatim with zero variation:
"CHARACTER: Replicate the face, hair, skin tone, clothing, accessories, and proportions exactly as shown in the attached character sheet image. Do not alter, omit, or invent any physical feature — the reference image is complete and authoritative."

After the CHARACTER line, write ONLY: EXPRESSION / FRAMING / SETTING / LIGHTING / COLOUR GRADE.
Never describe the character's appearance anywhere else in the visualPrompt.`;
  } else if (characterNote) {
    characterLockSection = `CHARACTER ANCHOR (FIXED — DO NOT MODIFY):
The character has already been defined. Copy the following text verbatim as your CHARACTER section in every single scene — scene 0 and all subsequent scenes. Do not invent, rephrase, summarise, or change a single word.

CHARACTER: ${characterNote}

For each scene you write ONLY: EXPRESSION, FRAMING, SETTING, LIGHTING, COLOUR GRADE.
The CHARACTER line in every scene is always exactly: "CHARACTER: ${characterNote}"`;
  } else {
    characterLockSection = `CHARACTER LOCK:
Scene 0: invent and write the complete character anchor (hair, face, clothing, distinguishing feature, build). Clothing choice is entirely unrestricted — match whatever style the content calls for. Be hyper-specific about every detail.
Scenes 1+: copy the CHARACTER section from scene 0 EXACTLY, word for word, with zero changes. The AI image generator needs identical text to produce the same face and body across all clips.`;
  }

  // SETTING LOCK — pull from the character's WORLD when available for consistency.
  // When hasCharacterSheet is true, characterNote is not included elsewhere in the
  // user prompt, so we extract and embed the WORLD line directly rather than
  // referencing "the character description above" (which wouldn't be there).
  const worldLine = characterNote?.split("\n").find((l) => l.trimStart().startsWith("WORLD:")) ?? null;

  let settingLockSection: string;
  if (worldLine && hasCharacterSheet) {
    settingLockSection = `SETTING LOCK — build from character's WORLD:
Use this as the ground truth for the environment: ${worldLine}
Scene 0: expand this into a precise, vivid SETTING — name the exact surface texture, the immediate background elements within 1–2 metres, the far background depth, and the dominant light source with its quality and direction.
Scenes 1+: copy the SETTING line from scene 0 EXACTLY, word for word, unless the script explicitly names a different location. Visual continuity is required.`;
  } else if (worldLine) {
    settingLockSection = `SETTING LOCK — build from character's WORLD:
Scene 0: expand the WORLD line from the character description above into a precise, vivid background. Name the exact surface, the immediate background elements within 1–2 metres, the far background depth, and the dominant light source with its quality and direction.
Scenes 1+: copy the SETTING line from scene 0 EXACTLY, word for word, unless the script explicitly names a different location. Visual continuity is required — do not vary the background for creative reasons.`;
  } else {
    settingLockSection = `SETTING LOCK:
Scene 0: invent one specific background/environment that fits the content and visual style. Be precise — name the exact location, surface, props, and depth.
Scenes 1+: copy the SETTING line from scene 0 EXACTLY, word for word, unless the script sentence explicitly mentions moving to a new location. Do NOT vary the background between scenes — visual continuity is required.`;
  }

  return {
    system: `${TALKING_SCENE_DIRECTOR_SYSTEM}${styleSection}${isPodcast ? PODCAST_SYSTEM_SECTION : ""}`,
    user: `Assign each sentence of this script to one scene. The script was written as exactly ${targetCount} complete sentences — assign one sentence per scene, word for word.

SCRIPT:
${script}

Total duration: ${audioDurationSeconds} seconds (${targetCount} clips × 6 seconds each)
Required scene count: exactly ${targetCount}

Output rules:
- EXACTLY ${targetCount} scene${targetCount === 1 ? "" : "s"} — one per sentence in the script
- textExcerpt: one complete sentence copied VERBATIM from the script — never split a sentence across scenes, never combine two sentences into one scene
- visualPrompt: use the labelled structure (CHARACTER / EXPRESSION / FRAMING / SETTING / LIGHTING / COLOUR GRADE) — every label required in every scene
- motionPrompt: MUST begin with 'SPEAKING: "[exact textExcerpt words verbatim]"' — then 2 additional sentences covering delivery style (pace, energy, emotion) and physical movement (head, hands, body, camera). The SPEAKING line is what the video generator lip-syncs to — it must be exact. Keep delivery consistent with the same voice, accent, and energy across ALL scenes.
- durationHintSeconds: always exactly 6 — every Grok clip is exactly 6 seconds, no exceptions
- The "scenes" field must be a JSON array, not a stringified JSON value

${characterLockSection}

${settingLockSection}

${
  isPodcast
    ? `CRITICAL: This is a PODCAST DUO. Every scene MUST show BOTH presenters in the two-shot studio. Exactly one presenter speaks the textExcerpt (mouth open, accurate lipsync) while the other listens and reacts. Keep the set, framing, and both presenters identical across all scenes — only expressions and the active speaker change. The motionPrompt SPEAKING line is delivered by the active presenter for that scene.`
    : `CRITICAL: Every scene MUST show the character speaking to camera. Mouth open. Eyes on the lens. No B-roll. No abstract visuals. No second person in frame.`
}`,
  };
}
