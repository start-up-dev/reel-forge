import React from "react";
import { useCurrentFrame, spring, interpolate, useVideoConfig } from "remotion";

interface RippleRevealProps {
  children: React.ReactNode;
  startFrame?: number;
}

export const RippleReveal: React.FC<RippleRevealProps> = ({
  children,
  startFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entry = spring({
    frame: frame - startFrame,
    fps,
    config: { stiffness: 180, damping: 18 },
  });

  const radius = interpolate(entry, [0, 1], [0, 160]);

  return (
    <div
      style={{
        clipPath: `circle(${radius}% at 50% 50%)`,
      }}
    >
      {children}
    </div>
  );
};
