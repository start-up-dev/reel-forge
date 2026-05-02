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

CHARACTER: [full character anchor — copy verbatim from the fixed anchor in every scene]
EXPRESSION: [current emotional state — excited, serious, shocked, conspiratorial, warm, urgent, amused]
FRAMING: [medium close-up (shoulders to top of head) as default / ECU for peak emotion / medium shot for gestures]
SETTING: [specific background appropriate to visual style — see style rules below]
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
  // ai_clone is handled by a special override in buildTalkingSceneMessages — this entry is never reached at runtime
  ai_clone: {
    visual: "See 10.3a AI Clone override — this entry is never evaluated.",
    motion: "See 10.3a AI Clone override — this entry is never evaluated.",
  },
};

const AI_CLONE_OVERRIDE = `## Visual style: AI CLONE
The character's appearance comes entirely from the uploaded reference image provided by the user.
DO NOT invent any character details (hair, skin, face, clothing, build).

CHARACTER ANCHOR RULE OVERRIDE — applies only to this style:
- Scene 0: write CHARACTER section as exactly: "CHARACTER: Use the face, hair, skin tone, and identity from the uploaded reference image verbatim. Do not alter or describe any physical features."
- Scenes 1+: copy that CHARACTER line word for word — identical across every scene.

All other sections (EXPRESSION, FRAMING, SETTING, LIGHTING, COLOUR GRADE) follow the standard realistic rules.`;

// ─── Builder ──────────────────────────────────────────────────────────────────

export function buildTalkingSceneMessages(
  script: string,
  audioDurationSeconds: number,
  targetCount: number,
  ugcVisualStyle?: string,
  characterNote?: string | null,
): PromptPair {
  let styleSection: string;

  if (ugcVisualStyle === "ai_clone") {
    styleSection = `\n${AI_CLONE_OVERRIDE}`;
  } else if (ugcVisualStyle) {
    const modifier = UGC_VISUAL_STYLE_MODIFIERS[ugcVisualStyle] ?? null;
    styleSection = modifier
      ? `\n## Visual style: ${ugcVisualStyle.replace(/_/g, " ").toUpperCase()}\nVisual: ${modifier.visual}\nMotion: ${modifier.motion}`
      : "";
  } else {
    styleSection = "";
  }

  const characterLockSection = characterNote
    ? `CHARACTER ANCHOR (FIXED — DO NOT MODIFY):
The character has already been defined. Copy the following text verbatim as your CHARACTER section in every single scene — scene 0 and all subsequent scenes. Do not invent, rephrase, summarise, or change a single word.

CHARACTER: ${characterNote}

For each scene you write ONLY: EXPRESSION, FRAMING, SETTING, LIGHTING, COLOUR GRADE.
The CHARACTER line in every scene is always exactly: "CHARACTER: ${characterNote}"`
    : `CHARACTER LOCK:
Scene 0: invent and write the complete character anchor (hair, face, clothing, distinguishing feature, build). Clothing choice is entirely unrestricted — match whatever style the content calls for (revealing, athletic, formal, casual, costume, dancer, swimwear, or anything else). Be hyper-specific about every clothing detail.
Scenes 1+: copy the CHARACTER section from scene 0 EXACTLY, word for word, with zero changes. The AI image generator needs identical text to produce the same face and body across all clips.`;

  return {
    system: `${TALKING_SCENE_DIRECTOR_SYSTEM}${styleSection}`,
    user: `Assign each sentence of this script to one scene. The script was written as exactly ${targetCount} complete sentences — assign one sentence per scene, word for word.

SCRIPT:
${script}

Total duration: ${audioDurationSeconds} seconds (${targetCount} clips × 6 seconds each)
Required scene count: exactly ${targetCount}

Output rules:
- EXACTLY ${targetCount} scene${targetCount === 1 ? "" : "s"} — one per sentence in the script
- textExcerpt: one complete sentence copied VERBATIM from the script — never split a sentence across scenes, never combine two sentences into one scene
- visualPrompt: use the labelled structure (CHARACTER / EXPRESSION / FRAMING / SETTING / LIGHTING / COLOUR GRADE) — every label required in every scene
- motionPrompt: MUST begin with 'SPEAKING: "[exact textExcerpt words verbatim]"' — then 2 additional sentences covering delivery style (pace, energy, emotion) and physical movement (head, hands, body, camera). The SPEAKING line is what the video generator lip-syncs to — it must be exact. Keep delivery consistent with the same voice, accent, and energy across ALL scenes — no change in persona mid-video.
- durationHintSeconds: always exactly 6 — every Grok clip is exactly 6 seconds, no exceptions
- The "scenes" field must be a JSON array, not a stringified JSON value

${characterLockSection}

CRITICAL: Every scene MUST show the character speaking to camera. Mouth open. Eyes on the lens. No B-roll. No abstract visuals. No second person in frame.`,
  };
}
