import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { downloadToFile } from "./storage.js";
import type { SceneRow, VideoRow } from "./db.js";

export interface DownloadedAssets {
  dir: string;
  audioPath: string;
  wordTimestampsPath: string;
  clipPaths: { sceneIndex: number; path: string; durationHint: number | null }[];
}

export async function downloadAssetsFromGCS(
  video: VideoRow,
  scenes: SceneRow[],
): Promise<DownloadedAssets> {
  const dir = join("/tmp", video.id);
  const clipsDir = join(dir, "clips");
  await mkdir(clipsDir, { recursive: true });

  const audioPath = join(dir, "audio.mp3");
  const wordTimestampsPath = join(dir, "word_timestamps.json");

  await Promise.all([
    downloadToFile(`videos/${video.id}/audio.mp3`, audioPath).catch((err) => {
      throw new Error(`Failed to download audio: ${(err as Error).message}`);
    }),
    downloadToFile(`videos/${video.id}/word_timestamps.json`, wordTimestampsPath).catch((err) => {
      throw new Error(`Failed to download word timestamps: ${(err as Error).message}`);
    }),
  ]);

  const sortedScenes = [...scenes].sort((a, b) => a.sceneIndex - b.sceneIndex);

  const clipPaths = await Promise.all(
    sortedScenes.map(async (scene) => {
      if (!scene.clipPath) {
        throw new Error(`Scene ${scene.sceneIndex} has no clip path`);
      }
      const localPath = join(clipsDir, `clip_${scene.sceneIndex}.mp4`);
      await downloadToFile(scene.clipPath, localPath).catch((err) => {
        throw new Error(
          `Failed to download clip for scene ${scene.sceneIndex}: ${(err as Error).message}`,
        );
      });
      return { sceneIndex: scene.sceneIndex, path: localPath, durationHint: scene.durationHintSeconds };
    }),
  );

  return { dir, audioPath, wordTimestampsPath, clipPaths };
}
