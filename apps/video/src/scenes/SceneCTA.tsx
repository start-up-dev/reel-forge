import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";

const URL_TEXT = "aiReelForge.com";
const URL_START = 120;

export const SceneCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const line1P = spring({ frame, fps, config: { stiffness: 130, damping: 22 } });
  const line2P = spring({ frame: frame - 10, fps, config: { stiffness: 130, damping: 22 } });
  const buttonP = spring({ frame: frame - 30, fps, config: { stiffness: 160, damping: 22 } });

  const dividerProgress = interpolate(frame, [85, 115], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const urlFade = interpolate(frame, [110, 128], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // URL types itself in
  const charsVisible = Math.max(0, Math.floor((frame - URL_START) * 0.65));
  const displayedUrl = URL_TEXT.slice(0, Math.min(charsVisible, URL_TEXT.length));
  const urlDone = charsVisible >= URL_TEXT.length;
  const cursorBlink =
    urlDone &&
    Math.floor((frame - (URL_START + Math.ceil(URL_TEXT.length / 0.65))) / 15) % 2 === 0;

  // Pulsing glow on CTA button
  const buttonGlow = 0.3 + 0.2 * Math.sin(frame * 0.09);

  return (
    <AbsoluteFill style={{ background: "#09090b" }}>
      {/* Radial glow — matches landing page */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 50%, rgba(245,92,42,0.18) 0%, transparent 60%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 0,
        }}
      >
        {/* Headline line 1 */}
        <div
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 120,
            fontWeight: 900,
            color: "#F4F4F8",
            letterSpacing: "-0.04em",
            lineHeight: 0.95,
            opacity: line1P,
            transform: `translateY(${interpolate(line1P, [0, 1], [36, 0])}px)`,
            textAlign: "center",
          }}
        >
          Your Facebook Page,
        </div>

        {/* Headline line 2 — italic gradient + underline SVG */}
        <div
          style={{
            position: "relative",
            display: "inline-block",
            marginBottom: 72,
            opacity: line2P,
            transform: `translateY(${interpolate(line2P, [0, 1], [32, 0])}px)`,
          }}
        >
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 120,
              fontWeight: 900,
              fontStyle: "italic",
              letterSpacing: "-0.04em",
              lineHeight: 0.95,
              backgroundImage: "linear-gradient(to right, #f55c2a, #4a90e2)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              display: "block",
            }}
          >
            On Autopilot.
          </span>

          {/* Underline SVG */}
          <svg
            style={{
              position: "absolute",
              bottom: -18,
              left: 0,
              width: "100%",
              opacity: 0.45,
            }}
            height="16"
            viewBox="0 0 400 16"
            preserveAspectRatio="none"
            fill="none"
          >
            <path
              d="M0 12 C100 4, 200 16, 400 12"
              stroke="#f55c2a"
              strokeWidth="6"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* CTA button */}
        <div
          style={{
            marginBottom: 52,
            opacity: buttonP,
            transform: `scale(${interpolate(buttonP, [0, 1], [0.88, 1])})`,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 14,
              padding: "26px 68px",
              background: "#f55c2a",
              borderRadius: 9999,
              boxShadow: `0 0 ${84 * buttonGlow}px ${38 * buttonGlow}px rgba(245,92,42,${
                0.22 + buttonGlow * 0.12
              }), 0 10px 40px rgba(0,0,0,0.45)`,
            }}
          >
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 26,
                fontWeight: 800,
                color: "#fff",
                letterSpacing: "-0.01em",
              }}
            >
              Get your first week for $5
            </span>
            <span style={{ fontSize: 24, color: "rgba(255,255,255,0.85)" }}>→</span>
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            width: 280 * dividerProgress,
            height: 1,
            background:
              "linear-gradient(to right, transparent, rgba(255,255,255,0.1), transparent)",
            marginBottom: 26,
          }}
        />

        {/* URL types in */}
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 20,
            color: "#3a3a44",
            letterSpacing: "0.06em",
            opacity: urlFade,
            minHeight: 30,
          }}
        >
          {displayedUrl}
          {cursorBlink && (
            <span
              style={{
                display: "inline-block",
                width: 2,
                height: "1.1em",
                background: "#f55c2a",
                marginLeft: 2,
                verticalAlign: "middle",
              }}
            />
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};
