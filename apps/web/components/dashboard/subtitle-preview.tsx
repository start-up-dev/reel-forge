"use client";

import type { CSSProperties, ReactNode } from "react";
import { SubtitleStyle } from "@repo/types";

const BLACK_OUTLINE =
  "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 2px 4px rgba(0,0,0,.8)";
const ORANGE_OUTLINE =
  "-2px -2px 0 #f55c2a, 2px -2px 0 #f55c2a, -2px 2px 0 #f55c2a, 2px 2px 0 #f55c2a";
const ORANGE_GLOW =
  "0 0 8px #f55c2a, 0 0 18px #f55c2a, -1px -1px 0 #f55c2a, 1px 1px 0 #f55c2a";
const SOFT_SHADOW =
  "1px 2px 5px rgba(0,0,0,0.95), 0 0 10px rgba(0,0,0,0.5)";

type Config = {
  text: ReactNode;
  textStyle: CSSProperties;
  position?: "bottom" | "center";
};

function getConfig(style: SubtitleStyle): Config {
  switch (style) {
    case SubtitleStyle.BoldPop:
      return {
        text: "BOLD",
        textStyle: { color: "#fff", fontSize: 16, fontWeight: 900, textShadow: BLACK_OUTLINE, textTransform: "uppercase", lineHeight: 1 },
      };
    case SubtitleStyle.WordHighlight:
      return {
        text: "Word",
        textStyle: { color: "#fff", fontSize: 15, fontWeight: 700, textShadow: ORANGE_OUTLINE, lineHeight: 1 },
      };
    case SubtitleStyle.GroupedBold:
      return {
        text: "Three bold words",
        textStyle: { color: "#fff", fontSize: 11, fontWeight: 700, textShadow: BLACK_OUTLINE, lineHeight: 1.3 },
      };
    case SubtitleStyle.Karaoke:
      return {
        text: (
          <span>
            active{" "}
            <span style={{ color: "#f55c2a" }}>word</span>
            {" "}here
          </span>
        ),
        textStyle: { color: "#fff", fontSize: 11, fontWeight: 700, textShadow: "-1px -1px 0 #000, 1px 1px 0 #000", lineHeight: 1.3 },
      };
    case SubtitleStyle.NeonGlow:
      return {
        text: "GLOW",
        textStyle: { color: "#fff", fontSize: 16, fontWeight: 900, textShadow: ORANGE_GLOW, textTransform: "uppercase", lineHeight: 1 },
      };
    case SubtitleStyle.OversizedPop:
      return {
        text: "BIG",
        textStyle: { color: "#fff", fontSize: 22, fontWeight: 900, textShadow: BLACK_OUTLINE, textTransform: "uppercase", lineHeight: 1 },
        position: "center",
      };
    case SubtitleStyle.Minimal:
      return {
        text: "five small clean words",
        textStyle: { color: "#fff", fontSize: 8.5, fontWeight: 400, lineHeight: 1.4 },
      };
    case SubtitleStyle.Cinematic:
      return {
        text: "warm italic words",
        textStyle: { color: "#F8F4F4", fontSize: 10, fontWeight: 400, fontStyle: "italic", textShadow: SOFT_SHADOW, lineHeight: 1.4 },
      };
    case SubtitleStyle.GroupedCinematic:
      return {
        text: "slim warm italic",
        textStyle: { color: "#F8F4F4", fontSize: 9.5, fontWeight: 300, fontStyle: "italic", textShadow: SOFT_SHADOW, lineHeight: 1.4 },
      };
  }
}

export function SubtitlePreview({ style }: { style: SubtitleStyle }) {
  const { text, textStyle, position = "bottom" } = getConfig(style);
  return (
    <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16/9" }}>
      {/* video background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1e2535] via-[#141824] to-[#07080f]" />
      {/* person silhouette — percentage-based so it scales with card width */}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{ bottom: "28%", width: "18%", height: "38%", borderRadius: "50% 50% 0 0", background: "#2a3348", opacity: 0.55 }}
      />
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{ bottom: "52%", width: "10%", height: "24%", borderRadius: "50%", background: "#2a3348", opacity: 0.55 }}
      />
      {/* subtitle text */}
      <div
        className={`absolute left-0 right-0 px-2 text-center ${
          position === "center" ? "top-1/2 -translate-y-1/2" : "bottom-2"
        }`}
      >
        <span style={textStyle} className="block">
          {text}
        </span>
      </div>
    </div>
  );
}
