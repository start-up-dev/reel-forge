import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { downloadToFile } from "./storage.js";
import type { SceneRow, VideoRow } from "./db.js";

const DOWNLOAD_CONCURRENCY = 8;

export interface DownloadedAssets {
  dir: string;
  audioPath: string | null;          // always null (ElevenLabs removed; clip audio preserved)
  wordTimestampsPath: string | null; // always null
  characterBasePath: string | null;  // null unless ai_clone with a pre-generated character sheet
  clipPaths: { sceneIndex: number; path: string; durationHint: number | null; textExcerpt: string | null }[];
}

export async function downloadAssets(
  video: VideoRow,
  scenes: SceneRow[],
): Promise<DownloadedAssets> {
  const dir = join("/tmp", video.id);
  const clipsDir = join(dir, "clips");
  await mkdir(clipsDir, { recursive: true });

  // ElevenLabs removed — clip audio is preserved; no separate audio file needed.
  const audioPath: string | null = null;
  const wordTimestampsPath: string | null = null;
  let characterBasePath: string | null = null;

  const downloads: Promise<void>[] = [];

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
