export const LIFE_COACH_TITLES: string[] = [
  "Why Your Facebook Reach Suddenly Died",
  "AI Posts Your Reels While You Sleep",
  "3 Reel Hooks That Stop the Scroll",
  "Build a Week of Content in 15 Minutes",
  "I Replaced My Video Editor With AI",
  "Facebook Creators Quietly Winning",
  "From Zero Views to 50K This Month",
  "The Truth About the Facebook Algorithm",
  "How I Got My First 10 Coaching Clients",
  "Stop Making These Content Mistakes",
  "Your Clients Are Watching, Not Reading",
  "The 60-Second Script That Gets Shares",
  "Why Most Coaches Quit Content Too Early",
  "Show Up Daily Without Burning Out",
  "The Script Format That Signs Clients",
  "How to Go Viral Without Dancing",
  "5 Hooks Your Audience Can't Ignore",
  "The Real Reason You're Not Growing",
  "Content That Converts vs. Content That Dies",
  "One Idea, Seven Videos",
  "My Exact Posting Schedule for Growth",
  "Why Short Videos Win Every Time",
  "The Authority Content Formula",
  "Stop Overthinking. Start Posting.",
  "What High-Ticket Clients Watch First",
  "The 3-Part Video That Books Calls",
  "Consistency Is Your Unfair Advantage",
  "Your Story Is Your Greatest Marketing",
  "How I 3x'd My Reach in 30 Days",
  "The One Video Every Coach Needs",
];

const BASE_TIMES = ["9:00 AM", "2:00 PM", "5:00 PM", "8:00 PM"];
export const POST_TIMES: string[] = Array.from(
  { length: 30 },
  (_, i) => BASE_TIMES[i % 4]
);

// Cascade begins at this local frame within SceneCalendar
export const CASCADE_START_FRAME = 210;

// Gap in frames between consecutive cards appearing, per row (slows → fast)
const ROW_GAPS = [35, 20, 12, 7, 5] as const;

// Cumulative start offset for each row's first card
const ROW_OFFSETS: number[] = (() => {
  const offsets = [0];
  for (let row = 0; row < 4; row++) {
    offsets.push(offsets[row] + 7 * ROW_GAPS[row]);
  }
  return offsets;
})();
// [0, 245, 385, 469, 518]

export function getAppearFrame(cardIndex: number): number {
  const row = Math.floor(cardIndex / 7);
  const col = cardIndex % 7;
  return CASCADE_START_FRAME + ROW_OFFSETS[row] + col * ROW_GAPS[row];
}

// Frame at which the last card (index 29) fully appears
// getAppearFrame(29) = 210 + 518 + 5 = 733
export const LAST_CARD_FRAME = getAppearFrame(29);
