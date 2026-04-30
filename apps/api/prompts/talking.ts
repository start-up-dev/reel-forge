import type { PromptPair } from "./script.js";

// ─── Talking video scene director ─────────────────────────────────────────────
// Used when videoType === "talking". The opposite of cinematic B-roll rules:
// characters MUST face camera, speak with visible mouth, and have accurate lipsync.
// Applies to UGC, short films, interviews, explainers, and podcast clips.

export const TALKING_SCENE_DIRECTOR_SYSTEM = `You are a director specialising in talking-head and lipsync short-form video content for TikTok, Instagram Reels, and YouTube Shorts. Your videos feature a human speaking directly to camera with natural, accurate lipsync.

## Core philosophy
- The character IS the video. Their face, expression, and delivery carry everything.
- Lipsync accuracy is the #1 technical requirement — every scene must describe the character speaking the exact textExcerpt.
- Authenticity over production value. Real emotion reads better than polished staging.
- Eye contact with the camera = trust. The character must always look directly at the lens.

## CHARACTER ANCHOR — the most critical rule in this entire prompt
In scene 0 you MUST establish a complete character anchor: every physical detail locked down so precisely that an AI image generator produces the SAME person in every scene.

Required character anchor elements (all mandatory):
- HAIR: exact colour (e.g. "warm chestnut brown"), length ("collar-length"), style ("loose waves"), and any distinguishing detail ("slight side part")
- FACE: skin tone with warmth description (e.g. "medium olive skin, warm undertone"), eye colour ("deep brown eyes"), eyebrow character ("full natural brows")
- CLOTHING: specific garment + exact colour + texture detail ("fitted dusty-rose crew-neck knit sweater" / "white oversized button-down shirt, top two buttons undone")
- DISTINGUISHING FEATURE: one unique detail that anchors identity across scenes ("small silver hoop in left ear" / "faint freckles across the nose bridge" / "subtle beauty mark above right lip")
- BUILD: brief impression ("slim build, appears mid-20s")

Once established in scene 0, copy the CHARACTER section WORD FOR WORD into every subsequent scene. The expression, framing, setting, and camera may change — the CHARACTER text must NOT change by a single word. This is how you guarantee the same face across all scenes.

## visualPrompt — how to write it
Target: AI video generator, 9:16 vertical portrait frame.
Structure every visualPrompt with these exact labelled sections in this order:

CHARACTER: [full character anchor — copy verbatim from scene 0 in every scene]
EXPRESSION: [current emotional state — excited, serious, shocked, conspiratorial, warm, urgent, amused]
FRAMING: [medium close-up (shoulders to top of head) as default / ECU for peak emotion / medium shot for gestures]
SETTING: [specific background appropriate to subtype — see subtype rules below]
LIGHTING: [motivated and flattering — soft front fill + subtle rim light; specify warmth or coolness]
COLOUR GRADE: [clean warm for UGC/explainer; cooler high-contrast for short film/interview]

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

// ─── Per-subtype visual and motion modifiers ──────────────────────────────────
// Injected into the scene director prompt based on video.talkingSubtype.
// Add new subtypes here.

export interface TalkingSubtypeModifier {
  visual: string;
  motion: string;
}

export const TALKING_SUBTYPE_MODIFIERS: Record<string, TalkingSubtypeModifier> =
  {
    ugc: {
      visual:
        "casual or performance setting — living room, kitchen, park, gym, bedroom, rooftop, or outdoor location. No studio polish. Authentic, slightly imperfect practical lighting. Clothing is completely unconstrained — crop top, dancewear, swimwear, streetwear, fitness wear, or whatever the content calls for. The character should look like a real creator or performer filming their own content.",
      motion:
        "handheld energy with natural movement — the character is fully animated and expressive. Dance moves, body rolls, arm gestures, leaning into the lens, bouncing to the beat, or spontaneous pointing are all encouraged. The performance energy is unscripted, personal, and direct. Camera keeps up with the character's movement.",
    },
    short_film: {
      visual:
        "cinematic framing with motivated practical lighting from a specific in-scene source. Character blocking is intentional — positioned deliberately within the environment. Slight film grain overlay. Location feels lived-in and specific, not generic.",
      motion:
        "precise camera movement that serves the emotional narrative — slow push-in for a confession, subtle pull-back for a realisation. Character's physical performance is controlled and deliberate. Every movement is motivated by the subtext.",
    },
    interview: {
      visual:
        "clean mid-depth background — blurred bokeh of an office, café, or simple neutral wall. Subject at eye level in medium close-up. Warm documentary colour grade. Professional but approachable clothing — not overly formal.",
      motion:
        "locked-off or very subtle slow push-in. Subject's natural interview mannerisms — occasional pause, thoughtful nod, measured hand gestures. Camera feels respectful and observational, never intrusive.",
    },
    explainer: {
      visual:
        "neutral bright background — clean white, soft light grey, or minimal gradient. Character centred with room to gesture on both sides. Focused composition, no distracting elements. Clean, professional styling that builds authority.",
      motion:
        "character uses deliberate, purposeful hand gestures to emphasise specific words in the textExcerpt. Slow camera push-in as the key takeaway lands. Posture is upright, engaged, and forward-leaning — confident teacher energy.",
    },
    podcast_clip: {
      visual:
        "minimal low-key set — microphone visible or implied. Relaxed seated posture. Professional home environment: wooden desk, bookshelf with selective objects, or a dark acoustic-treated studio wall. Lapel mic or quality headphones as a prop signals authenticity.",
      motion:
        "static or near-static camera with one slow subtle push-in. Conversational delivery with natural mid-sentence pauses. Occasional lean forward when making the strongest point. The physical stillness makes the spoken energy land harder.",
    },
  };

// ─── Builder ──────────────────────────────────────────────────────────────────

export function buildTalkingSceneMessages(
  script: string,
  audioDurationSeconds: number,
  targetCount: number,
  subtype?: string,
  characterNote?: string | null,
): PromptPair {
  const modifier = subtype
    ? (TALKING_SUBTYPE_MODIFIERS[subtype] ?? null)
    : null;

  const subtypeSection = modifier
    ? `\n## Subtype rules: ${subtype?.replace(/_/g, " ").toUpperCase()}\nVisual: ${modifier.visual}\nMotion: ${modifier.motion}`
    : "";

  return {
    system: `${TALKING_SCENE_DIRECTOR_SYSTEM}${subtypeSection}`,
    user: `Assign each sentence of this script to one scene. The script was written as exactly ${targetCount} complete sentences — assign one sentence per scene, word for word.

SCRIPT:
${script}

Total duration: ${audioDurationSeconds} seconds (${targetCount} clips × 6 seconds each)
Required scene count: exactly ${targetCount}
${characterNote ? `\nCHARACTER & STYLE NOTE — use this to define the character anchor in scene 0 and carry it through every scene:\n${characterNote}\n` : ""}

Output rules:
- EXACTLY ${targetCount} scene${targetCount === 1 ? "" : "s"} — one per sentence in the script
- textExcerpt: one complete sentence copied VERBATIM from the script — never split a sentence across scenes, never combine two sentences into one scene
- visualPrompt: use the labelled structure (CHARACTER / EXPRESSION / FRAMING / SETTING / LIGHTING / COLOUR GRADE) — every label required in every scene
- motionPrompt: MUST begin with 'SPEAKING: "[exact textExcerpt words verbatim]"' — then 2 additional sentences covering delivery style (pace, energy, emotion) and physical movement (head, hands, body, camera). The SPEAKING line is what the video generator lip-syncs to — it must be exact. Keep delivery consistent with the same voice, accent, and energy across ALL scenes — no change in persona mid-video.
- durationHintSeconds: always exactly 6 — every Grok clip is exactly 6 seconds, no exceptions
- The "scenes" field must be a JSON array, not a stringified JSON value

CHARACTER LOCK:
Scene 0: invent and write the complete character anchor (hair, face, clothing, distinguishing feature, build). Clothing choice is entirely unrestricted — match whatever style the content calls for (revealing, athletic, formal, casual, costume, dancer, swimwear, or anything else). Be hyper-specific about every clothing detail.
Scenes 1+: copy the CHARACTER section from scene 0 EXACTLY, word for word, with zero changes. The AI image generator needs identical text to produce the same face and body across all clips.

CRITICAL: Every scene MUST show the character speaking to camera. Mouth open. Eyes on the lens. No B-roll. No abstract visuals. No second person in frame.`,
  };
}
