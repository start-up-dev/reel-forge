import { rm } from "node:fs/promises";
import { eq, and } from "drizzle-orm";
import { db, videos, scenes, users, projects } from "./db.js";
import { downloadAssetsFromGCS } from "./download.js";
import {
  normalizeAllClips,
  concatenateWithTransitions,
  getTransitionPreset,
  extractAudio,
  burnSubtitles,
  probeDuration,
} from "./ffmpeg.js";
import { transcribeAudio } from "./transcribe.js";
import { generateSubtitles } from "./subtitles.js";
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

    if (video.status === "COMPLETE") {
      console.log(`[assemble] Video ${videoId} already complete — skipping`);
      return;
    }

    // Atomic claim: only this worker proceeds if it wins the PENDING→PROCESSING race.
    const [claimed] = await db
      .update(videos)
      .set({ status: "ASSEMBLY_PROCESSING", updatedAt: new Date() })
      .where(and(eq(videos.id, videoId), eq(videos.status, "ASSEMBLY_PENDING")))
      .returning({ id: videos.id });

    if (!claimed) {
      console.log(`[assemble] Video ${videoId} already claimed by another worker — skipping`);
      return;
    }

    // ── Fetch project (for language and other project-level settings) ─────────
    const [project] = await db.select().from(projects).where(eq(projects.id, video.projectId));
    if (!project) throw new Error(`Project not found for video ${videoId}`);

    // ── Fetch scenes ──────────────────────────────────────────────────────────
    const sceneRows = await db
      .select()
      .from(scenes)
      .where(eq(scenes.videoId, videoId));

    if (sceneRows.length === 0) throw new Error(`No scenes found for video ${videoId}`);

    // ── Download assets from GCS ──────────────────────────────────────────────
    console.log(`[assemble] Downloading assets for video ${videoId} (type: ${video.videoType})`);
    const assets = await downloadAssetsFromGCS(video, sceneRows);
    workDir = assets.dir;

    let finalPath: string;
    let durationSeconds: number;

    if (video.videoType === "action_reel") {
      // ── Action Reel: silent clips, no voice, no subtitles ─────────────────
      const untrimmedClips = assets.clipPaths.map((c) => ({ ...c, durationHint: null }));
      console.log(`[assemble] Normalizing ${untrimmedClips.length} clips (action_reel, no trim, loudnorm)`);
      const normalizedPaths = await normalizeAllClips(untrimmedClips, assets.dir, true);

      console.log("[assemble] Concatenating clips with transitions");
      const transitionPreset = getTransitionPreset(video.videoType, null);
      finalPath = await concatenateWithTransitions(normalizedPaths, transitionPreset, assets.dir);
      durationSeconds = await probeDuration(finalPath);
    } else if (video.videoType === "talking") {
      // ── Talking video: lipsync voice baked into clips; Whisper for subtitles ─

      // Step 1: Normalize — don't trim talking clips. The lipsync voice is baked
      // into each Grok clip, so the character finishes speaking at the natural
      // end of the clip. Trimming to Claude's estimate would cut them off mid-word.
      // EBU R128 loudness normalization applied so perceived volume is consistent across clips.
      const untrimmedClips = assets.clipPaths.map((c) => ({ ...c, durationHint: null }));
      console.log(`[assemble] Normalizing ${untrimmedClips.length} clips (talking, no trim, loudnorm)`);
      const normalizedPaths = await normalizeAllClips(untrimmedClips, assets.dir, true);

      // Probe clip durations for scene boundary computation (batches of 3)
      const clipDurations: number[] = [];
      for (let i = 0; i < normalizedPaths.length; i += 3) {
        const batch = normalizedPaths.slice(i, i + 3);
        const batchDurations = await Promise.all(batch.map(probeDuration));
        clipDurations.push(...batchDurations);
      }
      const sceneBoundaries: number[] = [];
      let cumulative = 0;
      for (let i = 0; i < clipDurations.length - 1; i++) {
        cumulative += clipDurations[i]!;
        sceneBoundaries.push(cumulative);
      }

      // Step 2: Concatenate with smooth transitions
      console.log("[assemble] Concatenating clips with transitions");
      const transitionPreset = getTransitionPreset(video.videoType, video.renderStyle ?? null);
      const concatenatedPath = await concatenateWithTransitions(normalizedPaths, transitionPreset, assets.dir);

      console.log("[assemble] Talking video — extracting audio for Whisper");
      const talkingAudioPath = await extractAudio(concatenatedPath, assets.dir);

      console.log("[assemble] Transcribing with Whisper");
      const whisperTimestamps = await transcribeAudio(talkingAudioPath, project.language);

      console.log("[assemble] Generating subtitles from Whisper timestamps");
      const subtitlesPath = await generateSubtitles(
        whisperTimestamps,
        video.subtitleStyle,
        assets.dir,
        sceneBoundaries,
      );

      console.log("[assemble] Burning subtitles");
      finalPath = await burnSubtitles(concatenatedPath, subtitlesPath, assets.dir);
      durationSeconds = await probeDuration(finalPath);
    } else {
      // ── Generated video: audio-aware assembly; clip audio preserved; Whisper for subtitles ──
      const untrimmedClips = assets.clipPaths.map((c) => ({ ...c, durationHint: null }));
      console.log(`[assemble] Normalizing ${untrimmedClips.length} clips (generated, loudnorm)`);
      const normalizedPaths = await normalizeAllClips(untrimmedClips, assets.dir, true);

      // Probe clip durations for scene boundary computation
      const clipDurations: number[] = [];
      for (let i = 0; i < normalizedPaths.length; i += 3) {
        const batch = normalizedPaths.slice(i, i + 3);
        const batchDurations = await Promise.all(batch.map(probeDuration));
        clipDurations.push(...batchDurations);
      }
      const sceneBoundaries: number[] = [];
      let cumulative = 0;
      for (let i = 0; i < clipDurations.length - 1; i++) {
        cumulative += clipDurations[i]!;
        sceneBoundaries.push(cumulative);
      }

      // Step 2: Concatenate with smooth transitions
      console.log("[assemble] Concatenating clips with transitions");
      const generatedTransitionPreset = getTransitionPreset(video.videoType, video.renderStyle ?? null);
      const concatenatedPath = await concatenateWithTransitions(normalizedPaths, generatedTransitionPreset, assets.dir);

      // Step 3: Extract audio for Whisper
      console.log("[assemble] Extracting audio for Whisper");
      const generatedAudioPath = await extractAudio(concatenatedPath, assets.dir);

      // Step 4: Transcribe with Whisper
      console.log("[assemble] Transcribing with Whisper");
      const whisperTimestamps = await transcribeAudio(generatedAudioPath, project.language);

      // Step 5: Generate subtitles
      console.log("[assemble] Generating subtitles");
      const subtitlesPath = await generateSubtitles(
        whisperTimestamps,
        video.subtitleStyle,
        assets.dir,
        sceneBoundaries,
      );

      // Step 6: Burn subtitles
      console.log("[assemble] Burning subtitles");
      finalPath = await burnSubtitles(concatenatedPath, subtitlesPath, assets.dir);
      durationSeconds = await probeDuration(finalPath);
    }

    // ── Step 6: Upload and notify ────────────────────────────────────────────
    const outputGcsPath = `videos/${videoId}/output.mp4`;
    console.log(`[assemble] Uploading final video to ${outputGcsPath}`);
    await uploadFile(outputGcsPath, finalPath, "video/mp4");

    const outputUrl = await generateSignedReadUrl(outputGcsPath, OUTPUT_URL_TTL_MINUTES);

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
      await sendVideoReadyEmail(user.email, user.firstName, user.lastName, video.title, videoPageUrl).catch(
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
        await sendVideoFailedEmail(user.email, user.firstName, user.lastName, video.title, retryUrl).catch(
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
