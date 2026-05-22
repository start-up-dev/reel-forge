import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";

const URL_TEXT = "reelforge.ai";
const URL_START = 150;

export const SceneCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const line1P = spring({ frame, fps, config: { stiffness: 120, damping: 20 } });
  const line2P = spring({ frame: frame - 10, fps, config: { stiffness: 120, damping: 20 } });
  const subP = spring({ frame: frame - 32, fps, config: { stiffness: 120, damping: 20 } });
  const buttonP = spring({ frame: frame - 60, fps, config: { stiffness: 160, damping: 22 } });

  const dividerProgress = interpolate(frame, [130, 158], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // URL types itself in
  const charsVisible = Math.max(
    0,
    Math.floor((frame - URL_START) * 0.65)
  );
  const displayedUrl = URL_TEXT.slice(0, Math.min(charsVisible, URL_TEXT.length));
  const urlDone = charsVisible >= URL_TEXT.length;
  const cursorBlink =
    urlDone &&
    Math.floor(
      (frame - (URL_START + Math.ceil(URL_TEXT.length / 0.65))) / 15
    ) %
      2 ===
      0;

  // Pulsing glow on CTA button
  const buttonGlow = 0.3 + 0.2 * Math.sin(frame * 0.09);

  return (
    <AbsoluteFill style={{ background: "#09090b" }}>
      {/* Radial glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 920px 700px at 50% 44%, rgba(245,92,42,0.13), transparent)",
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
        }}
      >
        {/* Headline line 1 */}
        <div
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 90,
            fontWeight: 900,
            color: "#F4F4F8",
            letterSpacing: "-0.03em",
            lineHeight: 1,
            opacity: line1P,
            transform: `translateY(${interpolate(line1P, [0, 1], [28, 0])}px)`,
          }}
        >
          Your Facebook Page,
        </div>

        {/* Headline line 2 */}
        <div
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 90,
            fontWeight: 900,
            color: "#f55c2a",
            letterSpacing: "-0.03em",
            lineHeight: 1,
            marginBottom: 44,
            opacity: line2P,
            transform: `translateY(${interpolate(line2P, [0, 1], [26, 0])}px)`,
          }}
        >
          On Autopilot.
        </div>

        {/* Sub-headline */}
        <div
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 22,
            color: "#52525b",
            fontWeight: 500,
            marginBottom: 52,
            opacity: subP,
            transform: `translateY(${interpolate(subP, [0, 1], [16, 0])}px)`,
          }}
        >
          Minutes of setup. Our team handles everything else.
        </div>

        {/* CTA button */}
        <div
          style={{
            marginBottom: 44,
            opacity: buttonP,
            transform: `scale(${interpolate(buttonP, [0, 1], [0.88, 1])})`,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 14,
              padding: "22px 58px",
              background: "#f55c2a",
              borderRadius: 18,
              boxShadow: `0 0 ${84 * buttonGlow}px ${38 * buttonGlow}px rgba(245,92,42,${
                0.22 + buttonGlow * 0.12
              }), 0 10px 40px rgba(0,0,0,0.45)`,
            }}
          >
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 28,
                fontWeight: 800,
                color: "#fff",
                letterSpacing: "-0.01em",
              }}
            >
              Start your first week for $5
            </span>
            <span style={{ fontSize: 26, color: "rgba(255,255,255,0.85)" }}>→</span>
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            width: 300 * dividerProgress,
            height: 1,
            background:
              "linear-gradient(to right, transparent, rgba(255,255,255,0.1), transparent)",
            marginBottom: 28,
          }}
        />

        {/* URL types in */}
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 20,
            color: "#3a3a44",
            letterSpacing: "0.04em",
            opacity: interpolate(frame, [138, 152], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            minHeight: 28,
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
