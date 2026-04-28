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
 *  1. Paid subscribers (starter/pro) use daily/monthly limits.
 *  2. Trial users (paid one-time fee) use trialVideoRemaining.
 *  3. Free users must pay the trial fee first.
 *
 * This is a pure function — it does NOT mutate usage counters.
 * Increment `videosToday` and `videosThisMonth` atomically inside the
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

  // 1. Paid subscribers (Starter, Pro)
  if (plan === "starter" || plan === "pro") {
    // Enforce daily limit
    if (dailyLimit > 0 && videosToday >= dailyLimit) {
      return {
        allowed: false,
        reason: `Daily limit of ${dailyLimit} videos reached. Resets at midnight UTC.`,
        redirect: "billing",
      };
    }

    // Enforce monthly limit
    if (monthlyLimit > 0 && videosThisMonth >= monthlyLimit) {
      return {
        allowed: false,
        reason: `Monthly limit of ${monthlyLimit} videos reached. Resets on the 1st of next month.`,
        redirect: "billing",
      };
    }

    return { allowed: true, reason: "Quota available (Subscription)." };
  }

  // 2. Trial users (paid one-time fee, plan is usually 'try_out' or 'none')
  if (trialPaid) {
    if (trialVideoRemaining <= 0) {
      return {
        allowed: false,
        reason:
          "Your trial videos have been used. Upgrade to a plan to create more.",
        redirect: "billing",
      };
    }
    return { allowed: true, reason: "Trial video available." };
  }

  // 3. Free users who haven't paid anything yet
  return {
    allowed: false,
    reason: "Pay the one-time $5 trial fee to generate your first videos.",
    redirect: "trial_checkout",
  };
}
