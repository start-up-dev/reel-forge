import React from "react";
import { useCurrentFrame, spring, interpolate, useVideoConfig } from "remotion";
import { Zap } from "lucide-react";

interface GlowButtonProps {
  label: string;
  subtext?: string;
  appearAtFrame?: number;
}

export const GlowButton: React.FC<GlowButtonProps> = ({
  label,
  subtext,
  appearAtFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entry = spring({
    frame: frame - appearAtFrame,
    fps,
    config: { stiffness: 200, damping: 16 },
  });

  // heartbeat glow: one pulse every 45 frames after appearance
  const elapsed = Math.max(0, frame - appearAtFrame);
  const pulse = Math.sin((elapsed / 45) * Math.PI * 2) * 0.5 + 0.5;
  const glowSize = 28 + pulse * 28;
  const glowOpacity = 0.35 + pulse * 0.35;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 14,
        transform: `scale(${entry})`,
        opacity: entry,
      }}
    >
      <div
        style={{
          background: "#f55c2a",
          color: "#FFFFFF",
          padding: "22px 52px",
          borderRadius: 60,
          fontSize: 26,
          fontWeight: 900,
          fontFamily: "'Inter', sans-serif",
          display: "flex",
          alignItems: "center",
          gap: 14,
          boxShadow: `0 0 ${glowSize}px rgba(245,92,42,${glowOpacity}), 0 20px 40px rgba(245,92,42,0.3)`,
          letterSpacing: "-0.01em",
        }}
      >
        <Zap size={26} />
        {label}
      </div>
      {subtext && (
        <div
          style={{
            fontSize: 13,
            color: "#52525b",
            fontWeight: 500,
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {subtext}
        </div>
      )}
    </div>
  );
};
