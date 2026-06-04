import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "../lib/db/index.js";
import { brandProfiles, clipRequests, contentPlans, postSchedules, scenes, socialAccounts, users, videos } from "../lib/db/schema.js";
import { emitPlanEvent } from "../lib/plan-event-bus.js";
import { generateSignedReadUrl } from "../lib/storage.js";
import { uploadReelToFacebook } from "./facebook.js";
import { generateDialogueSegments, generatePostCaption, generateScript, generateTitle, splitScenes } from "./claude.js";
import { sendBatchCompleteEmail } from "./email.js";
import type { TopicEntry } from "./claude.js";

// Simple semaphore for capping concurrent video generations
function makeSemaphore(max: number) {
  let running = 0;
  const queue: Array<() => void> = [];

  function release() {
    running--;
    const next = queue.shift();
    if (next) { running++; next(); }
  }

  return function acquire<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const run = () => {
        fn().then(resolve, reject).finally(release);
      };
      if (running < max) { running++; run(); }
      else { queue.push(run); }
    });
  };
}

async function waitForCompletion(videoId: string, timeoutMs = 30 * 60 * 1000): Promise<string> {
  const pollInterval = 30_000;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const [row] = await db
      .select({ status: videos.status })
      .from(videos)
      .where(eq(videos.id, videoId))
      .limit(1);

    if (!row) return "FAILED";
    if (row.status === "COMPLETE" || row.status === "FAILED") return row.status;

    await new Promise<void>((r) => setTimeout(r, pollInterval));
  }
  return "FAILED";
}

function computeScheduledAt(weekStartDate: string, day: number, slot: number): Date {
  // weekStartDate is a Monday (YYYY-MM-DD). day 1=Mon…7=Sun, slot 1=9am, 2=14pm, 3=17pm UTC.
  const slotHours = [9, 14, 17, 20];
  const hour = slotHours[Math.min(slot - 1, slotHours.length - 1)] ?? 9;
  const base = new Date(`${weekStartDate}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + (day - 1));
  base.setUTCHours(hour, 0, 0, 0);
  return base;
}

// Posts a single completed video to Facebook immediately.
// Always writes a postSchedules row (posted or failed) so the UI never shows a
// "Ready" ghost — the only exception is when the plan has no connected channel,
// in which case we can't satisfy the NOT NULL socialAccountId FK.
export async function postSingleVideoToFacebook(planId: string, videoId: string): Promise<void> {
  try {
    const [plan] = await db
      .select()
      .from(contentPlans)
      .where(eq(contentPlans.id, planId))
      .limit(1);

    if (!plan || plan.postType === "manual") return;

    // Skip if already posted successfully (idempotent on retry)
    const [alreadyPosted] = await db
      .select({ id: postSchedules.id })
      .from(postSchedules)
      .where(and(eq(postSchedules.videoId, videoId), eq(postSchedules.status, "posted")))
      .limit(1);
    if (alreadyPosted) return;

    const [account] = await db
      .select()
      .from(socialAccounts)
      .where(eq(socialAccounts.brandProfileId, plan.brandProfileId))
      .limit(1);

    if (!account) {
      // No channel connected — can't insert postSchedule (NOT NULL FK). Log and bail.
      console.warn(`[postSingleVideoToFacebook] no social account for brand ${plan.brandProfileId}, skipping video ${videoId}`);
      return;
    }

    const [video] = await db
      .select()
      .from(videos)
      .where(eq(videos.id, videoId))
      .limit(1);

    if (!video?.outputUrl) {
      await db.insert(postSchedules).values({
        videoId,
        socialAccountId: account.id,
        postType: plan.postType as "draft" | "scheduled",
        scheduledAt: null,
        platformPostId: null,
        status: "failed",
        errorMessage: "Video has no output URL after assembly",
        updatedAt: new Date(),
      });
      return;
    }

    const topics = Array.isArray(plan.topics) ? (plan.topics as TopicEntry[]) : [];
    const topic = topics.find((t) => t.title === video.title);
    const scheduledAt = topic
      ? computeScheduledAt(plan.weekStartDate, topic.day, topic.slot)
      : undefined;

    let videoUrl = video.outputUrl;
    if (!videoUrl.startsWith("http")) {
      videoUrl = await generateSignedReadUrl(videoUrl, 30);
    }

    let videoBuffer: Buffer;
    try {
      const videoRes = await fetch(videoUrl);
      if (!videoRes.ok) {
        throw new Error(`R2 download failed (HTTP ${videoRes.status})`);
      }
      videoBuffer = Buffer.from(await videoRes.arrayBuffer());
    } catch (err) {
      await db.insert(postSchedules).values({
        videoId,
        socialAccountId: account.id,
        postType: plan.postType as "draft" | "scheduled",
        scheduledAt: scheduledAt ?? null,
        platformPostId: null,
        status: "failed",
        errorMessage: err instanceof Error ? err.message : "Failed to download video for posting",
        updatedAt: new Date(),
      });
      return;
    }

    const [brandRow] = await db
      .select()
      .from(brandProfiles)
      .where(eq(brandProfiles.id, plan.brandProfileId))
      .limit(1);

    let caption = video.title;
    if (topic && video.script && brandRow) {
      try {
        caption = await generatePostCaption(brandRow, topic, video.script);
      } catch {
        // non-fatal — keep title as caption
      }
    }

    let platformPostId: string | null = null;
    let postError: string | null = null;
    try {
      platformPostId = await uploadReelToFacebook(
        account.pageId,
        account.accessToken,
        videoBuffer,
        caption,
        {
          draft: plan.postType === "draft",
          scheduledAt: plan.postType === "scheduled" ? scheduledAt : undefined,
        },
      );
    } catch (err) {
      postError = err instanceof Error ? err.message : "Facebook upload failed";
    }

    await db.insert(postSchedules).values({
      videoId,
      socialAccountId: account.id,
      postType: plan.postType as "draft" | "scheduled",
      scheduledAt: scheduledAt ?? null,
      platformPostId,
      status: postError ? "failed" : "posted",
      errorMessage: postError,
      updatedAt: new Date(),
    });

    if (postError) {
      console.error(`[postSingleVideoToFacebook] Facebook upload failed for video ${videoId}:`, postError);
    }
  } catch (err) {
    // Non-fatal — posting failure must never crash the generation pipeline
    console.error(`[postSingleVideoToFacebook] unexpected error for video ${videoId}:`, err);
  }
}

export async function processVideo(
  planId: string,
  videoId: string,
  userId: string,
): Promise<"COMPLETE" | "FAILED"> {
  try {
    const [video] = await db
      .select()
      .from(videos)
      .where(eq(videos.id, videoId))
      .limit(1);

    if (!video) throw new Error("Video not found");

    if (!video.brandProfileId) throw new Error(`Video ${videoId} has no brand profile attached`);

    const [brand] = await db
      .select()
      .from(brandProfiles)
      .where(eq(brandProfiles.id, video.brandProfileId))
      .limit(1);

    if (!brand) throw new Error(`Brand profile not found for video ${videoId}`);

    // Idempotent: already done, nothing to do.
    if (video.status === "COMPLETE") return "COMPLETE";

    const hasCharacterSheet = Boolean(brand.characterSheetGcsPath);
    const effectiveUgcVisualStyle = video.ugcVisualStyle
      ?? (video.videoType === "talking" ? (brand.visualStyle ?? null) : null);
    const characterNote = brand.characterDescription ?? null;

    // If clip requests are already in the queue or assembly is running, skip
    // script/scenes regeneration and go straight to waiting for completion.
    // This handles resuming after a server restart mid-pipeline.
    const resumeFromAssembly = (
      video.status === "CLIPS_QUEUED" ||
      video.status === "CLIPS_PROCESSING" ||
      video.status === "CLIPS_NEEDS_REVIEW" ||
      video.status === "ASSEMBLY_PENDING" ||
      video.status === "ASSEMBLY_PROCESSING"
    );

    let autoTitle: string | null = null;

    if (!resumeFromAssembly) {
      // 1 — Generate script
      emitPlanEvent(planId, { type: "VIDEO_UPDATE", videoId, title: video.title, status: "SCRIPT_PENDING", message: "Scripting…" });

      await db.update(videos).set({ status: "SCRIPT_PENDING", updatedAt: new Date() }).where(eq(videos.id, videoId));

      const needsTitle = !video.title || video.title === "Untitled Video";
      const idea = video.idea ?? video.title;
      const [script, autoTitleResult] = await Promise.all([
        generateScript(brand, idea, video.targetDurationSeconds, video.renderStyle ?? undefined, video.videoType, video.actionReelStyle ?? undefined),
        needsTitle ? generateTitle(idea) : Promise.resolve(null),
      ]);
      autoTitle = autoTitleResult;

      await db.update(videos).set({
        script,
        status: "SCRIPT_READY",
        ...(autoTitle ? { title: autoTitle } : {}),
        updatedAt: new Date(),
      }).where(eq(videos.id, videoId));

      // 2 — Generate scenes
      emitPlanEvent(planId, { type: "VIDEO_UPDATE", videoId, title: autoTitle ?? video.title, status: "SCENES_PENDING", message: "Planning scenes…" });

      await db.update(videos).set({ status: "SCENES_PENDING", updatedAt: new Date() }).where(eq(videos.id, videoId));

      const sceneList = await splitScenes(
        script,
        video.targetDurationSeconds,
        video.videoType,
        video.renderStyle ?? null,
        effectiveUgcVisualStyle,
        characterNote,
        video.actionReelStyle ?? null,
        hasCharacterSheet,
        brand.characterType === "podcast",
      );

      await db.delete(scenes).where(eq(scenes.videoId, videoId));
      const inserted = await db.insert(scenes).values(
        sceneList.map((s) => ({
          videoId,
          sceneIndex: s.sceneIndex,
          textExcerpt: s.textExcerpt,
          visualPrompt: s.visualPrompt,
          motionPrompt: s.motionPrompt,
          durationHintSeconds: (video.videoType === "talking" || video.videoType === "action_reel") ? 6 : Math.max(1, Math.min(6, Math.round(s.durationHintSeconds))),
          approved: true,
        })),
      ).returning();

      await db.update(videos).set({ sceneCount: inserted.length, updatedAt: new Date() }).where(eq(videos.id, videoId));

      // 3 — Dialogue segments (best-effort)
      if (inserted.length > 0 && video.videoType !== "action_reel") {
        try {
          const segments = await generateDialogueSegments(script, inserted.length);
          if (segments.length > 0) {
            await db.update(videos).set({ dialogueSegments: segments, updatedAt: new Date() }).where(eq(videos.id, videoId));
          }
        } catch {
          // non-fatal
        }
      }

      await db.update(videos).set({ status: "SCENES_READY", updatedAt: new Date() }).where(eq(videos.id, videoId));

      // 4 — Submit for clip generation
      emitPlanEvent(planId, { type: "VIDEO_UPDATE", videoId, title: autoTitle ?? video.title, status: "CLIPS_QUEUED", message: "In Grok queue…" });

      const dialogueMap = new Map<number, string>();
      const videoRow = await db.select({ dialogueSegments: videos.dialogueSegments }).from(videos).where(eq(videos.id, videoId)).limit(1);
      const segs = videoRow[0]?.dialogueSegments as Array<{ sceneIndex: number; dialogue: string }> | null;
      if (segs) {
        for (const seg of segs) dialogueMap.set(seg.sceneIndex, seg.dialogue);
      }

      const approvedScenes = await db
        .select()
        .from(scenes)
        .where(and(eq(scenes.videoId, videoId), eq(scenes.approved, true)))
        .orderBy(asc(scenes.sceneIndex));

      const clipValues = approvedScenes.map((scene) => {
        const dialogue = dialogueMap.get(scene.sceneIndex);
        const motionPrompt = dialogue
          ? `The character speaks these exact words directly to camera: "${dialogue}"\n\n${scene.motionPrompt}`
          : scene.motionPrompt;
        return {
          videoId,
          userId,
          sceneIndex: scene.sceneIndex,
          visualPrompt: scene.visualPrompt,
          motionPrompt,
          status: "queued" as const,
          queuedAt: new Date(),
        };
      });

      // Remove any stale clip requests from a previous failed attempt before inserting.
      await db.delete(clipRequests).where(eq(clipRequests.videoId, videoId));
      await db.insert(clipRequests).values(clipValues);
      await db.update(videos).set({ status: "CLIPS_QUEUED", updatedAt: new Date() }).where(eq(videos.id, videoId));

      await db.update(users).set({
        videosToday: sql`${users.videosToday} + 1`,
        updatedAt: new Date(),
      }).where(eq(users.id, userId));
    }

    // 5 — Wait for assembly to complete
    emitPlanEvent(planId, {
      type: "VIDEO_UPDATE",
      videoId,
      title: autoTitle ?? video.title,
      status: resumeFromAssembly ? video.status : "ASSEMBLY_PENDING",
      message: resumeFromAssembly ? "Resuming…" : "Assembling…",
    });

    const finalStatus = await waitForCompletion(videoId);

    emitPlanEvent(planId, {
      type: finalStatus === "COMPLETE" ? "VIDEO_UPDATE" : "ERROR",
      videoId,
      title: autoTitle ?? video.title,
      status: finalStatus === "COMPLETE" ? "COMPLETE" : "FAILED",
      message: finalStatus === "COMPLETE" ? "Ready" : "Failed",
    });

    // 6 — Post to Facebook immediately on completion (non-blocking on failure)
    if (finalStatus === "COMPLETE") {
      await postSingleVideoToFacebook(planId, videoId);
    }

    return finalStatus === "COMPLETE" ? "COMPLETE" : "FAILED";
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    await db.update(videos).set({ status: "FAILED", error: msg, updatedAt: new Date() }).where(eq(videos.id, videoId));
    emitPlanEvent(planId, { type: "ERROR", videoId, message: msg });
    return "FAILED";
  }
}

function mapFormatToVideoType(format: string): "talking" | "action_reel" {
  if (format === "ugc" || format === "tutorial" || format === "montage" || format === "story") return "talking";
  return "talking";
}

export async function startBatchGeneration(planId: string, userId: string): Promise<void> {
  try {
    let planVideos = await db
      .select({ id: videos.id, status: videos.status })
      .from(videos)
      .where(eq(videos.contentPlanId, planId))
      .orderBy(asc(videos.createdAt));

    // Self-heal: if the approve transaction succeeded but the video insert failed
    // (partial state), recreate the video rows now so generation can proceed.
    if (planVideos.length === 0) {
      const [plan] = await db
        .select()
        .from(contentPlans)
        .where(eq(contentPlans.id, planId))
        .limit(1);

      const topics = Array.isArray(plan?.topics) ? (plan.topics as TopicEntry[]) : [];
      if (!plan || topics.length === 0) {
        console.error("[startBatchGeneration] no plan or topics found for", planId);
        return;
      }

      console.warn("[startBatchGeneration] no videos found for approved plan, recreating from topics:", planId);

      const [selfHealBrand] = await db
        .select({ subtitleStyle: brandProfiles.subtitleStyle })
        .from(brandProfiles)
        .where(eq(brandProfiles.id, plan.brandProfileId))
        .limit(1);

      const inserted = await db
        .insert(videos)
        .values(
          topics.map((topic) => ({
            userId,
            contentPlanId: plan.id,
            brandProfileId: plan.brandProfileId,
            title: topic.title,
            videoType: mapFormatToVideoType(topic.format),
            status: "DRAFT" as const,
            idea: `${topic.hook}\n\n${topic.scriptOutline}`,
            subtitleStyle: selfHealBrand?.subtitleStyle ?? "bold_pop",
          })),
        )
        .returning({ id: videos.id });

      planVideos = inserted.map((v) => ({ id: v.id, status: "DRAFT" as const }));
    }

    await db.update(contentPlans).set({ status: "generating", updatedAt: new Date() }).where(eq(contentPlans.id, planId));

    // Don't reprocess videos that already completed (e.g. on retry or startup recovery).
    const alreadyComplete = planVideos.filter((v) => v.status === "COMPLETE").length;
    const toProcess = planVideos.filter((v) => v.status !== "COMPLETE");

    const acquire = makeSemaphore(3);
    const results = await Promise.all(
      toProcess.map((v) => acquire(() => processVideo(planId, v.id, userId))),
    );

    const successCount = results.filter((r) => r === "COMPLETE").length + alreadyComplete;
    const failCount = results.filter((r) => r === "FAILED").length;

    await db.update(contentPlans).set({ status: "complete", updatedAt: new Date() }).where(eq(contentPlans.id, planId));

    emitPlanEvent(planId, {
      type: "BATCH_COMPLETE",
      totalVideos: planVideos.length,
      successCount,
      failCount,
    });

    try {
      await sendBatchCompleteEmail(userId, planId, successCount, failCount);
    } catch {
      // non-fatal — email failure should not crash the batch
    }
  } catch (err) {
    await db
      .update(contentPlans)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(contentPlans.id, planId))
      .catch(() => { /* best-effort */ });

    emitPlanEvent(planId, {
      type: "BATCH_FAILED",
      message: err instanceof Error ? err.message : "Batch generation failed.",
    });
  }
}
