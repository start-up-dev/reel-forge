import { env } from "../lib/env.js";

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
        model_id: "eleven_multilingual_v3",
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
