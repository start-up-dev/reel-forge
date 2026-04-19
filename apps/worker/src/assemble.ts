import { rm } from "node:fs/promises";
import { readFile } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { db, videos, scenes, users } from "./db.js";
import { downloadAssetsFromGCS } from "./download.js";
import { normalizeAllClips, concatenateClips, mixAudio, burnSubtitles, probeDuration } from "./ffmpeg.js";
import { generateSubtitles, type WordTimestamp } from "./subtitles.js";
import { uploadFile, generateSignedReadUrl, deleteObject, listObjects } from "./storage.js";
import { sendVideoReadyEmail, sendVideoFailedEmail } from "./notify.js";
import { env } from "./env.js";

const OUTPUT_URL_TTL_MINUTES = 60 * 24 * 7; // 7 days (GCS v4 signed URL maximum)

export async function assembleVideo(videoId: string): Promise<void> {
  let workDir: string | null = null;

  try {
    // ── Fetch and validate video ──────────────────────────────────────────────
    const [video] = await db.select().from(videos).where(eq(videos.id, videoId));
    if (!video) throw new Error(`Video ${videoId} not found`);

    // Idempotency guard
    if (video.status === "COMPLETE") {
      console.log(`[assemble] Video ${videoId} already complete — skipping`);
      return;
    }
    if (video.status !== "ASSEMBLY_PENDING") {
      throw new Error(`Video ${videoId} is in unexpected status: ${video.status}`);
    }

    // ── Mark as processing ────────────────────────────────────────────────────
    await db
      .update(videos)
      .set({ status: "ASSEMBLY_PROCESSING", updatedAt: new Date() })
      .where(eq(videos.id, videoId));

    // ── Fetch scenes ──────────────────────────────────────────────────────────
    const sceneRows = await db
      .select()
      .from(scenes)
      .where(eq(scenes.videoId, videoId));

    if (sceneRows.length === 0) throw new Error(`No scenes found for video ${videoId}`);

    // ── Download assets from GCS ──────────────────────────────────────────────
    console.log(`[assemble] Downloading assets for video ${videoId}`);
    const assets = await downloadAssetsFromGCS(video, sceneRows);
    workDir = assets.dir;

    // ── Step 1: Normalize clips (parallel) ───────────────────────────────────
    console.log(`[assemble] Normalizing ${assets.clipPaths.length} clips`);
    const normalizedPaths = await normalizeAllClips(assets.clipPaths, assets.dir);

    // ── Step 2: Concatenate ──────────────────────────────────────────────────
    console.log("[assemble] Concatenating clips");
    const concatenatedPath = await concatenateClips(normalizedPaths, assets.dir);

    // ── Step 3: Mix audio ────────────────────────────────────────────────────
    console.log("[assemble] Mixing audio");
    const mixedPath = await mixAudio(
      concatenatedPath,
      assets.audioPath,
      assets.bgmPath,
      video.bgmVolume,
      assets.dir,
    );

    // ── Step 4: Generate subtitles ───────────────────────────────────────────
    console.log("[assemble] Generating subtitles");
    const wordTimestamps = JSON.parse(
      await readFile(assets.wordTimestampsPath, "utf-8"),
    ) as WordTimestamp[];
    const subtitlesPath = await generateSubtitles(
      wordTimestamps,
      video.subtitleStyle,
      assets.dir,
    );

    // ── Step 5: Burn subtitles ───────────────────────────────────────────────
    console.log("[assemble] Burning subtitles");
    const finalPath = await burnSubtitles(mixedPath, subtitlesPath, assets.dir);

    // ── Step 6: Upload and notify ────────────────────────────────────────────
    const outputGcsPath = `videos/${videoId}/output.mp4`;
    console.log(`[assemble] Uploading final video to ${outputGcsPath}`);
    await uploadFile(outputGcsPath, finalPath, "video/mp4");

    const outputUrl = await generateSignedReadUrl(outputGcsPath, OUTPUT_URL_TTL_MINUTES);
    const durationSeconds = await probeDuration(finalPath);

    await db
      .update(videos)
      .set({
        status: "COMPLETE",
        outputUrl,
        durationSeconds: Math.ceil(durationSeconds),
        error: null,
        updatedAt: new Date(),
      })
      .where(eq(videos.id, videoId));

    // ── Email notification ───────────────────────────────────────────────────
    const [user] = await db.select().from(users).where(eq(users.id, video.userId));
    if (user?.emailNotifyReady) {
      const videoPageUrl = `${env.APP_URL}/videos/${videoId}?step=7`;
      await sendVideoReadyEmail(user.email, user.firstName, video.title, videoPageUrl).catch(
        (err) => console.error("[assemble] Failed to send ready email:", err),
      );
    }

    // ── Cleanup intermediate GCS assets ──────────────────────────────────────
    await cleanupIntermediateAssets(videoId).catch((err) =>
      console.error("[assemble] GCS cleanup failed (non-fatal):", err),
    );

    console.log(`[assemble] Video ${videoId} assembly complete`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[assemble] Failed for video ${videoId}:`, message);

    await db
      .update(videos)
      .set({ status: "FAILED", error: message, updatedAt: new Date() })
      .where(eq(videos.id, videoId))
      .catch((dbErr) => console.error("[assemble] Failed to update video status to FAILED:", dbErr));

    // Send failure email
    try {
      const [video] = await db.select().from(videos).where(eq(videos.id, videoId));
      const [user] = video
        ? await db.select().from(users).where(eq(users.id, video.userId))
        : [];
      if (user?.emailNotifyFailed && video) {
        const retryUrl = `${env.APP_URL}/videos/${videoId}`;
        await sendVideoFailedEmail(user.email, user.firstName, video.title, retryUrl).catch(
          (emailErr) => console.error("[assemble] Failed to send failure email:", emailErr),
        );
      }
    } catch {
      // Don't let email errors mask the original error
    }

    throw err;
  } finally {
    // Always clean up /tmp regardless of success or failure
    if (workDir) {
      await rm(workDir, { recursive: true, force: true }).catch((err) =>
        console.error(`[assemble] Failed to clean up /tmp/${videoId}:`, err),
      );
    }
  }
}

async function cleanupIntermediateAssets(videoId: string): Promise<void> {
  const prefix = `videos/${videoId}/`;
  const objects = await listObjects(prefix);

  const keepPattern = /output\.mp4$/;
  const toDelete = objects.filter((key) => !keepPattern.test(key));

  await Promise.all(toDelete.map((key) => deleteObject(key)));
}
