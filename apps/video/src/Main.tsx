import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { Scene0_Hook } from "./scenes/Scene0_Hook";
import { Scene1_Claim } from "./scenes/Scene1_Claim";
import { Scene2_Pipeline } from "./scenes/Scene2_Pipeline";
import { Scene3_OutputReel } from "./scenes/Scene3_OutputReel";
import { Scene4_CTA } from "./scenes/Scene4_CTA";

// Timeline (30fps, 1350 frames = 45 seconds):
//   0–89    Scene0_Hook        3s  kinetic typography hook
//  90–239   Scene1_Claim       5s  time-counter comparison
// 240–539   Scene2_Pipeline   10s  animated AI pipeline
// 540–989   Scene3_OutputReel 15s  6-phone output reel
// 990–1349  Scene4_CTA        12s  social proof + CTA

export const Main: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#09090b" }}>
      <Sequence from={0} durationInFrames={90}>
        <Scene0_Hook />
      </Sequence>

      {/* hard-cut flash between Scene 0 and Scene 1 */}
      <Sequence from={87} durationInFrames={5}>
        <AbsoluteFill style={{ background: "#000000" }} />
      </Sequence>

      <Sequence from={90} durationInFrames={150}>
        <Scene1_Claim />
      </Sequence>

      <Sequence from={240} durationInFrames={300}>
        <Scene2_Pipeline />
      </Sequence>

      <Sequence from={540} durationInFrames={450}>
        <Scene3_OutputReel />
      </Sequence>

      <Sequence from={990} durationInFrames={360}>
        <Scene4_CTA />
      </Sequence>
    </AbsoluteFill>
  );
};
