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

export async function getVoicesByLanguage(language?: string): Promise<VoiceInfo[]> {
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
    previewUrl: v.preview_url ?? null,
  }));

  if (!language) return voices;

  const lang = language.toLowerCase();
  const filtered = voices.filter((v) => v.language.toLowerCase() === lang);
  return filtered.length > 0 ? filtered : voices;
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
        model_id: "eleven_multilingual_v2",
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

  const { characters, character_start_times_seconds, character_end_times_seconds } =
    data.alignment;

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

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]!;
    if (ch === " " || ch === "\n") {
      if (word) {
        words.push({ word, start: wordStart, end: ends[i - 1] ?? ends[i] ?? 0 });
        word = "";
      }
    } else {
      if (!word) wordStart = starts[i] ?? 0;
      word += ch;
    }
  }
  if (word) {
    words.push({ word, start: wordStart, end: ends[chars.length - 1] ?? 0 });
  }
  return words;
}
