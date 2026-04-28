import React from "react";
import { useCurrentFrame, spring, interpolate, useVideoConfig } from "remotion";

type Direction = "left" | "right" | "top" | "bottom" | "slam";

interface KineticWordProps {
  text: string;
  delay?: number;
  direction?: Direction;
  fontSize?: number;
  color?: string;
  isBroken?: boolean;
  brokenAt?: number;
  style?: React.CSSProperties;
}

export const KineticWord: React.FC<KineticWordProps> = ({
  text,
  delay = 0,
  direction = "slam",
  fontSize = 160,
  color = "#F4F4F8",
  isBroken = false,
  brokenAt = 60,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const af = frame - delay;

  const entrySpring = spring({
    frame: af,
    fps,
    config: { stiffness: 280, damping: 22 },
  });

  const opacity = interpolate(af, [0, 6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const getTransform = (): string => {
    const p = entrySpring;
    switch (direction) {
      case "left":
        return `translateX(${interpolate(p, [0, 1], [-180, 0])}px)`;
      case "right":
        return `translateX(${interpolate(p, [0, 1], [180, 0])}px)`;
      case "top":
        return `translateY(${interpolate(p, [0, 1], [-120, 0])}px)`;
      case "bottom":
        return `translateY(${interpolate(p, [0, 1], [120, 0])}px)`;
      case "slam":
        return `scale(${interpolate(p, [0, 1], [1.5, 1])})`;
    }
  };

  const baseStyle: React.CSSProperties = {
    fontFamily: "'Inter', sans-serif",
    fontSize,
    fontWeight: 900,
    color,
    lineHeight: 1,
    letterSpacing: "-0.02em",
    display: "inline-block",
    ...style,
  };

  // Crack effect — splits the word into top/bottom halves flying apart
  if (isBroken && frame >= brokenAt) {
    const cp = spring({
      frame: frame - brokenAt,
      fps,
      config: { stiffness: 260, damping: 9 },
    });
    const topY = interpolate(cp, [0, 1], [0, -280]);
    const botY = interpolate(cp, [0, 1], [0, 280]);
    const topR = interpolate(cp, [0, 1], [0, -12]);
    const botR = interpolate(cp, [0, 1], [0, 12]);
    const halfOpacity = interpolate(cp, [0, 0.6, 1], [1, 0.5, 0]);

    return (
      <span style={{ position: "relative", display: "inline-block" }}>
        {/* layout spacer */}
        <span style={{ ...baseStyle, visibility: "hidden" }}>{text}</span>
        {/* top half */}
        <span
          style={{
            ...baseStyle,
            position: "absolute",
            top: 0,
            left: 0,
            clipPath: "inset(0 0 50% 0)",
            transform: `translateY(${topY}px) rotate(${topR}deg)`,
            opacity: halfOpacity,
            transformOrigin: "left center",
          }}
        >
          {text}
        </span>
        {/* bottom half */}
        <span
          style={{
            ...baseStyle,
            position: "absolute",
            top: 0,
            left: 0,
            clipPath: "inset(50% 0 0 0)",
            transform: `translateY(${botY}px) rotate(${botR}deg)`,
            opacity: halfOpacity,
            transformOrigin: "right center",
          }}
        >
          {text}
        </span>
      </span>
    );
  }

  return (
    <span
      style={{
        ...baseStyle,
        transform: getTransform(),
        opacity,
      }}
    >
      {text}
    </span>
  );
};
