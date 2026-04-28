import React from "react";
import { AbsoluteFill } from "remotion";
import { KineticWord } from "../components/KineticWord";

export const Scene0_Hook: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        background: "#09090b",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
      }}
    >
      {/* subtle radial glow appears behind the words */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 900px 400px at 50% 50%, rgba(245,92,42,0.07), transparent)",
          pointerEvents: "none",
        }}
      />

      <KineticWord
        text="MAKING VIDEOS"
        delay={0}
        direction="left"
        fontSize={108}
        color="#F4F4F8"
      />
      <KineticWord
        text="IS"
        delay={18}
        direction="right"
        fontSize={268}
        color="#F4F4F8"
      />
      <KineticWord
        text="BROKEN."
        delay={38}
        direction="bottom"
        fontSize={162}
        color="#F87171"
        isBroken={true}
        brokenAt={65}
      />
    </AbsoluteFill>
  );
};
