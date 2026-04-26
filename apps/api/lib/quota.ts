import type { UserRow } from "./db/schema.js";

export interface QuotaCheckResult {
  allowed: boolean;
  reason: string;
  /** If set, the client should redirect the user to this destination. */
  redirect?: "trial_checkout" | "billing";
}

/**
 * Check whether a user is allowed to create a new video.
 *
 * Rules (evaluated in order):
 *  1. Users on the free tier with no trial must pay $2 before creating any video.
 *  2. Trial users get exactly 3 videos; if remaining = 0, redirect to billing.
 *  3. Paid users are subject to daily and monthly limits.
 *
 * This is a pure function — it does NOT mutate usage counters.
 * Increment `videos_today` and `videos_this_month` atomically inside the
 * route handler AFTER this check passes (see routes/videos.ts).
 */
export function checkQuota(user: UserRow): QuotaCheckResult {
  const {
    plan,
    trialPaid,
    trialVideoRemaining,
    videosToday,
    videosThisMonth,
    dailyLimit,
    monthlyLimit,
  } = user;

  // Free users who haven't paid the trial fee
  if (plan === "none" && !trialPaid) {
    return {
      allowed: false,
      reason: "Pay the one-time $2 trial fee to generate your first video.",
      redirect: "trial_checkout",
    };
  }

  // Trial users (paid $2 once, plan is still "none")
  if (plan === "none" && trialPaid) {
    if (trialVideoRemaining <= 0) {
      return {
        allowed: false,
        reason:
          "Your trial video has been used. Upgrade to a plan to create more.",
        redirect: "billing",
      };
    }
    return { allowed: true, reason: "Trial video available." };
  }

  // Paid users — enforce daily limit
  if (dailyLimit > 0 && videosToday >= dailyLimit) {
    return {
      allowed: false,
      reason: `Daily limit of ${dailyLimit} videos reached. Resets at midnight UTC.`,
      redirect: "billing",
    };
  }

  // Paid users — enforce monthly limit
  if (monthlyLimit > 0 && videosThisMonth >= monthlyLimit) {
    return {
      allowed: false,
      reason: `Monthly limit of ${monthlyLimit} videos reached. Resets on the 1st of next month.`,
      redirect: "billing",
    };
  }

  return { allowed: true, reason: "Quota available." };
}
