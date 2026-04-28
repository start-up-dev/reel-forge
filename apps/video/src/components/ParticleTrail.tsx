import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

interface ParticleTrailProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  count?: number;
  color?: string;
  startFrame?: number;
  endFrame?: number;
  size?: number;
}

export const ParticleTrail: React.FC<ParticleTrailProps> = ({
  x1,
  y1,
  x2,
  y2,
  count = 10,
  color = "#f55c2a",
  startFrame = 0,
  endFrame = 60,
  size = 7,
}) => {
  const frame = useCurrentFrame();

  const particles = Array.from({ length: count }, (_, i) => {
    // stagger each particle so they form a flowing stream
    const phaseOffset = (i / count) * (endFrame - startFrame) * 0.55;
    const pStart = startFrame + phaseOffset;
    const pEnd = endFrame + phaseOffset * 0.4;

    const progress = interpolate(frame, [pStart, pEnd], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

    const cx = x1 + (x2 - x1) * progress;
    const cy = y1 + (y2 - y1) * progress;

    const opacity =
      progress > 0 && progress < 1
        ? interpolate(progress, [0, 0.08, 0.92, 1], [0, 1, 1, 0])
        : 0;

    return { cx, cy, opacity };
  });

  return (
    <svg
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        overflow: "visible",
      }}
    >
      {particles.map((p, i) => (
        <circle
          key={i}
          cx={p.cx}
          cy={p.cy}
          r={size / 2}
          fill={color}
          opacity={p.opacity}
          style={{ filter: `blur(0.5px) drop-shadow(0 0 3px ${color})` }}
        />
      ))}
    </svg>
  );
};
