import { writeFile } from "node:fs/promises";
import { join } from "node:path";

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

type SubtitleStyle = "bold_pop" | "word_highlight" | "minimal" | "cinematic";

// ASS color format: &HAABBGGRR (alpha, blue, green, red)
// 00 alpha = fully opaque; FF = fully transparent
const COLOR_WHITE = "&H00FFFFFF";
const COLOR_BLACK = "&H00000000";
const COLOR_SHADOW = "&H80000000"; // 50% transparent black
const COLOR_ACCENT_PURPLE = "&H00FC5C7C"; // #7C5CFC → B=FC G=5C R=7C
const COLOR_WARM_WHITE = "&H00F8F4F4"; // slightly warm white
const COLOR_TRANSPARENT = "&H00000000";

function toAssTime(seconds: number): string {
  const cs = Math.round(seconds * 100);
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
  return groups;
}

function escapeAssText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\{/g, "\\{").replace(/\n/g, "\\N");
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
  // Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour,
  //         Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle,
  //         BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
  return `Style: ${name},Arial,${fontsize},${primary},${secondary},${outline},${back},${boldVal},${italicVal},0,0,100,100,0,0,1,${outlineWidth},${shadow},${alignment},10,10,${marginV},0`;
}

interface AssEvent {
  start: number;
  end: number;
  text: string;
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
      `Dialogue: 0,${toAssTime(e.start)},${toAssTime(e.end)},Default,,0,0,0,,${escapeAssText(e.text)}`,
  );

  return [header, ...lines].join("\n") + "\n";
}

function buildBoldPop(words: WordTimestamp[]): string {
  const style = makeStyle(
    "Default",
    90,
    COLOR_WHITE,
    COLOR_WHITE,
    COLOR_BLACK,
    COLOR_SHADOW,
    true,
    false,
    4,
    2,
    2, // bottom center
    200,
  );

  const events: AssEvent[] = words.map((w) => ({
    start: w.start,
    end: w.end,
    text: w.word.toUpperCase(),
  }));

  return buildAssFile(style, events);
}

function buildWordHighlight(words: WordTimestamp[]): string {
  // Each word gets a thick accent-purple outline — creates a "highlighted" look
  const style = makeStyle(
    "Default",
    80,
    COLOR_WHITE,
    COLOR_WHITE,
    COLOR_ACCENT_PURPLE,
    COLOR_SHADOW,
    true,
    false,
    5,
    0,
    2, // bottom center
    200,
  );

  const events: AssEvent[] = words.map((w) => ({
    start: w.start,
    end: w.end,
    text: w.word,
  }));

  return buildAssFile(style, events);
}

function buildMinimal(words: WordTimestamp[]): string {
  const style = makeStyle(
    "Default",
    56,
    COLOR_WHITE,
    COLOR_WHITE,
    COLOR_BLACK,
    COLOR_TRANSPARENT,
    false,
    false,
    2,
    0,
    2, // bottom center
    150,
  );

  const groups = groupWords(words, 5);
  const events: AssEvent[] = groups.map((group) => ({
    start: group[0]!.start,
    end: group[group.length - 1]!.end,
    text: group.map((w) => w.word).join(" "),
  }));

  return buildAssFile(style, events);
}

function buildCinematic(words: WordTimestamp[]): string {
  const style = makeStyle(
    "Default",
    64,
    COLOR_WARM_WHITE,
    COLOR_WARM_WHITE,
    COLOR_BLACK,
    COLOR_TRANSPARENT,
    false,
    true, // italic
    2,
    4,
    2, // bottom center
    120,
  );

  const groups = groupWords(words, 4);
  const events: AssEvent[] = groups.map((group) => ({
    start: group[0]!.start,
    end: group[group.length - 1]!.end,
    text: group.map((w) => w.word).join(" "),
  }));

  return buildAssFile(style, events);
}

export async function generateSubtitles(
  words: WordTimestamp[],
  style: SubtitleStyle,
  dir: string,
): Promise<string> {
  let content: string;
  switch (style) {
    case "bold_pop":
      content = buildBoldPop(words);
      break;
    case "word_highlight":
      content = buildWordHighlight(words);
      break;
    case "minimal":
      content = buildMinimal(words);
      break;
    case "cinematic":
      content = buildCinematic(words);
      break;
  }

  const outPath = join(dir, "subtitles.ass");
  await writeFile(outPath, content, "utf-8");
  return outPath;
}
