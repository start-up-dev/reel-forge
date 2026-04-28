import React from "react";
import { useCurrentFrame } from "remotion";

interface WaveformBarsProps {
  barCount?: number;
  color?: string;
  maxHeight?: number;
  minHeight?: number;
  speed?: number;
  totalWidth?: number;
}

export const WaveformBars: React.FC<WaveformBarsProps> = ({
  barCount = 20,
  color = "#f55c2a",
  maxHeight = 48,
  minHeight = 6,
  speed = 0.12,
  totalWidth = 160,
}) => {
  const frame = useCurrentFrame();

  const gap = 3;
  const barWidth = (totalWidth - gap * (barCount - 1)) / barCount;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap,
        height: maxHeight,
        width: totalWidth,
      }}
    >
      {Array.from({ length: barCount }, (_, i) => {
        // two sine waves at different frequencies for organic feel
        const v =
          Math.sin(frame * speed + i * 0.55) * 0.5 +
          Math.sin(frame * speed * 1.7 + i * 0.3) * 0.3 +
          0.2;
        const normalised = Math.max(0, Math.min(1, (v + 1) / 2));
        const height = minHeight + normalised * (maxHeight - minHeight);

        return (
          <div
            key={i}
            style={{
              width: barWidth,
              height,
              background: color,
              borderRadius: 2,
              flexShrink: 0,
              boxShadow: `0 0 6px ${color}60`,
            }}
          />
        );
      })}
    </div>
  );
};
