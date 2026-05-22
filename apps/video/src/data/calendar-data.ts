export const WEEK_TITLES = [
  "Why Your Facebook Reach Suddenly Died",
  "AI Posts Your Reels While You Sleep",
  "3 Reel Hooks That Stop the Scroll",
  "Build a Week of Content in 15 Minutes",
  "I Replaced My Video Editor With AI",
  "Facebook Creators Quietly Winning",
  "From Zero Views to 50K This Month",
];

export const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const WEEK_DATES = ["Jun 2", "Jun 3", "Jun 4", "Jun 5", "Jun 6", "Jun 7", "Jun 8"];
export const WEEK_TIMES = [
  "9:00 AM",
  "2:00 PM",
  "9:00 AM",
  "5:00 PM",
  "9:00 AM",
  "2:00 PM",
  "11:00 AM",
];
export const WEEK_STYLES = [
  "Education",
  "AI Tools",
  "Tutorial",
  "Productivity",
  "Business",
  "Inspiration",
  "Growth",
];

// Cascade begins at this local frame within SceneCalendar
export const CASCADE_START_FRAME = 82;

// Frames between each card appearing — fast left-to-right fill
const CARD_GAP = 5;

export function getAppearFrame(cardIndex: number): number {
  return CASCADE_START_FRAME + cardIndex * CARD_GAP;
}

// Frame at which the last card (index 6) fully appears
export const LAST_CARD_FRAME = getAppearFrame(6); // 82 + 30 = 112
