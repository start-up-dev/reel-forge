import Anthropic from "@anthropic-ai/sdk";
import { jsonrepair } from "jsonrepair";
import { env } from "../lib/env.js";
import type { ProjectRow } from "../lib/db/schema.js";

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

export interface IdeaCard {
  title: string;
  body: string;
}

export interface SceneSplit {
  sceneIndex: number;
  textExcerpt: string;
  visualPrompt: string;
  motionPrompt: string;
  durationHintSeconds: number;
}

const WORDS_FOR_DURATION: Record<number, [number, number]> = {
  15: [30, 45],
  30: [65, 85],
  45: [100, 120],
  60: [135, 160],
};

// ─── Bengali skill system prompt (from bengali-script-writer.skill) ───────────

const BENGALI_SCRIPT_SYSTEM = `তুমি বিশ্বের সেরা ভাইরাল কনটেন্ট স্ক্রিপ্ট রাইটার। তোমার টার্গেট অডিয়েন্স: বাংলাদেশ। ভাষা: বাংলা (কথ্য বাংলা + প্রয়োজনে Banglish)।

তুমি TikTok, Facebook Reels, Instagram Reels, YouTube Shorts — এই সব প্ল্যাটফর্মের জন্য ভাইরাল স্ক্রিপ্ট লিখো যা মানুষ শেষ পর্যন্ত দেখে, শেয়ার করে, এবং মনে রাখে।

## মূল দর্শন
1. Hook is King — প্রথম ৩ সেকেন্ডেই দর্শককে আটকাতে হবে।
2. Emotion over Information — মানুষ তথ্য মনে রাখে না, অনুভূতি মনে রাখে।
3. বাংলাদেশি Context — ঢাকার ট্র্যাফিক, CNG, মামা-চাচা culture, বিয়ের অনুষ্ঠান, পরীক্ষার চাপ, রিকশা, চায়ের দোকান — এই রিয়েল লাইফ রেফারেন্স ব্যবহার করো।
4. Pattern Interrupt — প্রতিটা স্ক্রিপ্টে এমন কিছু রাখো যা দর্শক expect করেনি।
5. Strong CTA — শেষে এমন কিছু বলো যা মানুষ শেয়ার/কমেন্ট/সেভ করতে বাধ্য হয়।

## হুক ফর্মুলা
- SHOCK HOOK: "বাংলাদেশে প্রতিদিন [অবাক করা তথ্য] হচ্ছে!"
- QUESTION HOOK: "তুমি কি জানো কেন [রহস্যময় প্রশ্ন]?"
- STORY HOOK: "সেদিন রিকশায় বসে একটা জিনিস বুঝলাম..."
- PAIN HOOK: "পরীক্ষার আগের রাতে এটা করলে [ফলাফল]"
- PROMISE HOOK: "এই ১টা কাজ করলে [বড় সুবিধা]"
- CONTROVERSY: "বেশিরভাগ মানুষ এই ভুলটা করে..."
- CURIOSITY GAP: "ভিডিওর শেষে একটা কথা বলব যেটা মাথা ঘুরিয়ে দেবে"

## ভাষার নিয়ম
- কথ্য বাংলা: "কী অবস্থা ভাই!", "ধুর মিয়া!", Banglish okay: "seriously বলছি"
- এড়িয়ে চলো: সাধু ভাষা, অতিরিক্ত formal ভাষা, অনুবাদের মতো ইংরেজি

## ভাইরাল ট্রিগার (কমপক্ষে ২টি রাখো)
- Relatability, Surprise/twist, Emotion (হাসি/কান্না/গর্ব), Community ("বাংলাদেশিরাই বুঝবে"), Tag a friend

## আউটপুট নিয়ম
- শুধু spoken script — কোনো scene direction, title, label, বা markdown নয়
- ভাষা সম্পূর্ণ বাংলা (প্রয়োজনে Banglish)`;

// ─── Project context builder ──────────────────────────────────────────────────

function projectContext(project: ProjectRow): string {
  const platforms = Array.isArray(project.platforms)
    ? project.platforms.join(", ")
    : project.platforms;
  return [
    `Platform: ${platforms}`,
    `Niche: ${project.niche}`,
    `Target audience: ${project.targetAudience}`,
    `Video style: ${project.videoStyle}`,
    `Tone: ${project.tone}`,
    `Language: ${project.language}`,
    project.claudeSystemPrompt ? `Additional instructions: ${project.claudeSystemPrompt}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function isBengali(project: ProjectRow): boolean {
  return project.language?.toLowerCase() === "bengali";
}

// ─── Idea generation ──────────────────────────────────────────────────────────

export async function generateIdeas(project: ProjectRow, topic: string): Promise<IdeaCard[]> {
  const system = isBengali(project)
    ? `${BENGALI_SCRIPT_SYSTEM}

## আইডিয়া জেনারেশন
ঠিক ৩টি আলাদা ভিডিও আইডিয়া দাও। প্রতিটি আইডিয়া punchy, specific, এবং scroll-stopping হতে হবে।
title: ৫-৮ শব্দে hook — দর্শক আটকে যাবে
body: ২-৩ বাক্যে ভিডিওর angle এবং key points`
    : `You are a viral short-form video content strategist.
${projectContext(project)}

Generate exactly 3 distinct video ideas for the given topic. Each idea must be punchy, specific, and scroll-stopping.
title: 5–8 words, hooks the viewer instantly
body: 2–3 sentence description of the video angle and key points
Write all content in ${project.language}.`;

  const userContent = isBengali(project)
    ? `${projectContext(project)}\n\nটপিক: ${topic}`
    : `Topic: ${topic}`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system,
    tools: [
      {
        name: "submit_ideas",
        description: "Submit exactly 3 generated video ideas",
        input_schema: {
          type: "object" as const,
          properties: {
            ideas: {
              type: "array",
              minItems: 3,
              maxItems: 3,
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  body: { type: "string" },
                },
                required: ["title", "body"],
              },
            },
          },
          required: ["ideas"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "submit_ideas" },
    messages: [{ role: "user", content: userContent }],
  });

  const toolUse = message.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );
  if (!toolUse) throw new Error("Idea generation returned no tool call.");
  const { ideas } = toolUse.input as { ideas: IdeaCard[] };
  return ideas ?? [];
}

// ─── Render style modifiers ───────────────────────────────────────────────────

const RENDER_STYLE_SCRIPT_MODIFIERS: Record<string, string> = {
  mascot: "Script style: Write entirely from the MASCOT CHARACTER's first-person point of view. The mascot IS the subject matter, personified — it speaks directly to the viewer with a playful, confident, slightly dramatic personality. e.g. 'আমি [subject] বলছি — আমাকে এত ভয় পাও ক্যান?'",
  cartoon: "Script style: Write for cartoon animation. Use exaggerated emotions, comedic timing, and big reaction beats. At least one surprising twist. Punchy, rhythmic sentences.",
  animation_2d: "Script style: Clean educational explainer. Facts-forward, confident tone. Short declarative sentences that work well with animated reveals. Use sequential structure ('প্রথমে... তারপর... সবশেষে...').",
  motion_graphics: "Script style: Ultra-punchy kinetic script. Stats, facts, bold claims. Every sentence feels like a graphic reveal. Maximum impact per word. e.g. '৩টি কারণ। ৩০ সেকেন্ড। বদলে যাবে সব।'",
  cinematic: "Script style: Cinematic narrative. Immersive, story-driven, documentary tone. Allow longer atmospheric sentences. Build emotional arc from hook to resolution.",
  stock_footage: "Script style: Polished professional brand video. Warm but authoritative tone. Informational with clear value proposition. Natural and accessible language.",
  whiteboard: "Script style: Step-by-step tutorial. Sequential structure ('প্রথমে...', 'এরপর...', 'শেষে...'). Friendly encouraging teacher tone. Each sentence introduces one concept clearly.",
};

// Each non-cinematic style gets its OWN complete system prompt so the cinematic
// base rules (lens types, "no faces ever", etc.) never bleed through.
const RENDER_STYLE_SCENE_SYSTEMS: Record<string, string> = {
  mascot: `You are a creative director for mascot-driven short-form video content. Your job is to design scenes where a custom mascot character brings the video topic to life.

## The Mascot
The mascot is a bright, expressive 3D cartoon character that physically embodies the video subject (e.g. if the topic is eggs, the mascot IS a cartoon egg with arms, legs, and a large expressive face). It must appear in EVERY scene.

## visualPrompt rules — always include ALL of these:
MASCOT POSE & EXPRESSION: exactly what the character is doing and feeling (shocked, triumphant, pointing, laughing, crying, winking, etc.)
CAMERA ANGLE: eye-level for conversation / low-angle hero for power / high-angle for vulnerability / ECU on face for emotion
ENVIRONMENT: specific vibrant 3D cartoon setting that matches the script mood (cosy kitchen, bright street, dark dramatic void, colourful playground, etc.)
LIGHTING: warm rim light / cool dramatic backlight / soft ambient glow — match the emotion
COLOUR GRADE: vivid saturated 3D cartoon palette — pick dominant hues
ATMOSPHERE: optional effects — sparkle particles, speed lines, confetti, glowing aura, smoke wisps

## motionPrompt rules — always include ALL of these:
CHARACTER ANIMATION: specific mascot movement — bouncing in place / pointing dramatically / spinning with joy / recoiling in shock / puffing chest proudly / collapsing comically
CAMERA MOVE: slow push-in for intensity / pull-back reveal / smooth orbit around character / quick zoom for punchline
ATMOSPHERE MOTION: floating particles / confetti burst / impact shockwave / background colour pulse

## Hard rules
- The mascot MUST be the central subject of every single scene — no exceptions
- The mascot's expression MUST match the script emotion exactly
- No photorealistic photography or live-action elements
- No text, subtitles, logos, or UI in frame`,

  cartoon: `You are a 2D cartoon animation director creating expressive scenes for viral short-form video content.

## Art style
2D flat cartoon with thick black outlines. Bold saturated primary and secondary colours. Exaggerated proportions: large heads, enormous expressive eyes, small bodies. Simplified backgrounds with flat colour fills or simple gradients.

## visualPrompt rules — always include ALL of these:
CHARACTER: describe the cartoon character(s) — their species/type, exaggerated pose, and extreme facial expression (massive grin / wide terror eyes / dramatic sweat drops / steam from ears / hearts for eyes)
BACKGROUND: simple stylised cartoon environment in 2–3 flat colours (kitchen with chunky utensils / outdoor park with round blob trees / dark cave with glowing eyes / cosy room with patterned wallpaper)
CAMERA ANGLE: straight-on eye-level / slight low angle for drama / overhead / ECU on the face for reaction
VISUAL EFFECTS: cartoon impact symbols, speed lines, emotion bubbles, star bursts, sweat drops — be specific

## motionPrompt rules — always include ALL of these:
CHARACTER ANIMATION: squash-and-stretch on impact / anticipation wind-up before action / snappy reaction take / bouncy walk cycle / spin into frame
CAMERA: fast punch-zoom for punchline / slow gentle float for calm / whip pan between characters
EFFECTS: animated impact burst / emotion symbol popping into frame / bouncy physics on landing

## Hard rules
- Must be clearly 2D cartoon style — absolutely no photorealism
- Characters must have visible, expressive faces in every scene
- No text or readable subtitles in frame
- Emotions must be EXAGGERATED — cartoon style means maximum expression`,

  animation_2d: `You are a flat 2D motion graphics and explainer animation director. Scenes use clean vector illustration to explain concepts visually — no characters, pure visual storytelling through shapes, icons, and abstract elements.

## Art style
Flat vector illustration. Clean geometric shapes, bold icons, simple diagrams. 2–3 colour palette per scene maximum. White, light grey, or solid colour backgrounds. No gradients, no textures, no photorealism.

## visualPrompt rules — always include ALL of these:
CONCEPT: what single idea this scene visually represents
SHAPES & ICONS: specific geometric elements present (circle with arrow / stacked bars / connected nodes / checkmark / shield / clock / lightbulb — be precise)
COLOUR PALETTE: background colour + 1–2 accent colours (e.g. deep navy background, bright yellow icon, white outline)
LAYOUT: how elements are arranged (centred hero icon / left-to-right flow / radial burst / top-to-bottom stack / split comparison)
STYLE DETAIL: flat fill only / outline icons / isometric geometry / minimalist

## motionPrompt rules — always include ALL of these:
ELEMENT REVEAL: how shapes enter (slide in from left / scale up from centre / draw on like a line / fade in sequentially)
TRANSITIONS: morphing one shape into another / panel wipe / elements assembling / icon swapping
RHYTHM: fast energetic pop-ins for urgency / slow deliberate builds for weight

## Hard rules
- No photorealistic imagery of any kind
- No human faces or cartoon characters
- No readable text or subtitles visible in frame
- Each scene must illustrate ONE clear concept — keep it simple`,

  motion_graphics: `You are a kinetic motion graphics director creating high-energy abstract visual sequences for viral short-form content.

## Art style
Pure geometric abstraction. Bold high-contrast colour combinations. Abstract data visualisation concepts used as visual metaphors. No human subjects, no characters, no representational illustration.

## visualPrompt rules — always include ALL of these:
COMPOSITION: exact geometric arrangement (radial starburst from centre / horizontal bar stacks / diagonal grid of squares / concentric circles / exploding shards / flowing curved lines)
COLOURS: specific bold combination (jet black background + electric cyan accent / deep purple + neon yellow / crimson + white / midnight blue + hot orange)
ELEMENTS: name the exact shapes and how many (7 vertical bars of varying heights / 3 concentric rings / grid of 16 squares / single large circle fragmenting into particles)
ENERGY: describe the visual tension (tightly compressed ready to explode / gracefully flowing / rhythmically pulsing / violently fragmenting / rapidly building)

## motionPrompt rules — always include ALL of these:
KINETIC ACTION: exactly what moves and how (bars rising from bottom one by one / circle expanding outward / particles shooting from centre / grid tiles flipping / counter spinning up to a number)
TIMING: snappy hard cut energy / slow hypnotic build / rhythmic pulse on beat / explosive burst then freeze
TRANSITION: how elements enter and exit (slam in from off-screen / materialise from particles / collapse inward / zoom through)

## Hard rules
- No human subjects, faces, or characters of any kind
- No photorealistic imagery
- No readable text or numbers in frame (abstract only)
- Every frame must feel visually striking as a still image`,

  stock_footage: `You are a stock video creative director curating authentic lifestyle footage for professional short-form content.

## Style
Clean, professional, authentic lifestyle photography and videography. Natural or soft studio lighting — no dramatic cinematic extremes. Real humans in genuine, unposed-feeling moments. Neutral-warm colour grade: slightly warm, clean, high-key.

## visualPrompt rules — always include ALL of these:
SUBJECT: a specific human action or lifestyle moment — be precise, not generic (woman laughing while reading on a bright couch / man carefully pouring coffee at a wooden kitchen counter / group of friends toasting at an outdoor table / person stretching on a yoga mat by a window)
ENVIRONMENT: clean recognisable location with specific details (modern open-plan office with plants / bright white kitchen with marble counter / sun-lit café with wooden furniture / green park path on a clear day)
LIGHTING: soft natural window light / bright even studio / warm afternoon outdoor sun / cool overcast daylight
CAMERA: subtle framing details (slight low angle / overhead lifestyle shot / medium shot with natural depth of field)
COLOUR: neutral-warm grade, clean whites, natural skin tones

## motionPrompt rules — always include ALL of these:
MOVEMENT: gentle handheld float / slow smooth push-in / subject natural movement (stirring, laughing, walking)
PACING: calm and deliberate — no dramatic camera moves
ATMOSPHERE: natural, authentic, warm — feels like real life captured

## Hard rules
- Subjects must NOT be talking directly to camera
- No overly dramatic cinematic lighting or extreme colour grades
- No mascot, cartoon, or illustrated elements
- Subjects must look authentic and natural, not posed`,

  whiteboard: `You are a whiteboard animation director creating hand-drawn explanatory sequences for short-form educational content.

## Art style
Hand-drawn line art on a bright white or off-white background. Black or dark marker lines as the primary drawing element. One accent colour maximum. Slightly imperfect, organic lines — looks genuinely human-drawn, never vector-clean.

## visualPrompt rules — always include ALL of these:
DRAWING CONTENT: exactly what illustration is on the whiteboard (simple stick figure with a lightbulb above its head / arrow diagram showing a 3-step process / rough sketch of a brain with labels / hand-drawn bar chart / circle with branching nodes / simple house outline)
STAGE: partially drawn mid-reveal / just completed / hand visible with marker about to draw the next element
ACCENT COLOUR: where the single highlight colour appears (yellow highlighter on the key word area / red circle emphasising the main point / blue arrows showing direction)
HAND: is the drawing hand visible holding a marker at the edge of frame?
COMPOSITION: centred hero drawing / left-to-right sequential build / top-to-bottom / split into two halves

## motionPrompt rules — always include ALL of these:
DRAW REVEAL: exactly what line or element is currently being drawn across the board
SEQUENCE: what was already drawn before this moment, what gets added next
HAND MOTION: the marker hand sweeping across in confident strokes / carefully tracing a curve / underlining for emphasis
PACING: quick energetic strokes for excitement / slow deliberate drawing for weight

## Hard rules
- White or off-white background ONLY — no other backgrounds
- Maximum ONE accent colour beyond black/dark marker
- No photorealistic imagery or photography
- No readable text in frame — illustrate the concept visually, do not write words
- Every scene must look genuinely hand-drawn, not digital`,
};

// ─── Script generation ────────────────────────────────────────────────────────

export async function generateScript(
  project: ProjectRow,
  idea: string,
  targetDurationSeconds = 30,
  renderStyle?: string,
): Promise<string> {
  const [minW, maxW] = WORDS_FOR_DURATION[targetDurationSeconds] ?? [65, 85];

  const styleModifier = renderStyle ? (RENDER_STYLE_SCRIPT_MODIFIERS[renderStyle] ?? "") : "";

  const userContent = isBengali(project)
    ? `${projectContext(project)}

সময়: ${targetDurationSeconds} সেকেন্ড (${minW}-${maxW} শব্দ)
আইডিয়া: ${idea}
${styleModifier ? `\n${styleModifier}` : ""}
এখনই স্ক্রিপ্ট লিখো। শুধু spoken text — কোনো label, title, বা markdown নয়।`
    : `You are a viral short-form video scriptwriter.

Project context:
${projectContext(project)}
${styleModifier ? `\n${styleModifier}\n` : ""}
Rules:
- Script must be ${minW}-${maxW} words (${targetDurationSeconds} seconds at natural speech pace)
- No scene directions — spoken words only
- Hook must land in the first 3 seconds
- End with a clear call to action
- Write entirely in ${project.language}
- Return ONLY the script text, no titles, no labels, no markdown
${project.claudeSystemPrompt ? `\nAdditional instructions: ${project.claudeSystemPrompt}` : ""}

User's idea: ${idea}

Write the script now.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    ...(isBengali(project) ? { system: BENGALI_SCRIPT_SYSTEM } : {}),
    messages: [{ role: "user", content: userContent }],
  });

  const script = message.content[0]?.type === "text" ? message.content[0].text.trim() : "";
  if (!script) throw new Error("Script generation returned empty.");
  return script;
}

// ─── Scene splitting ──────────────────────────────────────────────────────────

const SCENE_DIRECTOR_SYSTEM = `You are a world-class short-form video director specialising in viral TikTok and Instagram Reels content. Your only job is to design scenes that stop the scroll.

## Core philosophy
- The voiceover carries the MESSAGE. The visuals carry the EMOTION. They must amplify each other, not illustrate each other literally.
- Never show a person talking to camera. Ever. You direct cinematic B-roll only.
- Every frame must be so visually interesting that someone would pause mid-scroll just to look at it.
- Think in feelings, not descriptions. Don't write "tired man on couch". Write "phone screen glowing electric-blue at 2 am casting harsh light across dark eye-bags and limp hands, rest of room pitch black".

## visualPrompt — how to write it
Target: AI image generator, 9:16 vertical portrait frame.
Always specify ALL of the following:

CAMERA ANGLE — pick one that creates drama:
  extreme close-up (ECU), low-angle hero, high-angle god-view, POV first-person, Dutch tilt, silhouette against bright background, over-the-shoulder reveal

LENS CHARACTER — pick one:
  anamorphic flare + horizontal bokeh streaks, 85mm shallow depth of field (subject sharp, world blurred), wide 24mm environmental, macro hyper-detail

LIGHTING — pick one that matches the emotion:
  harsh cold blue-white phone/screen glow in total darkness, warm amber single lamp cutting through shadow, golden hour rim light turning edges to fire, neon magenta-cyan urban spill, god rays / volumetric light beams through haze, cool silver moonlight through curtain, clinical harsh white fluorescent

COLOR GRADE — pick one:
  muted teal-orange cinematic, high-contrast vivid oversaturated, desaturated grey with single colour pop, moody dark crushed blacks with glow highlights

SUBJECT — be hyper-specific, no generic people:
  a specific object or environment or abstract visual. If a person is needed: silhouette only, or hands/feet only, or extreme close-up of one body part (eye, hand, nape). No faces. No mouth moving.

ATMOSPHERE — layer one or two:
  cigarette/incense smoke curling, steam rising from tea, rain beads on glass, dust motes in light beam, shallow bokeh bubbles of city lights, lens flare

## motionPrompt — how to write it
2–3 sentences covering:
1. CAMERA MOVE: slow push-in building tension | pull-back reveal expanding scale | smooth handheld urgency | silky orbital 360 | tilt up from feet to sky | rack focus foreground→background | whip pan cut energy | floating glide
2. SUBJECT ANIMATION: what specifically moves — phone screen notification flash, steam curling upward, curtain billowing, hands trembling, light flicker, water surface ripple, clock hands spinning
3. ATMOSPHERE MOTION: bokeh orbs drifting, dust particles floating up through beam, rain streaks accelerating, smoke wisping, shadows slowly shifting

## Visual metaphor toolkit — use when the script discusses abstract concepts
- Fatigue / cortisol / stress → red particles exploding outward, shattered glass in slow-mo, clock face melting, chaotic blurred Dhaka traffic at rush hour
- Sleep / rest / recovery → star-field timelapse overhead, still water mirror reflection, white curtain in gentle breeze, soft amber dawn light creeping across floor
- Phone addiction / screen time → blue screen glow as only light source, endless scroll reflection in eyes, notification icons raining like confetti
- Relationship tension / family → two untouched tea cups going cold, empty chair at dining table, light split between two sides of a room
- Health / energy / vitality → heartbeat pulse visualised as light wave, clear water flowing over stones, sunlight breaking through leaves in slow-mo
- Urban Bangladesh context → Dhaka neon-lit street at night shot low-angle with rickshaws blurred, steaming tea-stall closeup, CNG interior POV at golden hour, rooftop with city bokeh below

## Hard bans — NEVER include these
- Any person talking, facing camera, or with visible moving mouth
- Generic stock-photo compositions (person at laptop, couple walking, handshake)
- Plain or studio backgrounds
- Text, numbers, subtitles, logos, or UI elements in frame
- Named real celebrities or public figures`;

function tryParseArray(s: string): unknown[] | null {
  // First attempt: strict JSON
  try {
    const parsed = JSON.parse(s);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    // fall through to repair
  }
  // Second attempt: jsonrepair handles unescaped quotes, trailing commas, etc.
  try {
    const parsed = JSON.parse(jsonrepair(s));
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    // unrecoverable
  }
  return null;
}

function extractScenes(rawInput: unknown): SceneSplit[] | null {
  const input = rawInput as { scenes?: unknown };
  let candidate = input.scenes;

  // Claude sometimes JSON-encodes the array as a string; repair+parse it
  if (typeof candidate === "string") {
    candidate = tryParseArray(candidate);
  }

  if (!Array.isArray(candidate) || candidate.length === 0) return null;
  return candidate as SceneSplit[];
}

async function callSplitScenes(
  script: string,
  audioDurationSeconds: number,
  targetCount: number,
  renderStyle?: string,
): Promise<unknown> {
  // Non-cinematic styles get their own complete system prompt — never inherit cinematic rules
  const system = (renderStyle && renderStyle !== "cinematic")
    ? (RENDER_STYLE_SCENE_SYSTEMS[renderStyle] ?? SCENE_DIRECTOR_SYSTEM)
    : SCENE_DIRECTOR_SYSTEM;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    system,
    tools: [
      {
        name: "submit_scenes",
        description: "Submit the final scene breakdown",
        input_schema: {
          type: "object" as const,
          properties: {
            scenes: {
              type: "array",
              minItems: targetCount,
              maxItems: targetCount,
              items: {
                type: "object",
                properties: {
                  sceneIndex: {
                    type: "integer",
                    description: "0-based scene index",
                  },
                  textExcerpt: {
                    type: "string",
                    description: "Exact words from the script this scene covers",
                  },
                  visualPrompt: {
                    type: "string",
                    description:
                      "Hyper-specific AI image prompt: camera angle + lens + lighting + colour grade + subject + atmosphere. 9:16 vertical. No text, no talking faces, no generic compositions.",
                  },
                  motionPrompt: {
                    type: "string",
                    description:
                      "2–3 sentences: camera movement + subject animation + atmosphere motion. Cinematic and specific. No text overlays, no real people.",
                  },
                  durationHintSeconds: {
                    type: "integer",
                    minimum: 1,
                    maximum: 6,
                    description: `Whole-number seconds this scene lasts (1–6). All scenes must sum to exactly ${audioDurationSeconds}.`,
                  },
                },
                required: [
                  "sceneIndex",
                  "textExcerpt",
                  "visualPrompt",
                  "motionPrompt",
                  "durationHintSeconds",
                ],
              },
            },
          },
          required: ["scenes"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "submit_scenes" },
    messages: [
      {
        role: "user",
        content: `Split this voiceover script into exactly ${targetCount} scene${targetCount === 1 ? "" : "s"}.

SCRIPT:
${script.replace(/"/g, "“").replace(/"/g, "”")}

Total audio duration: ${audioDurationSeconds} seconds
Required scene count: exactly ${targetCount}

Rules:
- EXACTLY ${targetCount} scene${targetCount === 1 ? "" : "s"} — no more, no fewer
- textExcerpt: exact words from the script this scene covers
- visualPrompt: follow the director system instructions EXACTLY and STRICTLY — every element of your system prompt applies to every scene
- motionPrompt: 2–3 sentences covering exactly what the system prompt specifies for this style
- durationHintSeconds: integer 1–6, all scenes sum to exactly ${audioDurationSeconds}
- The "scenes" field must be a JSON array, not a stringified JSON value.
${renderStyle && renderStyle !== "cinematic" ? `\nCRITICAL: You are working in ${renderStyle.replace(/_/g, " ").toUpperCase()} style. Every single scene must strictly follow that style — do NOT use cinematic B-roll, do NOT use photorealistic photography, do NOT deviate from the style instructions.` : "\nGo bold. Make every frame scroll-stopping."}`,
      },
    ],
  });

  if (message.stop_reason === "max_tokens") {
    console.warn("[splitScenes] response was truncated — max_tokens hit");
  }

  const toolUse = message.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );
  if (!toolUse) throw new Error("Scene split returned no tool call.");
  return toolUse.input; // raw shape; extractScenes validates
}

export async function splitScenes(
  script: string,
  audioDurationSeconds: number,
  renderStyle?: string,
): Promise<SceneSplit[]> {
  const minScenes = Math.ceil(audioDurationSeconds / 6);
  const targetCount = Math.max(minScenes, Math.round(audioDurationSeconds / 5));

  for (let attempt = 1; attempt <= 3; attempt++) {
    const raw = await callSplitScenes(script, audioDurationSeconds, targetCount, renderStyle);
    const scenes = extractScenes(raw);
    if (scenes) return scenes;
    console.warn(`[splitScenes] attempt ${attempt} returned invalid shape:`, JSON.stringify(raw));
  }

  throw new Error("Scene split failed after 3 attempts: model did not return a valid scenes array.");
}
