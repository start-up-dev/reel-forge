import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, interpolate } from "remotion";
import { SceneCalendar } from "./scenes/SceneCalendar";
import { SceneShowcase } from "./scenes/SceneShowcase";
import { SceneCTA } from "./scenes/SceneCTA";

// Timeline (30 fps, 538 frames = ~18 s):
//   0–178   SceneCalendar  — weekly plan → approve → cards fill → counter  (<6s)
//  178–358  SceneShowcase  — scrolling phone carousel                       (<6s)
//  358–538  SceneCTA       — "Your Facebook Page, On Autopilot." + $5 CTA   (<6s)

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
    <Sequence from={0} durationInFrames={178}>
      <SceneCalendar />
    </Sequence>

    <Sequence from={178} durationInFrames={180}>
      <SceneShowcase />
    </Sequence>

    <Sequence from={358} durationInFrames={180}>
      <SceneCTA />
    </Sequence>

    {/* Cross-fade transitions */}
    <Sequence from={168} durationInFrames={20}>
      <FadeTransition duration={20} />
    </Sequence>
    <Sequence from={348} durationInFrames={20}>
      <FadeTransition duration={20} />
    </Sequence>
  </AbsoluteFill>
);
