import { writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { execa } from "execa";

const NORMALIZE_CONCURRENCY = 3;

export interface ClipEntry {
  sceneIndex: number;
  path: string;
  durationHint: number | null;
}

// Probe whether a file has at least one audio stream.
export async function probeHasAudio(filePath: string): Promise<boolean> {
  const result = await execa(
    "ffprobe",
    [
      "-v", "error",
      "-select_streams", "a:0",
      "-show_entries", "stream=codec_type",
      "-of", "default=noprint_wrappers=1:nokey=1",
      filePath,
    ],
    { reject: false },
  );
  return result.stdout.trim() === "audio";
}

// Step 1 — Normalize a single clip to 1080×1920 at 30fps, trimmed to durationHint.
// Clips without an audio track (common for Grok generated clips) get a silent audio stream
// so that concatenation and mixing always work with a consistent stream layout.
export async function normalizeClip(clip: ClipEntry, dir: string, normalizeAudio = false): Promise<string> {
  const outPath = join(dir, "clips", `clip_${clip.sceneIndex}_norm.mp4`);
  const hasAudio = await probeHasAudio(clip.path);

  const args: string[] = ["-y", "-i", clip.path];

  if (!hasAudio) {
    // Inject a silent audio source; -shortest stops it when the video stream ends
    args.push("-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo");
  }

  args.push(
    "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
    "-r", "30",
    "-c:v", "libx264",
    "-crf", "23",
    "-preset", "fast",
  );

  // EBU R128 loudness normalization — only when clip has real audio to normalize
  if (normalizeAudio && hasAudio) {
    args.push("-af", "loudnorm=I=-23:TP=-1.5:LRA=11");
  }

  args.push(
    "-map", "0:v:0",
    "-map", hasAudio ? "0:a:0" : "1:a:0",
    "-c:a", "aac",
    "-b:a", "192k",
    "-ar", "44100",
    "-pix_fmt", "yuv420p",
  );

  if (clip.durationHint !== null && clip.durationHint > 0) {
    args.push("-t", String(clip.durationHint));
  }

  if (!hasAudio) {
    args.push("-shortest");
  }

  args.push(outPath);

  await execa("ffmpeg", args, { stderr: "pipe" }).catch((err) => {
    throw new Error(
      `FFmpeg normalize failed for scene ${clip.sceneIndex}: ${(err as Error).message}`,
    );
  });

  // Free /tmp space (Cloud Run /tmp is memory-backed; raw clip no longer needed)
  await unlink(clip.path).catch(() => {});

  return outPath;
}

// Step 1 (concurrency-limited) — Normalize clips NORMALIZE_CONCURRENCY at a time.
// Unbounded Promise.all exhausts RAM on Cloud Run (each FFmpeg encode ~350 MB).
export async function normalizeAllClips(
  clips: ClipEntry[],
  dir: string,
  normalizeAudio = false,
): Promise<string[]> {
  const sorted = [...clips].sort((a, b) => a.sceneIndex - b.sceneIndex);
  const results: string[] = [];
  for (let i = 0; i < sorted.length; i += NORMALIZE_CONCURRENCY) {
    const batch = sorted.slice(i, i + NORMALIZE_CONCURRENCY);
    const batchResults = await Promise.all(batch.map((clip) => normalizeClip(clip, dir, normalizeAudio)));
    results.push(...batchResults);
  }
  return results;
}

export type TransitionPreset = { transition: string; duration: number };

const TRANSITION_PRESETS: { condition: (vt: string, rs: string | null) => boolean; preset: TransitionPreset }[] = [
  { condition: (vt) => vt === "talking",                                                                  preset: { transition: "fade",    duration: 0.3 } },
  { condition: (vt) => vt === "action_reel",                                                              preset: { transition: "fade",    duration: 0.2 } },
  { condition: (vt, rs) => vt === "generated" && (rs === "cinematic" || rs === "stock_footage"),          preset: { transition: "fade",    duration: 0.5 } },
  { condition: (vt, rs) => vt === "generated" && (rs === "cartoon" || rs === "animation_2d"),             preset: { transition: "dissolve", duration: 0.4 } },
  { condition: (vt, rs) => vt === "generated" && rs === "motion_graphics",                                preset: { transition: "zoomin",  duration: 0.3 } },
  { condition: (vt, rs) => vt === "generated" && rs === "mascot",                                         preset: { transition: "dissolve", duration: 0.4 } },
  { condition: (vt, rs) => vt === "generated" && rs === "whiteboard",                                     preset: { transition: "fade",    duration: 0.3 } },
];

export function getTransitionPreset(videoType: string, renderStyle: string | null): TransitionPreset {
  for (const { condition, preset } of TRANSITION_PRESETS) {
    if (condition(videoType, renderStyle)) return preset;
  }
  return { transition: "fade", duration: 0.4 };
}

// Step 2 — Concatenate with xfade/acrossfade transitions between clips.
// CRF 18 here (not 23) because burnSubtitles re-encodes this output — preserves quality headroom.
export async function concatenateWithTransitions(
  normalizedPaths: string[],
  preset: TransitionPreset,
  dir: string,
): Promise<string> {
  if (normalizedPaths.length === 0) throw new Error("No clips to concatenate");

  const outPath = join(dir, "concatenated.mp4");

  if (normalizedPaths.length === 1) {
    await execa("ffmpeg", ["-y", "-i", normalizedPaths[0]!, "-c", "copy", outPath], { stderr: "pipe" }).catch((err) => {
      throw new Error(`FFmpeg copy single clip failed: ${(err as Error).message}`);
    });
    return outPath;
  }

  // Probe durations in batches to stay within Cloud Run memory limits
  const durations: number[] = [];
  for (let i = 0; i < normalizedPaths.length; i += NORMALIZE_CONCURRENCY) {
    const batch = normalizedPaths.slice(i, i + NORMALIZE_CONCURRENCY);
    const batchDurations = await Promise.all(batch.map(probeDuration));
    durations.push(...batchDurations);
  }

  // Clamp guard: prevents xfade offset from going negative when clips are very short
  const minDuration = Math.min(...durations);
  let transitionDuration = preset.duration;
  if (transitionDuration >= minDuration) {
    transitionDuration = minDuration * 0.4;
  }

  const N = normalizedPaths.length;
  const filterParts: string[] = [];

  for (let i = 1; i < N; i++) {
    const prevVLabel = i === 1 ? "0:v" : `v${i - 1}`;
    const nextVLabel = i === N - 1 ? "vfinal" : `v${i}`;
    // offset = sum(durations[0..i-1]) - i * transitionDuration, clamped > 0
    const sumPrev = durations.slice(0, i).reduce((a, b) => a + b, 0);
    const offset = Math.max(sumPrev - i * transitionDuration, 0.001);
    filterParts.push(
      `[${prevVLabel}][${i}:v]xfade=transition=${preset.transition}:duration=${transitionDuration.toFixed(3)}:offset=${offset.toFixed(3)}[${nextVLabel}]`,
    );

    const prevALabel = i === 1 ? "0:a" : `a${i - 1}`;
    const nextALabel = i === N - 1 ? "afinal" : `a${i}`;
    filterParts.push(
      `[${prevALabel}][${i}:a]acrossfade=d=${transitionDuration.toFixed(3)}:c1=tri:c2=tri[${nextALabel}]`,
    );
  }

  const inputArgs = normalizedPaths.flatMap((p) => ["-i", p]);

  await execa(
    "ffmpeg",
    [
      "-y",
      ...inputArgs,
      "-filter_complex", filterParts.join(";"),
      "-map", "[vfinal]",
      "-map", "[afinal]",
      "-c:v", "libx264",
      "-crf", "18",
      "-preset", "fast",
      "-c:a", "aac",
      "-b:a", "192k",
      "-ar", "44100",
      "-pix_fmt", "yuv420p",
      outPath,
    ],
    { stderr: "pipe" },
  ).catch((err) => {
    throw new Error(`FFmpeg transitions concat failed: ${(err as Error).message}`);
  });

  return outPath;
}

// Step 2 — Concatenate normalized clips into a single video.
export async function concatenateClips(
  normalizedPaths: string[],
  dir: string,
): Promise<string> {
  const listPath = join(dir, "clips_list.txt");
  const listContent = normalizedPaths
    .map((p) => `file '${p.replace(/'/g, "'\\''")}'`)
    .join("\n");
  await writeFile(listPath, listContent, "utf-8");

  const outPath = join(dir, "concatenated.mp4");
  await execa(
    "ffmpeg",
    ["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", outPath],
    { stderr: "pipe" },
  ).catch((err) => {
    throw new Error(`FFmpeg concat failed: ${(err as Error).message}`);
  });

  return outPath;
}

// Step 5 — Burn subtitles into the mixed video and produce the final MP4.
// Uses H.264 CRF 23 + AAC 192k for final output.
// Falls back to no subtitles if libass is not compiled into FFmpeg.
export async function burnSubtitles(
  mixedPath: string,
  subtitlesPath: string,
  dir: string,
): Promise<string> {
  const outPath = join(dir, "final.mp4");

  // FFmpeg 8.x requires the explicit `filename=` key for the ass filter.
  // Colons in the path must also be escaped since `:` separates filter options.
  const escapedSubs = subtitlesPath.replace(/\\/g, "\\\\").replace(/:/g, "\\:");

  const result = await execa(
    "ffmpeg",
    [
      "-y",
      "-i", mixedPath,
      "-vf", `ass=filename=${escapedSubs}`,
      "-c:v", "libx264",
      "-crf", "23",
      "-preset", "fast",
      "-c:a", "copy",
      "-movflags", "+faststart",
      outPath,
    ],
    { stderr: "pipe", reject: false },
  );

  if (result.exitCode !== 0) {
    const stderr = result.stderr ?? "";
    if (stderr.includes("No such filter") || stderr.includes("Filter not found")) {
      // libass not compiled in — re-encode without subtitles
      console.warn("[ffmpeg] libass not available — outputting video without subtitles");
      await execa(
        "ffmpeg",
        [
          "-y",
          "-i", mixedPath,
          "-c:v", "libx264",
          "-crf", "23",
          "-preset", "fast",
          "-c:a", "copy",
          "-movflags", "+faststart",
          outPath,
        ],
        { stderr: "pipe" },
      ).catch((err) => {
        throw new Error(`FFmpeg final encode failed: ${(err as Error).message}`);
      });
    } else {
      throw new Error(`FFmpeg subtitle burn failed: ${result.stderr}`);
    }
  }

  return outPath;
}

// Extract audio track from a video file as MP3 — used for Whisper transcription.
export async function extractAudio(videoPath: string, dir: string): Promise<string> {
  const outPath = join(dir, "concat_audio.mp3");
  await execa(
    "ffmpeg",
    ["-y", "-i", videoPath, "-vn", "-c:a", "libmp3lame", "-b:a", "192k", outPath],
    { stderr: "pipe" },
  ).catch((err) => {
    throw new Error(`FFmpeg audio extract failed: ${(err as Error).message}`);
  });
  return outPath;
}

// Final encode pass for talking videos (no subtitle filter needed).
// Adds movflags faststart for streaming compatibility.
export async function encodeVideoFinal(inputPath: string, dir: string): Promise<string> {
  const outPath = join(dir, "final.mp4");
  await execa(
    "ffmpeg",
    [
      "-y",
      "-i", inputPath,
      "-c:v", "libx264",
      "-crf", "23",
      "-preset", "fast",
      "-c:a", "copy",
      "-movflags", "+faststart",
      outPath,
    ],
    { stderr: "pipe" },
  ).catch((err) => {
    throw new Error(`FFmpeg final encode failed: ${(err as Error).message}`);
  });
  return outPath;
}

// Probe the duration of a video file in seconds.
export async function probeDuration(filePath: string): Promise<number> {
  const { stdout } = await execa("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    filePath,
  ]);
  return parseFloat(stdout.trim()) || 0;
}
