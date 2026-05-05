import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { downloadToFile } from "./storage.js";
import type { SceneRow, VideoRow } from "./db.js";

const DOWNLOAD_CONCURRENCY = 8;

export interface DownloadedAssets {
  dir: string;
  audioPath: string | null;          // null for talking videos (no ElevenLabs audio)
  wordTimestampsPath: string | null; // null for talking videos
  characterBasePath: string | null;  // null unless cartoon/mascot with a pre-generated character sheet
  clipPaths: { sceneIndex: number; path: string; durationHint: number | null; textExcerpt: string | null }[];
}

export async function downloadAssetsFromGCS(
  video: VideoRow,
  scenes: SceneRow[],
): Promise<DownloadedAssets> {
  const dir = join("/tmp", video.id);
  const clipsDir = join(dir, "clips");
  await mkdir(clipsDir, { recursive: true });

  const isVoiceless = video.videoType === "talking" || video.videoType === "action_reel";
  let audioPath: string | null = null;
  let wordTimestampsPath: string | null = null;
  let characterBasePath: string | null = null;

  const downloads: Promise<void>[] = [];

  if (!isVoiceless) {
    audioPath = join(dir, "audio.mp3");
    wordTimestampsPath = join(dir, "word_timestamps.json");
    downloads.push(
      downloadToFile(`videos/${video.id}/audio.mp3`, audioPath).catch((err) => {
        throw new Error(`Failed to download audio: ${(err as Error).message}`);
      }),
      downloadToFile(`videos/${video.id}/word_timestamps.json`, wordTimestampsPath).catch((err) => {
        throw new Error(`Failed to download word timestamps: ${(err as Error).message}`);
      }),
    );
  }

  if (video.characterBaseGcsPath) {
    characterBasePath = join(dir, "character_base.png");
    downloads.push(
      downloadToFile(video.characterBaseGcsPath, characterBasePath).catch((err) => {
        console.warn(`[download] character_base.png not downloaded: ${(err as Error).message}`);
        characterBasePath = null;
      }),
    );
  }

  await Promise.all(downloads);

  const sortedScenes = [...scenes].sort((a, b) => a.sceneIndex - b.sceneIndex);

  const clipPaths: DownloadedAssets["clipPaths"] = [];
  for (let i = 0; i < sortedScenes.length; i += DOWNLOAD_CONCURRENCY) {
    const batch = sortedScenes.slice(i, i + DOWNLOAD_CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(async (scene) => {
        if (!scene.clipPath) {
          throw new Error(`Scene ${scene.sceneIndex} has no clip path`);
        }
        const localPath = join(clipsDir, `clip_${scene.sceneIndex}.mp4`);
        await downloadToFile(scene.clipPath, localPath).catch((err) => {
          throw new Error(
            `Failed to download clip for scene ${scene.sceneIndex}: ${(err as Error).message}`,
          );
        });
        return { sceneIndex: scene.sceneIndex, path: localPath, durationHint: scene.durationHintSeconds, textExcerpt: scene.textExcerpt ?? null };
      }),
    );
    clipPaths.push(...batchResults);
  }

  return { dir, audioPath, wordTimestampsPath, characterBasePath, clipPaths };
}
