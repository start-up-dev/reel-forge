import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execa } from "execa";

export interface ClipEntry {
  sceneIndex: number;
  path: string;
  durationHint: number | null;
}

// Step 1 — Normalize a single clip to 1080×1920 at 30fps, trimmed to durationHint.
// Returns the path of the normalized output file.
export async function normalizeClip(clip: ClipEntry, dir: string): Promise<string> {
  const outPath = join(dir, "clips", `clip_${clip.sceneIndex}_norm.mp4`);

  const args = [
    "-y",
    "-i", clip.path,
    // Scale to fit 1080×1920, pad if needed
    "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
    "-r", "30",
    "-c:v", "libx264",
    "-crf", "23",
    "-preset", "fast",
    "-an", // drop audio from source clips
    "-pix_fmt", "yuv420p",
  ];

  if (clip.durationHint !== null && clip.durationHint > 0) {
    args.push("-t", String(clip.durationHint));
  }

  args.push(outPath);

  await execa("ffmpeg", args, { stderr: "pipe" }).catch((err) => {
    throw new Error(
      `FFmpeg normalize failed for scene ${clip.sceneIndex}: ${(err as Error).message}`,
    );
  });

  return outPath;
}

// Step 1 (parallel) — Normalize all clips concurrently.
export async function normalizeAllClips(
  clips: ClipEntry[],
  dir: string,
): Promise<string[]> {
  const sorted = [...clips].sort((a, b) => a.sceneIndex - b.sceneIndex);
  return Promise.all(sorted.map((clip) => normalizeClip(clip, dir)));
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

// Step 3 — Mix voiceover (and optional BGM) onto the concatenated video.
export async function mixAudio(
  videoPath: string,
  audioPath: string,
  bgmPath: string | null,
  bgmVolume: number,
  dir: string,
): Promise<string> {
  const outPath = join(dir, "mixed.mp4");

  if (!bgmPath) {
    await execa(
      "ffmpeg",
      [
        "-y",
        "-i", videoPath,
        "-i", audioPath,
        "-map", "0:v",
        "-map", "1:a",
        "-c:v", "copy",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        outPath,
      ],
      { stderr: "pipe" },
    ).catch((err) => {
      throw new Error(`FFmpeg audio mix failed: ${(err as Error).message}`);
    });
  } else {
    const bgmVol = (bgmVolume / 100).toFixed(2);
    await execa(
      "ffmpeg",
      [
        "-y",
        "-i", videoPath,
        "-i", audioPath,
        "-i", bgmPath,
        "-filter_complex",
        `[1:a]volume=1.0[voice];[2:a]volume=${bgmVol}[bgm];[voice][bgm]amix=inputs=2:duration=first:dropout_transition=2[aout]`,
        "-map", "0:v",
        "-map", "[aout]",
        "-c:v", "copy",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        outPath,
      ],
      { stderr: "pipe" },
    ).catch((err) => {
      throw new Error(`FFmpeg BGM mix failed: ${(err as Error).message}`);
    });
  }

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
