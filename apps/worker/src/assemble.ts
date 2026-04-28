import { rm } from "node:fs/promises";
import { readFile } from "node:fs/promises";
import { eq, and } from "drizzle-orm";
import { db, videos, scenes, users } from "./db.js";
import { downloadAssetsFromGCS } from "./download.js";
import {
  normalizeAllClips,
  concatenateClips,
  mixAudio,
  speedAudio,
  extractAudio,
  burnSubtitles,
  probeDuration,
} from "./ffmpeg.js";
import { transcribeAudio } from "./transcribe.js";
import { generateSubtitles, type WordTimestamp } from "./subtitles.js";
import { uploadFile, generateSignedReadUrl, deleteObject, listObjects } from "./storage.js";
import { sendVideoReadyEmail, sendVideoFailedEmail } from "./notify.js";
import { env } from "./env.js";

const OUTPUT_URL_TTL_MINUTES = 60 * 24 * 7; // 7 days (GCS v4 signed URL maximum)

// Derives each scene's clip duration from ElevenLabs word timestamps so visual
// cuts align with the voiceover rather than Claude's rough durationHint estimates.
// Scenes are processed in order; word counts are consumed sequentially.
function computeSceneDurationsFromTimestamps(
  clipPaths: { sceneIndex: number; durationHint: number | null; textExcerpt: string | null }[],
  wordTimestamps: WordTimestamp[],
): Map<number, number> {
  const durations = new Map<number, number>();
  const sorted = [...clipPaths].sort((a, b) => a.sceneIndex - b.sceneIndex);
  let cursor = 0;

  for (const clip of sorted) {
    if (!clip.textExcerpt || cursor >= wordTimestamps.length) {
      if (clip.durationHint !== null) durations.set(clip.sceneIndex, clip.durationHint);
      continue;
    }

    const wordCount = clip.textExcerpt.trim().split(/\s+/).filter(Boolean).length;
    const take = Math.min(wordCount, wordTimestamps.length - cursor);
    if (take === 0) {
      if (clip.durationHint !== null) durations.set(clip.sceneIndex, clip.durationHint);
      continue;
    }

    const slice = wordTimestamps.slice(cursor, cursor + take);
    const start = slice[0]!.start;
    const end = slice[slice.length - 1]!.end;
    durations.set(clip.sceneIndex, Math.max(1, end - start));
    cursor += take;
  }

  return durations;
}

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

    if (video.videoType === "talking") {
      // ── Talking video: lipsync voice baked into clips; Whisper for subtitles ─

      // Step 1: Normalize — don't trim talking clips. The lipsync voice is baked
      // into each Grok clip, so the character finishes speaking at the natural
      // end of the clip. Trimming to Claude's estimate would cut them off mid-word.
      const untrimmedClips = assets.clipPaths.map((c) => ({ ...c, durationHint: null }));
      console.log(`[assemble] Normalizing ${untrimmedClips.length} clips (talking, no trim)`);
      const normalizedPaths = await normalizeAllClips(untrimmedClips, assets.dir);

      // Step 2: Concatenate
      console.log("[assemble] Concatenating clips");
      const concatenatedPath = await concatenateClips(normalizedPaths, assets.dir);

      console.log("[assemble] Talking video — extracting audio for Whisper");
      const talkingAudioPath = await extractAudio(concatenatedPath, assets.dir);

      console.log("[assemble] Transcribing with Whisper");
      const whisperTimestamps = await transcribeAudio(talkingAudioPath);

      console.log("[assemble] Generating subtitles from Whisper timestamps");
      const subtitlesPath = await generateSubtitles(
        whisperTimestamps,
        video.subtitleStyle,
        assets.dir,
      );

      console.log("[assemble] Burning subtitles");
      finalPath = await burnSubtitles(concatenatedPath, subtitlesPath, assets.dir);
      durationSeconds = await probeDuration(finalPath);
    } else {
      // ── Generated video: ElevenLabs voiceover; Grok clips are visuals only ──
      if (!video.durationSeconds) {
        throw new Error(`Video ${videoId} has no durationSeconds — voice generation must complete first`);
      }

      // Load word timestamps first — they drive clip durations so cuts align
      // with the voiceover, not Claude's rough estimates.
      console.log("[assemble] Loading word timestamps");
      let wordTimestamps = JSON.parse(
        await readFile(assets.wordTimestampsPath!, "utf-8"),
      ) as WordTimestamp[];

      let voiceAudioPath = assets.audioPath!;
      let audioDurationSeconds = video.durationSeconds;

      if (video.voiceSpeed !== 1.0) {
        console.log(`[assemble] Applying voice speed ${video.voiceSpeed}x`);
        voiceAudioPath = await speedAudio(voiceAudioPath, video.voiceSpeed, assets.dir);
        audioDurationSeconds = await probeDuration(voiceAudioPath);
        const invSpeed = 1 / video.voiceSpeed;
        wordTimestamps = wordTimestamps.map((w) => ({
          ...w,
          start: w.start * invSpeed,
          end: w.end * invSpeed,
        }));
      }

      // Compute per-scene clip durations from word timestamps so visual cuts
      // align with the actual voiceover pacing, not Claude's estimates.
      const sceneDurations = computeSceneDurationsFromTimestamps(assets.clipPaths, wordTimestamps);
      const timedClips = assets.clipPaths.map((clip) => ({
        ...clip,
        durationHint: sceneDurations.get(clip.sceneIndex) ?? clip.durationHint,
      }));

      // Step 1: Normalize — each clip trimmed to its timestamp-derived duration
      console.log(`[assemble] Normalizing ${timedClips.length} clips (generated)`);
      const normalizedPaths = await normalizeAllClips(timedClips, assets.dir);

      // Step 2: Concatenate
      console.log("[assemble] Concatenating clips");
      const concatenatedPath = await concatenateClips(normalizedPaths, assets.dir);

      // Step 3: Mix ElevenLabs voice over video; Grok clip audio fully muted —
      // the clip audio contains AI-generated ambient noise we don't want.
      console.log("[assemble] Mixing audio");
      const mixedPath = await mixAudio(
        concatenatedPath,
        voiceAudioPath,
        audioDurationSeconds,
        assets.dir,
        0,
      );

      // Step 4: Generate subtitles
      console.log("[assemble] Generating subtitles");
      const subtitlesPath = await generateSubtitles(
        wordTimestamps,
        video.subtitleStyle,
        assets.dir,
      );

      // Step 5: Burn subtitles
      console.log("[assemble] Burning subtitles");
      finalPath = await burnSubtitles(mixedPath, subtitlesPath, assets.dir);
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
