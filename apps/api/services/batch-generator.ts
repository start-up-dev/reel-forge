import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../lib/db/index.js";
import { brandProfiles, clipRequests, contentPlans, postSchedules, scenes, socialAccounts, users, videos } from "../lib/db/schema.js";
import type { BrandProfileRow } from "../lib/db/schema.js";
import { emitPlanEvent } from "../lib/plan-event-bus.js";
import { generateSignedReadUrl } from "../lib/storage.js";
import { uploadReelToFacebook } from "./facebook.js";
import { generateDialogueSegments, generateScript, generateTitle, splitScenes } from "./claude.js";
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

async function processVideo(
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

    // hasCharacterSheet: the brand has a character sheet image that the operator extension
    // attaches to Grok Imagine. When true, every visualPrompt's CHARACTER section defers to
    // that image ("replicate from attached reference sheet") rather than describing the
    // character in text. The characterNote is still passed for WORLD/SETTING context.
    const hasCharacterSheet = Boolean(brand.characterSheetGcsPath);
    const effectiveUgcVisualStyle = video.ugcVisualStyle
      ?? (video.videoType === "talking" ? (brand.visualStyle ?? null) : null);
    const characterNote = brand.characterDescription ?? null;

    // 1 — Generate script
    emitPlanEvent(planId, { type: "VIDEO_UPDATE", videoId, title: video.title, status: "SCRIPT_PENDING", message: "Scripting…" });

    await db.update(videos).set({ status: "SCRIPT_PENDING", updatedAt: new Date() }).where(eq(videos.id, videoId));

    const needsTitle = !video.title || video.title === "Untitled Video";
    const idea = video.idea ?? video.title;
    const [script, autoTitle] = await Promise.all([
      generateScript(brand, idea, video.targetDurationSeconds, video.renderStyle ?? undefined, video.videoType, video.actionReelStyle ?? undefined),
      needsTitle ? generateTitle(idea) : Promise.resolve(null),
    ]);

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

    await db.insert(clipRequests).values(clipValues);
    await db.update(videos).set({ status: "CLIPS_QUEUED", updatedAt: new Date() }).where(eq(videos.id, videoId));

    await db.update(users).set({
      videosToday: sql`${users.videosToday} + 1`,
      videosThisMonth: sql`${users.videosThisMonth} + 1`,
      updatedAt: new Date(),
    }).where(eq(users.id, userId));

    // 5 — Wait for assembly to complete
    emitPlanEvent(planId, { type: "VIDEO_UPDATE", videoId, title: autoTitle ?? video.title, status: "ASSEMBLY_PENDING", message: "Assembling…" });

    const finalStatus = await waitForCompletion(videoId);

    emitPlanEvent(planId, {
      type: finalStatus === "COMPLETE" ? "VIDEO_UPDATE" : "ERROR",
      videoId,
      title: autoTitle ?? video.title,
      status: finalStatus === "COMPLETE" ? "COMPLETE" : "FAILED",
      message: finalStatus === "COMPLETE" ? "Ready" : "Failed",
    });

    return finalStatus === "COMPLETE" ? "COMPLETE" : "FAILED";
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    await db.update(videos).set({ status: "FAILED", error: msg, updatedAt: new Date() }).where(eq(videos.id, videoId));
    emitPlanEvent(planId, { type: "ERROR", videoId, message: msg });
    return "FAILED";
  }
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

async function autoPostCompletedVideos(
  planId: string,
  allVideoIds: string[],
): Promise<void> {
  try {
    const [plan] = await db
      .select()
      .from(contentPlans)
      .where(eq(contentPlans.id, planId))
      .limit(1);

    if (!plan || plan.postType === "manual") return;

    const [brand] = await db
      .select()
      .from(brandProfiles)
      .where(eq(brandProfiles.id, plan.brandProfileId))
      .limit(1);

    if (!brand?.socialAccountId) return;

    const [account] = await db
      .select()
      .from(socialAccounts)
      .where(eq(socialAccounts.id, brand.socialAccountId))
      .limit(1);

    if (!account) return;

    const completeVideos = await db
      .select()
      .from(videos)
      .where(and(
        inArray(videos.id, allVideoIds),
        eq(videos.status, "COMPLETE"),
      ));

    const topics = Array.isArray(plan.topics) ? (plan.topics as TopicEntry[]) : [];

    for (const video of completeVideos) {
      try {
        if (!video.outputUrl) continue;

        const topic = topics.find((t) => t.title === video.title);
        const scheduledAt = topic
          ? computeScheduledAt(plan.weekStartDate, topic.day, topic.slot)
          : undefined;

        let videoUrl = video.outputUrl;
        if (!videoUrl.startsWith("http")) {
          videoUrl = await generateSignedReadUrl(videoUrl, 30);
        }

        const videoRes = await fetch(videoUrl);
        if (!videoRes.ok) continue;
        const videoBuffer = Buffer.from(await videoRes.arrayBuffer());

        let platformPostId: string | null = null;
        let postError: string | null = null;

        try {
          platformPostId = await uploadReelToFacebook(
            account.pageId,
            account.accessToken,
            videoBuffer,
            video.title,
            {
              draft: plan.postType === "draft",
              scheduledAt: plan.postType === "scheduled" ? scheduledAt : undefined,
            },
          );
        } catch (err) {
          postError = err instanceof Error ? err.message : "Facebook upload failed";
        }

        await db.insert(postSchedules).values({
          videoId: video.id,
          socialAccountId: account.id,
          postType: plan.postType as "draft" | "scheduled",
          scheduledAt: scheduledAt ?? null,
          platformPostId,
          status: postError ? "failed" : "posted",
          errorMessage: postError,
          updatedAt: new Date(),
        });
      } catch {
        // Non-fatal — continue with remaining videos
      }
    }
  } catch {
    // Non-fatal — auto-post failure should not crash the batch
  }
}

function mapFormatToVideoType(format: string): "generated" | "talking" | "action_reel" {
  if (format === "tutorial") return "generated";
  if (format === "ugc") return "talking";
  return "generated";
}

export async function startBatchGeneration(planId: string, userId: string): Promise<void> {
  try {
    let planVideos = await db
      .select({ id: videos.id })
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
          })),
        )
        .returning({ id: videos.id });

      planVideos = inserted;
    }

    await db.update(contentPlans).set({ status: "generating", updatedAt: new Date() }).where(eq(contentPlans.id, planId));

    const acquire = makeSemaphore(3);
    const results = await Promise.all(
      planVideos.map((v) => acquire(() => processVideo(planId, v.id, userId))),
    );

    const successCount = results.filter((r) => r === "COMPLETE").length;
    const failCount = results.filter((r) => r === "FAILED").length;

    await db.update(contentPlans).set({ status: "complete", updatedAt: new Date() }).where(eq(contentPlans.id, planId));

    emitPlanEvent(planId, {
      type: "BATCH_COMPLETE",
      totalVideos: planVideos.length,
      successCount,
      failCount,
    });

    // Auto-post COMPLETE videos to Facebook if the plan's postType is not 'manual'
    void autoPostCompletedVideos(planId, planVideos.map((v) => v.id));

    try {
      await sendBatchCompleteEmail(userId, planId, successCount, failCount);
    } catch {
      // non-fatal — email failure should not crash the batch
    }
  } catch (err) {
    // Ensure plan never gets stuck in "approved"/"generating" on unexpected errors
    await db
      .update(contentPlans)
      .set({ status: "complete", updatedAt: new Date() })
      .where(eq(contentPlans.id, planId))
      .catch(() => { /* best-effort */ });

    emitPlanEvent(planId, {
      type: "BATCH_COMPLETE",
      totalVideos: 0,
      successCount: 0,
      failCount: 0,
      message: err instanceof Error ? err.message : "Batch generation failed.",
    });
  }
}
