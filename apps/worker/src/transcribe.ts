import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { env } from "./env.js";
import type { WordTimestamp } from "./subtitles.js";

interface WhisperWord {
  word: string;
  start: number;
  end: number;
}

interface WhisperResponse {
  words?: WhisperWord[];
}

// Maps app language codes (BCP-47 / IETF tags) to Whisper ISO 639-1 codes.
// Without an explicit hint Whisper auto-detects and frequently confuses Bengali
// with Hindi (both are Indo-Aryan with similar phonetics), producing Devanagari
// output instead of Bengali script.
const WHISPER_LANGUAGE_MAP: Record<string, string> = {
  bn: "bn", // Bengali
  hi: "hi", // Hindi
  ur: "ur", // Urdu
  ar: "ar", // Arabic
  zh: "zh", // Chinese
  ja: "ja", // Japanese
  ko: "ko", // Korean
  fr: "fr", // French
  de: "de", // German
  es: "es", // Spanish
  pt: "pt", // Portuguese
  ru: "ru", // Russian
  tr: "tr", // Turkish
  vi: "vi", // Vietnamese
  th: "th", // Thai
  id: "id", // Indonesian
  nl: "nl", // Dutch
  it: "it", // Italian
  pl: "pl", // Polish
  sv: "sv", // Swedish
};

// Transcribe an audio file via OpenAI Whisper and return word-level timestamps.
// Returns an empty array (no subtitles) if OPENAI_API_KEY is not configured.
export async function transcribeAudio(audioPath: string, language?: string): Promise<WordTimestamp[]> {
  if (!env.OPENAI_API_KEY) {
    console.warn("[transcribe] OPENAI_API_KEY not set — skipping Whisper, no subtitles for talking video");
    return [];
  }

  const audioBuffer = await readFile(audioPath);
  // Convert Node Buffer to ArrayBuffer so Blob/File constructors accept it
  const audioArrayBuffer = audioBuffer.buffer.slice(audioBuffer.byteOffset, audioBuffer.byteOffset + audioBuffer.byteLength) as ArrayBuffer;
  const audioBlob = new Blob([audioArrayBuffer], { type: "audio/mpeg" });
  const audioFile = new File([audioBlob], basename(audioPath), { type: "audio/mpeg" });

  const form = new FormData();
  form.append("file", audioFile);
  form.append("model", "whisper-1");
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "word");

  // Pin the language so Whisper never auto-detects — prevents Bengali→Hindi misclassification
  const langCode = language ? (WHISPER_LANGUAGE_MAP[language.split("-")[0]!] ?? language.split("-")[0]!) : null;
  if (langCode && langCode !== "en") form.append("language", langCode);

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Whisper API error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as WhisperResponse;
  if (!data.words?.length) return [];

  return data.words.map((w) => ({
    word: w.word.trim(), // Whisper often prepends a space to each word
    start: w.start,
    end: w.end,
  }));
}
