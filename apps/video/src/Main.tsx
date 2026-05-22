import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, interpolate } from "remotion";
import { SceneCalendar } from "./scenes/SceneCalendar";
import { SceneOutput } from "./scenes/SceneOutput";
import { SceneCTA } from "./scenes/SceneCTA";

// Timeline (30 fps, 1440 frames = 48 s):
//   0–820   SceneCalendar  — empty calendar → approve → month fills → counter
//  820–1110  SceneOutput   — dashboard screenshot + phone output proof
// 1110–1440  SceneCTA      — "Your Facebook Page, On Autopilot." + $5 CTA

const FadeTransition: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const mid = duration / 2;
  const opacity = interpolate(frame, [0, mid, duration], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill
      style={{ background: "#000", opacity, pointerEvents: "none" }}
    />
  );
};

export const Main: React.FC = () => (
  <AbsoluteFill style={{ background: "#09090b" }}>
    <Sequence from={0} durationInFrames={820}>
      <SceneCalendar />
    </Sequence>

    <Sequence from={820} durationInFrames={290}>
      <SceneOutput />
    </Sequence>

    <Sequence from={1110} durationInFrames={330}>
      <SceneCTA />
    </Sequence>

    {/* Cross-fade transitions */}
    <Sequence from={812} durationInFrames={20}>
      <FadeTransition duration={20} />
    </Sequence>
    <Sequence from={1102} durationInFrames={20}>
      <FadeTransition duration={20} />
    </Sequence>
  </AbsoluteFill>
);
