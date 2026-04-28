import { writeFile } from "node:fs/promises";
import { join } from "node:path";

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

type SubtitleStyle =
  | "bold_pop"
  | "word_highlight"
  | "minimal"
  | "cinematic"
  | "neon_glow"
  | "oversized_pop"
  | "grouped_bold"
  | "grouped_cinematic"
  | "karaoke";

// ASS color format: &HAABBGGRR (alpha, blue, green, red)
const COLOR_WHITE = "&H00FFFFFF";
const COLOR_BLACK = "&H00000000";
const COLOR_SHADOW = "&H80000000";
const COLOR_ACCENT_ORANGE = "&H002A5CF5"; // #f55c2a → B=2A G=5C R=F5
const COLOR_WARM_WHITE = "&H00F8F4F4";
const COLOR_TRANSPARENT = "&H00000000";

// Inline override color (no alpha prefix, trailing &) — used inside karaoke {\ } tags
const KARAOKE_ORANGE_INLINE = "2A5CF5";

function toAssTime(seconds: number): string {
  const cs = Math.round(Math.max(0, seconds) * 100);
  const h = Math.floor(cs / 360000);
  const m = Math.floor((cs % 360000) / 6000);
  const s = Math.floor((cs % 6000) / 100);
  const c = cs % 100;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(c).padStart(2, "0")}`;
}

function groupWords(words: WordTimestamp[], maxSize: number): WordTimestamp[][] {
  const groups: WordTimestamp[][] = [];
  let current: WordTimestamp[] = [];

  for (const word of words) {
    current.push(word);
    const endsWithBreak = /[.!?;:]$/.test(word.word);
    if (current.length >= maxSize || endsWithBreak) {
      groups.push(current);
      current = [];
    }
  }
  if (current.length > 0) groups.push(current);
  return groups.filter((g) => g.length > 0);
}

function escapeAssText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\{/g, "\\{").replace(/\n/g, "\\N");
}

// Lighter escape for karaoke word content — backslash NOT escaped because we
// need it for inline ASS override tags that wrap each word.
function escapeAssWord(text: string): string {
  return text.replace(/\{/g, "\\{").replace(/\n/g, "\\N");
}

function makeStyle(
  name: string,
  fontsize: number,
  primary: string,
  secondary: string,
  outline: string,
  back: string,
  bold: boolean,
  italic: boolean,
  outlineWidth: number,
  shadow: number,
  alignment: number,
  marginV: number,
): string {
  const boldVal = bold ? "-1" : "0";
  const italicVal = italic ? "-1" : "0";
  return `Style: ${name},Noto Sans,${fontsize},${primary},${secondary},${outline},${back},${boldVal},${italicVal},0,0,100,100,0,0,1,${outlineWidth},${shadow},${alignment},10,10,${marginV},0`;
}

interface AssEvent {
  start: number;
  end: number;
  text: string;
  raw?: boolean; // skip escapeAssText — used for karaoke inline override tags
}

function buildAssFile(style: string, events: AssEvent[]): string {
  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
${style}

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;

  const lines = events.map(
    (e) =>
      `Dialogue: 0,${toAssTime(e.start)},${toAssTime(e.end)},Default,,0,0,0,,${e.raw ? e.text : escapeAssText(e.text)}`,
  );

  return [header, ...lines].join("\n") + "\n";
}

// ─── Style builders ───────────────────────────────────────────────────────────

function buildBoldPop(words: WordTimestamp[]): string {
  const style = makeStyle("Default", 90, COLOR_WHITE, COLOR_WHITE, COLOR_BLACK, COLOR_SHADOW, true, false, 4, 2, 2, 200);
  const events: AssEvent[] = words.map((w) => ({ start: w.start, end: w.end, text: w.word.toUpperCase() }));
  return buildAssFile(style, events);
}

function buildWordHighlight(words: WordTimestamp[]): string {
  const style = makeStyle("Default", 80, COLOR_WHITE, COLOR_WHITE, COLOR_ACCENT_ORANGE, COLOR_SHADOW, true, false, 5, 0, 2, 200);
  const events: AssEvent[] = words.map((w) => ({ start: w.start, end: w.end, text: w.word }));
  return buildAssFile(style, events);
}

function buildMinimal(words: WordTimestamp[]): string {
  const style = makeStyle("Default", 56, COLOR_WHITE, COLOR_WHITE, COLOR_BLACK, COLOR_TRANSPARENT, false, false, 2, 0, 2, 150);
  const groups = groupWords(words, 5);
  const events: AssEvent[] = groups.map((g) => ({ start: g[0]!.start, end: g[g.length - 1]!.end, text: g.map((w) => w.word).join(" ") }));
  return buildAssFile(style, events);
}

function buildCinematic(words: WordTimestamp[]): string {
  const style = makeStyle("Default", 64, COLOR_WARM_WHITE, COLOR_WARM_WHITE, COLOR_BLACK, COLOR_TRANSPARENT, false, true, 2, 4, 2, 120);
  const groups = groupWords(words, 4);
  const events: AssEvent[] = groups.map((g) => ({ start: g[0]!.start, end: g[g.length - 1]!.end, text: g.map((w) => w.word).join(" ") }));
  return buildAssFile(style, events);
}

function buildNeonGlow(words: WordTimestamp[]): string {
  // White text with thick purple outline — the wide outline creates a bloom/glow effect
  const style = makeStyle("Default", 88, COLOR_WHITE, COLOR_WHITE, COLOR_ACCENT_ORANGE, COLOR_SHADOW, true, false, 6, 3, 2, 200);
  const events: AssEvent[] = words.map((w) => ({ start: w.start, end: w.end, text: w.word.toUpperCase() }));
  return buildAssFile(style, events);
}

function buildOversizedPop(words: WordTimestamp[]): string {
  // 120px all-caps, pushed up to 40% from bottom (marginV 768 on 1920px canvas)
  const style = makeStyle("Default", 120, COLOR_WHITE, COLOR_WHITE, COLOR_BLACK, COLOR_SHADOW, true, false, 5, 2, 2, 768);
  const events: AssEvent[] = words.map((w) => ({ start: w.start, end: w.end, text: w.word.toUpperCase() }));
  return buildAssFile(style, events);
}

function buildGroupedBold(words: WordTimestamp[]): string {
  const style = makeStyle("Default", 72, COLOR_WHITE, COLOR_WHITE, COLOR_BLACK, COLOR_SHADOW, true, false, 3, 2, 2, 180);
  const groups = groupWords(words, 3);
  const events: AssEvent[] = groups.map((g) => ({ start: g[0]!.start, end: g[g.length - 1]!.end, text: g.map((w) => w.word).join(" ") }));
  return buildAssFile(style, events);
}

function buildGroupedCinematic(words: WordTimestamp[]): string {
  const style = makeStyle("Default", 60, COLOR_WARM_WHITE, COLOR_WARM_WHITE, COLOR_BLACK, COLOR_TRANSPARENT, false, true, 2, 6, 2, 100);
  const groups = groupWords(words, 4);
  const events: AssEvent[] = groups.map((g) => ({ start: g[0]!.start, end: g[g.length - 1]!.end, text: g.map((w) => w.word).join(" ") }));
  return buildAssFile(style, events);
}

function buildKaraoke(words: WordTimestamp[]): string {
  // Groups of 4 words; active word highlighted in accent purple via inline {\ } override tags.
  // Each word in the group gets its own Dialogue event covering word.start → next word.start,
  // so the highlight switches word-by-word while the full group stays visible.
  const style = makeStyle("Default", 72, COLOR_WHITE, COLOR_WHITE, COLOR_BLACK, COLOR_SHADOW, true, false, 3, 2, 2, 180);
  const groups = groupWords(words, 4);
  const events: AssEvent[] = [];

  for (const group of groups) {
    for (let wi = 0; wi < group.length; wi++) {
      const word = group[wi]!;
      const nextWord = group[wi + 1];
      const eventEnd = nextWord ? nextWord.start : group[group.length - 1]!.end;

      const textParts = group.map((w, i) => {
        const escaped = escapeAssWord(w.word);
        if (i === wi) return `{\\c&H${KARAOKE_ORANGE_INLINE}&}${escaped}{\\r}`;
        return escaped;
      });

      events.push({ start: word.start, end: eventEnd, text: textParts.join(" "), raw: true });
    }
  }

  return buildAssFile(style, events);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function generateSubtitles(
  words: WordTimestamp[],
  style: SubtitleStyle,
  dir: string,
): Promise<string> {
  // Strip empty/whitespace-only words and entries where end <= start
  const validWords = words.filter((w) => w.word.trim() !== "" && w.end > w.start);

  let content: string;
  switch (style) {
    case "bold_pop":         content = buildBoldPop(validWords); break;
    case "word_highlight":   content = buildWordHighlight(validWords); break;
    case "minimal":          content = buildMinimal(validWords); break;
    case "cinematic":        content = buildCinematic(validWords); break;
    case "neon_glow":        content = buildNeonGlow(validWords); break;
    case "oversized_pop":    content = buildOversizedPop(validWords); break;
    case "grouped_bold":     content = buildGroupedBold(validWords); break;
    case "grouped_cinematic":content = buildGroupedCinematic(validWords); break;
    case "karaoke":          content = buildKaraoke(validWords); break;
    default: {
      const _exhaustive: never = style;
      throw new Error(`Unknown subtitle style: ${String(_exhaustive)}`);
    }
  }

  const outPath = join(dir, "subtitles.ass");
  await writeFile(outPath, content, "utf-8");
  return outPath;
}
