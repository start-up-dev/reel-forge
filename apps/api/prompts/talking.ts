import type { PromptPair } from "./script.js";

// ─── Talking video scene director ─────────────────────────────────────────────
// Used when videoType === "talking". The opposite of cinematic B-roll rules:
// characters MUST face camera, speak with visible mouth, and have accurate lipsync.
// Applies to UGC, short films, interviews, explainers, and podcast clips.

export const TALKING_SCENE_DIRECTOR_SYSTEM = `You are a director specialising in talking-head and lipsync short-form video content for platforms like TikTok, Instagram Reels, and YouTube Shorts. Your videos feature a human or character speaking directly to camera with natural, accurate lipsync.

## Core philosophy
- The character IS the video. Their face, expression, and delivery carry everything.
- Lipsync accuracy is the #1 technical requirement — every scene must describe the character speaking the exact textExcerpt.
- Authenticity over production value. Real emotion reads better than polished staging.
- Eye contact with the camera = trust. The character must always look at the lens.

## visualPrompt — how to write it
Target: AI video generator, 9:16 vertical portrait frame.
Always specify ALL of the following:

CHARACTER: describe the person or character — their appearance, clothing, and current expression (excited, serious, shocked, warm, conspiratorial, etc.)
FRAMING: medium close-up (shoulders to top of head) is the default / ECU for emotional moments / medium shot for gestures
SETTING: specific background appropriate to the subtype — see subtype rules below
LIGHTING: motivated and flattering — soft front fill + subtle rim light as default
COLOUR GRADE: clean and slightly warm for UGC/explainer; cooler and more contrasty for short film/interview
MOUTH: character mouth must be OPEN and forming words — do not describe closed-mouth expressions

## motionPrompt — how to write it
2–3 sentences covering:
1. LIPSYNC DELIVERY: describe how the character delivers the textExcerpt — energetic and punchy / slow and deliberate / conversational / urgent whisper
2. HEAD & BODY MOVEMENT: natural head tilt / hand gesture emphasising a key word / leaning in for intensity / eyebrow raise for a question
3. CAMERA: subtle slow push-in for intimacy / locked-off static for authority / gentle handheld for authenticity

## Hard rules
- Character MUST be facing camera and speaking in EVERY scene — no exceptions
- Mouth MUST be visibly moving/open — describe this explicitly in every visualPrompt
- No cinematic B-roll, no silhouettes, no abstract visuals
- No text, subtitles, logos, or UI in frame`;

// ─── Per-subtype visual and motion modifiers ──────────────────────────────────
// Injected into the scene director prompt based on video.talkingSubtype.
// Add new subtypes here.

export interface TalkingSubtypeModifier {
  visual: string;
  motion: string;
}

export const TALKING_SUBTYPE_MODIFIERS: Record<string, TalkingSubtypeModifier> = {
  ugc: {
    visual: "casual home or outdoor setting — living room, kitchen counter, park bench. Creator holds phone or speaks naturally to front camera. No studio polish. Authentic, slightly imperfect lighting. Relaxed clothing.",
    motion: "handheld feel with subtle natural shake. Creator leans into the frame occasionally. Gestures are spontaneous and unscripted-feeling.",
  },
  short_film: {
    visual: "cinematic framing with motivated practical lighting. Character blocking is intentional — positioned deliberately within the environment. Slight film grain. Location feels lived-in and specific.",
    motion: "precise camera movement that serves the narrative — slow push-in for a confession, pull-back for a reveal. Character's physical performance is controlled and deliberate.",
  },
  interview: {
    visual: "clean background — blurred bokeh of an office or cafe, or a simple neutral wall. Subject framed at eye level in medium close-up. Documentary warmth. Professional but approachable clothing.",
    motion: "locked-off or very subtle slow push-in. Subject's natural interview mannerisms — occasional pause, slight nod, measured gestures. Camera feels respectful and observational.",
  },
  explainer: {
    visual: "neutral light background — white, light grey, or soft gradient. Character centred in frame with space to gesture. Clear and focused composition. Clean, professional styling.",
    motion: "character uses deliberate hand gestures to emphasise key points in the textExcerpt. Slow deliberate camera push-in when landing the main takeaway. Posture is upright and engaged.",
  },
  podcast_clip: {
    visual: "minimal set — microphone visible or implied in frame. Relaxed seated posture. Low-key professional environment: desk, bookshelf, or dark studio background. Quality headphones or lapel mic as props.",
    motion: "static or near-static camera. Conversational delivery with natural pauses. Occasional lean forward for emphasis. The stillness of the setup contrasts with the energy of the content.",
  },
};

// ─── Builder ──────────────────────────────────────────────────────────────────

export function buildTalkingSceneMessages(
  script: string,
  audioDurationSeconds: number,
  targetCount: number,
  subtype?: string,
): PromptPair {
  const modifier = subtype ? (TALKING_SUBTYPE_MODIFIERS[subtype] ?? null) : null;

  const subtypeSection = modifier
    ? `\n## Subtype rules: ${subtype?.replace(/_/g, " ").toUpperCase()}\nVisual: ${modifier.visual}\nMotion: ${modifier.motion}`
    : "";

  return {
    system: `${TALKING_SCENE_DIRECTOR_SYSTEM}${subtypeSection}`,
    user: `Split this script into exactly ${targetCount} scene${targetCount === 1 ? "" : "s"} where the character speaks directly to camera.

SCRIPT:
${script}

Total audio duration: ${audioDurationSeconds} seconds
Required scene count: exactly ${targetCount}

Rules:
- EXACTLY ${targetCount} scene${targetCount === 1 ? "" : "s"} — no more, no fewer
- textExcerpt: exact words from the script this scene covers (the character speaks THESE words)
- visualPrompt: describe the character, framing, setting, lighting, and mouth position (open, forming words)
- motionPrompt: describe lipsync delivery style, head/body movement, and camera movement
- durationHintSeconds: integer 1–6, all scenes sum to exactly ${audioDurationSeconds}
- The "scenes" field must be a JSON array, not a stringified JSON value.

CRITICAL: Every scene MUST show the character speaking. Mouth open. Eye contact with camera. No B-roll. No abstract visuals.`,
  };
}
