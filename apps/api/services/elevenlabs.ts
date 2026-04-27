import { env } from "../lib/env.js";

// ─── Voice listing ────────────────────────────────────────────────────────────

export interface VoiceInfo {
  id: string;
  name: string;
  language: string;
  gender: string | null;
  previewUrl: string | null;
}

interface ElevenLabsVoiceListItem {
  voice_id: string;
  name: string;
  preview_url?: string;
  labels?: { language?: string; gender?: string };
}

// Voice IDs allowed per language — overrides label-based filtering when set
const LANGUAGE_VOICE_ALLOWLIST: Record<string, string[]> = {
  english: [
    "CwhRBWXzGAHq8TQ4Fs17", // Roger   — male,    laid-back casual
    "EXAVITQu4vr4xnSDxMaL", // Sarah   — female,  mature confident
    "FGY2WhTYpPnrIDTdsKH5", // Laura   — female,  quirky enthusiast
    "IKne3meq5aSn9XLyUdCD", // Charlie — male,    deep energetic
    "JBFqnCBsd6RMkjVDRZzb", // George  — male,    warm storyteller
    "TX3LPaxmHKxFdv7VOQHJ", // Liam    — male,    social media creator
    "Xb7hH8MSUJpSbSDYk0k2", // Alice   — female,  clear educator
    "XrExE9yKIg1WjnnlVkGX", // Matilda — female,  professional
    "cgSgspJ2msm6clMCkdW9", // Jessica — female,  playful bright
    "cjVigY5qzO86Huf0OWal", // Eric    — male,    smooth trustworthy
    "hpp4J3VqNfWAUOO0d1Us", // Bella   — female,  professional bright
    "iP95p4xoKVk53GoZ742B", // Chris   — male,    charming
    "nPczCjzI2devNBz1zQrb", // Brian   — male,    deep resonant
    "onwK4e9ZLuTAKqWW03F9", // Daniel  — male,    broadcaster
    "pFZP5JQG7iQjIQuC4Bku", // Lily    — female,  velvety actress
    "pNInz6obpgDQGcFmaJgB", // Adam    — male,    dominant firm
    "pqHfZKP75CvOlQylNhV4", // Bill    — male,    wise mature
  ],
  bengali: ["5KpHC9wNrzTPFRQHQaQc", "22jmlXsxSX5mWjsybkYr"],
};

const LANGUAGE_SAMPLE_TEXTS: Record<string, string> = {
  bengali: "আমি আপনার ভিডিওর জন্য কথা বলব। আমার কণ্ঠস্বর শুনুন।",
  english: "Hi, I'll be the voice for your video. Here's how I sound.",
  hindi: "मैं आपके वीडियो के लिए बोलूंगा। मेरी आवाज़ सुनें।",
  arabic: "سأتحدث لصالح مقطع الفيديو الخاص بك. استمع إلى صوتي.",
  spanish: "Hablaré para tu vídeo. Escucha cómo sueno.",
  french: "Je vais parler pour votre vidéo. Écoutez ma voix.",
};

export async function getVoicesByLanguage(
  language?: string,
): Promise<VoiceInfo[]> {
  const res = await fetch("https://api.elevenlabs.io/v1/voices", {
    headers: { "xi-api-key": env.ELEVENLABS_API_KEY },
  });
  if (!res.ok) throw new Error(`ElevenLabs voices fetch failed: ${res.status}`);
  const data = (await res.json()) as { voices: ElevenLabsVoiceListItem[] };

  const voices: VoiceInfo[] = data.voices.map((v) => ({
    id: v.voice_id,
    name: v.name,
    language: v.labels?.language ?? "English",
    gender: v.labels?.gender ?? null,
    previewUrl: null, // previews generated on-demand via /assets/voices/:id/preview
  }));

  if (!language) return voices;

  const lang = language.toLowerCase();
  const allowlist = LANGUAGE_VOICE_ALLOWLIST[lang];
  if (allowlist) {
    return voices.filter((v) => allowlist.includes(v.id));
  }
  return voices.filter((v) => v.language.toLowerCase() === lang);
}

export async function generateVoicePreview(
  voiceId: string,
  language?: string,
): Promise<Buffer> {
  const lang = (language ?? "english").toLowerCase();
  const text = LANGUAGE_SAMPLE_TEXTS[lang] ?? LANGUAGE_SAMPLE_TEXTS["english"]!;

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": env.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_v3",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        output_format: "mp3_44100_128",
      }),
    },
  );

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`ElevenLabs preview failed ${res.status}: ${txt}`);
  }

  return Buffer.from(await res.arrayBuffer());
}

// ─── Voiceover generation ─────────────────────────────────────────────────────

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

export interface VoiceoverResult {
  audioBuffer: Buffer;
  wordTimestamps: WordTimestamp[];
  durationSeconds: number;
}

interface ElevenLabsResponse {
  audio_base64: string;
  alignment: {
    characters: string[];
    character_start_times_seconds: number[];
    character_end_times_seconds: number[];
  };
}

export async function generateVoiceover(
  script: string,
  voiceId: string,
): Promise<VoiceoverResult> {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps`,
    {
      method: "POST",
      headers: {
        "xi-api-key": env.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: script,
        model_id: "eleven_v3",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        output_format: "mp3_44100_128",
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`ElevenLabs API error ${response.status}: ${text}`);
  }

  const data = (await response.json()) as ElevenLabsResponse;
  const audioBuffer = Buffer.from(data.audio_base64, "base64");

  const {
    characters,
    character_start_times_seconds,
    character_end_times_seconds,
  } = data.alignment;

  const wordTimestamps = charsToWords(
    characters,
    character_start_times_seconds,
    character_end_times_seconds,
  );

  const durationSeconds = Math.ceil(
    character_end_times_seconds[character_end_times_seconds.length - 1] ?? 0,
  );

  return { audioBuffer, wordTimestamps, durationSeconds };
}

function charsToWords(
  chars: string[],
  starts: number[],
  ends: number[],
): WordTimestamp[] {
  const words: WordTimestamp[] = [];
  let word = "";
  let wordStart = 0;
  let lastEnd = 0;

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]!;
    const s = starts[i];
    const e = ends[i];

    // Skip characters with missing timestamps — avoids phantom words at t=0
    if (s === undefined || e === undefined) continue;

    if (ch === " " || ch === "\n") {
      if (word) {
        words.push({ word, start: wordStart, end: lastEnd });
        word = "";
      }
    } else {
      if (!word) wordStart = s;
      word += ch;
      lastEnd = e;
    }
  }
  if (word) {
    words.push({ word, start: wordStart, end: lastEnd });
  }
  return words;
}
