import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { StatCounter } from "../components/StatCounter";
import { GlowButton } from "../components/GlowButton";
import { RippleReveal } from "../components/RippleReveal";

const STATS = [
  { label: "Creators", value: 1240, suffix: "+" },
  { label: "Videos Made", value: 12000, suffix: "+" },
];

export const Scene4_CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // stat strip entry
  const statsEntry = spring({ frame, fps, config: { damping: 22 } });

  // rating (0→4.9 over 60 frames)
  const ratingRaw = interpolate(frame, [0, 60], [0, 49], {
    extrapolateRight: "clamp",
  });
  const ratingDisplay = (ratingRaw / 10).toFixed(1);

  // final line
  const finalLineP = spring({
    frame: frame - 150,
    fps,
    config: { damping: 22 },
  });

  // URL typed inline so the animation is visible when the div fades in at frame 170
  const URL_TEXT = "reelforge.ai";
  const URL_START = 170;
  const urlChars = Math.min(
    URL_TEXT.length,
    Math.max(0, Math.floor((frame - URL_START) * 0.75))
  );
  const displayedUrl = URL_TEXT.slice(0, urlChars);
  const urlDone = urlChars >= URL_TEXT.length;
  const cursorVisible = urlDone && Math.floor((frame - (URL_START + Math.ceil(URL_TEXT.length / 0.75))) / 14) % 2 === 0;

  // divider line draw
  const dividerP = interpolate(frame, [130, 160], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: "#0A0A0F" }}>
      {/* radial glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 900px 600px at 50% 45%, rgba(124,92,252,0.14), transparent)",
          pointerEvents: "none",
        }}
      />

      {/* layout column */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 48,
        }}
      >
        {/* stats strip */}
        <div
          style={{
            display: "flex",
            gap: 64,
            alignItems: "center",
            opacity: statsEntry,
            transform: `translateY(${interpolate(statsEntry, [0, 1], [30, 0])}px)`,
          }}
        >
          {STATS.map((s, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', 'Courier New', monospace",
                  fontSize: 52,
                  fontWeight: 700,
                  color: "#F4F4F8",
                  lineHeight: 1,
                }}
              >
                <StatCounter
                  from={0}
                  to={s.value}
                  duration={60}
                  suffix={s.suffix}
                />
              </div>
              <div
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#9898B0",
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  marginTop: 10,
                }}
              >
                {s.label}
              </div>
            </div>
          ))}

          {/* rating — separate because format is custom */}
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontFamily: "'JetBrains Mono', 'Courier New', monospace",
                fontSize: 52,
                fontWeight: 700,
                color: "#FBBF24",
                lineHeight: 1,
              }}
            >
              {ratingDisplay}★
            </div>
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 12,
                fontWeight: 600,
                color: "#9898B0",
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                marginTop: 10,
              }}
            >
              Rating
            </div>
          </div>
        </div>

        {/* CTA button via ripple reveal */}
        <RippleReveal startFrame={60}>
          <GlowButton
            label="Start for $5 →"
            subtext="3 video credits · Cancel anytime · Secured by Stripe"
            appearAtFrame={62}
          />
        </RippleReveal>

        {/* divider */}
        <div
          style={{
            width: 320 * dividerP,
            height: 1,
            background:
              "linear-gradient(to right, transparent, rgba(255,255,255,0.12), transparent)",
          }}
        />

        {/* final line + URL */}
        <div
          style={{
            textAlign: "center",
            opacity: finalLineP,
            transform: `translateY(${interpolate(finalLineP, [0, 1], [24, 0])}px)`,
          }}
        >
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 52,
              fontWeight: 800,
              color: "#F4F4F8",
              letterSpacing: "-0.02em",
              lineHeight: 1,
              marginBottom: 20,
            }}
          >
            Your first video is{" "}
            <span style={{ color: "#34D399" }}>10 minutes away.</span>
          </div>

          <div
            style={{
              fontFamily: "'JetBrains Mono', 'Courier New', monospace",
              fontSize: 22,
              color: "#5A5A72",
              letterSpacing: "0.04em",
              opacity: interpolate(frame, [168, 178], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            {displayedUrl}
            {cursorVisible && (
              <span
                style={{
                  display: "inline-block",
                  width: 2,
                  height: "1.1em",
                  background: "#7C5CFC",
                  marginLeft: 3,
                  verticalAlign: "middle",
                }}
              />
            )}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
