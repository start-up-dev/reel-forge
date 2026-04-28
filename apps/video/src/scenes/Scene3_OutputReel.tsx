import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { PhoneMockup } from "../components/PhoneMockup";

interface PhoneData {
  style: string;
  topic: string;
  bg: string;
  textColor: string;
  glowColor: string;
}

const PHONES: PhoneData[] = [
  {
    style: "Cinematic",
    topic: "HIDDEN\nCOFFEE SHOPS",
    bg: "linear-gradient(to bottom, #0D1B2A 0%, #1B4B6B 100%)",
    textColor: "#7DD3FC",
    glowColor: "#0EA5E9",
  },
  {
    style: "Cartoon",
    topic: "SCIENCE\nEXPLAINED",
    bg: "linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 100%)",
    textColor: "#FFFFFF",
    glowColor: "#FF6B6B",
  },
  {
    style: "Whiteboard",
    topic: "GROW YOUR\nBUSINESS",
    bg: "linear-gradient(to bottom, #F0F0F0 0%, #DADADA 100%)",
    textColor: "#1a1a1a",
    glowColor: "#888888",
  },
  {
    style: "Motion Graphics",
    topic: "FUTURE OF\nTECH 2025",
    bg: "linear-gradient(135deg, #0A0A2E 0%, #3A1C71 100%)",
    textColor: "#00F5FF",
    glowColor: "#6C35DE",
  },
  {
    style: "2D Animation",
    topic: "TOKYO\nDAY TRIP",
    bg: "linear-gradient(to bottom, #FF8C00 0%, #FF5733 100%)",
    textColor: "#FFFFFF",
    glowColor: "#FF8C00",
  },
  {
    style: "Stock Footage",
    topic: "EASY PASTA\nRECIPE",
    bg: "linear-gradient(to bottom, #2D5016 0%, #4A7C59 100%)",
    textColor: "#DCFCE7",
    glowColor: "#4A7C59",
  },
];

export const Scene3_OutputReel: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // cluster animation starts at frame 300
  const clusterP = spring({
    frame: frame - 300,
    fps,
    config: { stiffness: 100, damping: 20 },
  });
  const contentScale = interpolate(clusterP, [0, 1], [1, 0.6]);
  const contentY = interpolate(clusterP, [0, 1], [0, -60]);

  // style badge opacity (all phones landed by ~frame 70)
  const badgeP = spring({
    frame: frame - 78,
    fps,
    config: { stiffness: 120, damping: 20 },
  });

  // counter strip
  const stripP = interpolate(frame, [0, 22], [0, 1], {
    extrapolateRight: "clamp",
  });

  // headline overlay
  const headlineP = spring({
    frame: frame - 332,
    fps,
    config: { stiffness: 280, damping: 14 },
  });
  const overlayOpacity = interpolate(frame, [318, 340], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: "#09090b" }}>
      {/* orange vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 1400px 700px at 50% 60%, rgba(245,92,42,0.09), transparent)",
          pointerEvents: "none",
        }}
      />

      {/* main clusterable content */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 22,
          transform: `scale(${contentScale}) translateY(${contentY}px)`,
          transformOrigin: "center center",
        }}
      >
        {/* counter strip */}
        <div
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            fontWeight: 600,
            color: "#a1a1aa",
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            opacity: stripP,
            display: "flex",
            gap: 28,
            alignItems: "center",
          }}
        >
          <span>7 Styles</span>
          <span style={{ color: "#52525b" }}>·</span>
          <span>4 Platforms</span>
          <span style={{ color: "#52525b" }}>·</span>
          <span>∞ Topics</span>
        </div>

        {/* phones row */}
        <div style={{ display: "flex", gap: 18, alignItems: "flex-end" }}>
          {PHONES.map((phone, i) => (
            <PhoneMockup
              key={i}
              delay={i * 8}
              glowColor={phone.glowColor}
              width={210}
            >
              {/* phone content */}
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background: phone.bg,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                  padding: "14px 14px 18px",
                  position: "relative",
                }}
              >
                {/* style tag top-right */}
                <div
                  style={{
                    position: "absolute",
                    top: 26,
                    right: 10,
                    background: "rgba(0,0,0,0.45)",
                    borderRadius: 20,
                    padding: "3px 8px",
                    fontSize: 9,
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.7)",
                    fontFamily: "'Inter', sans-serif",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  {phone.style}
                </div>

                {/* title */}
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 22,
                    fontWeight: 900,
                    color: phone.textColor,
                    textTransform: "uppercase",
                    lineHeight: 1.1,
                    letterSpacing: "-0.01em",
                    margin: 0,
                    whiteSpace: "pre-line",
                  }}
                >
                  {phone.topic}
                </p>
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 10,
                    color: "rgba(255,255,255,0.5)",
                    marginTop: 5,
                    fontWeight: 500,
                  }}
                >
                  ▶ Watch Now
                </p>
              </div>
            </PhoneMockup>
          ))}
        </div>

        {/* style badge pills — gap must match phone row gap (18) for column alignment */}
        <div
          style={{
            display: "flex",
            gap: 18,
            opacity: badgeP,
            transform: `translateY(${interpolate(badgeP, [0, 1], [12, 0])}px)`,
          }}
        >
          {PHONES.map((phone, i) => (
            <div
              key={i}
              style={{
                padding: "5px 12px",
                borderRadius: 20,
                border: "1px solid rgba(245,92,42,0.45)",
                background: "rgba(245,92,42,0.08)",
                fontFamily: "'Inter', sans-serif",
                fontSize: 10,
                fontWeight: 700,
                color: "#a1a1aa",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                width: 210,
                textAlign: "center",
                flexShrink: 0,
                boxSizing: "border-box",
              }}
            >
              {phone.style}
            </div>
          ))}
        </div>
      </div>

      {/* headline overlay */}
      {frame >= 316 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(9,9,11,0.72)",
            opacity: overlayOpacity,
            zIndex: 10,
          }}
        >
          <div
            style={{
              textAlign: "center",
              transform: `scale(${interpolate(headlineP, [0, 1], [0.7, 1])})`,
              opacity: headlineP,
            }}
          >
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 96,
                fontWeight: 900,
                color: "#F4F4F8",
                letterSpacing: "-0.03em",
                lineHeight: 1,
              }}
            >
              What will{" "}
              <span style={{ color: "#f55c2a" }}>YOU</span>
              {" "}make?
            </div>
            <div
              style={{
                marginTop: 24,
                fontFamily: "'Inter', sans-serif",
                fontSize: 20,
                color: "#a1a1aa",
                fontWeight: 500,
                opacity: interpolate(frame, [360, 390], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
              }}
            >
              One idea is all it takes.
            </div>
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
