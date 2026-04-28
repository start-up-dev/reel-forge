import React from "react";
import { useCurrentFrame, spring, interpolate, useVideoConfig } from "remotion";

interface PhoneMockupProps {
  delay?: number;
  children?: React.ReactNode;
  glowColor?: string;
  width?: number;
}

export const PhoneMockup: React.FC<PhoneMockupProps> = ({
  delay = 0,
  children,
  glowColor = "#f55c2a",
  width = 210,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const height = Math.round(width * (19.5 / 9));

  const entry = spring({
    frame: frame - delay,
    fps,
    config: { stiffness: 180, damping: 14 },
  });

  const translateY = interpolate(entry, [0, 1], [220, 0]);
  const scale = interpolate(entry, [0, 1], [0.82, 1]);
  const opacity = interpolate(entry, [0, 0.25, 1], [0, 1, 1]);

  return (
    <div
      style={{
        width,
        height,
        borderRadius: 30,
        border: "3px solid rgba(255,255,255,0.14)",
        background: "#09090b",
        overflow: "hidden",
        position: "relative",
        flexShrink: 0,
        transform: `translateY(${translateY}px) scale(${scale})`,
        opacity,
        boxShadow: `0 40px 80px rgba(0,0,0,0.65), 0 0 40px ${glowColor}28`,
      }}
    >
      {/* camera dot */}
      <div
        style={{
          position: "absolute",
          top: 11,
          left: "50%",
          transform: "translateX(-50%)",
          width: 10,
          height: 10,
          background: "#09090b",
          border: "1.5px solid rgba(255,255,255,0.12)",
          borderRadius: "50%",
          zIndex: 10,
        }}
      />
      {/* content */}
      <div style={{ width: "100%", height: "100%", position: "relative" }}>
        {children}
      </div>
    </div>
  );
};
