/**
 * Converts a string to a URL-safe slug.
 * e.g. "Hello World!" → "hello-world"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Formats a duration in seconds to "m:ss" format.
 * e.g. 83 → "1:23"
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Estimates voiceover duration from word count at ~150 wpm.
 * Returns duration in seconds.
 */
export function estimateScriptDuration(wordCount: number): number {
  const WORDS_PER_MINUTE = 150;
  return Math.ceil((wordCount / WORDS_PER_MINUTE) * 60);
}

/**
 * Extracts the filename from a GCS path.
 * e.g. "videos/abc123/audio.mp3" → "audio.mp3"
 */
export function gcsPathToFileName(path: string): string {
  return path.split("/").pop() ?? path;
}

/**
 * Formats a date as a relative string.
 * e.g. "3 days ago", "just now", "1 month ago"
 */
export function formatRelativeDate(date: Date): string {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);

  if (diffSeconds < 60) return "just now";

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60)
    return `${diffMinutes} ${diffMinutes === 1 ? "minute" : "minutes"} ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24)
    return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30)
    return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12)
    return `${diffMonths} ${diffMonths === 1 ? "month" : "months"} ago`;

  const diffYears = Math.floor(diffMonths / 12);
  return `${diffYears} ${diffYears === 1 ? "year" : "years"} ago`;
}
