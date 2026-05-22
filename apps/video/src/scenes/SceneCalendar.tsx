import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Img,
  staticFile,
} from "remotion";
import { MonthlyCalendar } from "../components/MonthlyCalendar";
import { LAST_CARD_FRAME } from "../data/calendar-data";

const APPROVE_IN = 18;
const CLICK_FRAME = 58;
const OVERLAY_OUT = 70;
const COUNTER_FRAME = LAST_CARD_FRAME + 8;

export const SceneCalendar: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Eyebrow label — fades in then out as overlay arrives
  const labelOpacity = interpolate(
    frame,
    [4, 14, APPROVE_IN, APPROVE_IN + 18],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Dark overlay that dims the calendar during the approve moment
  const overlayOpacity = interpolate(
    frame,
    [APPROVE_IN, APPROVE_IN + 18, CLICK_FRAME + 8, OVERLAY_OUT + 24],
    [0, 0.78, 0.78, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Approve button springs in — snappy to match compressed timing
  const buttonP = spring({
    frame: frame - APPROVE_IN,
    fps,
    config: { stiffness: 300, damping: 22 },
  });

  // After click: button fades out with overlay
  const buttonOpacity =
    frame >= CLICK_FRAME + 4
      ? interpolate(frame, [CLICK_FRAME + 4, OVERLAY_OUT + 22], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : buttonP;

  // Pulsing glow before click
  const glow = frame < CLICK_FRAME ? 0.3 + 0.22 * Math.sin(frame * 0.1) : 0;

  // Click scale punch
  const clickP = spring({
    frame: frame - CLICK_FRAME,
    fps,
    config: { stiffness: 500, damping: 12 },
  });
  const buttonScale =
    frame < CLICK_FRAME
      ? interpolate(buttonP, [0, 1], [0.86, 1])
      : interpolate(clickP, [0, 0.22, 1], [1, 1.09, 1]);

  // White flash on click
  const flashOpacity =
    frame >= CLICK_FRAME
      ? interpolate(
          frame,
          [CLICK_FRAME, CLICK_FRAME + 3, CLICK_FRAME + 14],
          [0, 0.5, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        )
      : 0;

  // Expanding ripple on click
  const rippleP = spring({
    frame: frame - CLICK_FRAME,
    fps,
    config: { stiffness: 50, damping: 18 },
  });
  const rippleOpacity =
    frame >= CLICK_FRAME
      ? interpolate(frame, [CLICK_FRAME, CLICK_FRAME + 32], [0.3, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 0;

  const showButton = frame >= APPROVE_IN && frame < OVERLAY_OUT + 26;

  // Counter after cascade finishes
  const counterP = spring({
    frame: frame - COUNTER_FRAME,
    fps,
    config: { stiffness: 110, damping: 18 },
  });

  return (
    <AbsoluteFill style={{ background: "#09090b" }}>
      {/* Subtle dot-grid texture */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.02) 1px, transparent 1px)",
          backgroundSize: "30px 30px",
          pointerEvents: "none",
        }}
      />

      <MonthlyCalendar />

      {/* Logo — top center, fades with eyebrow label */}
      <div
        style={{
          position: "absolute",
          top: 200,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          opacity: labelOpacity,
        }}
      >
        <Img
          src={staticFile("launch_assets/logo.png")}
          style={{
            height: 52,
            width: "auto",
            mixBlendMode: "screen",
          }}
        />
      </div>

      {/* Eyebrow label */}
      <div
        style={{
          position: "absolute",
          bottom: 320,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontFamily: "'Inter', sans-serif",
          fontSize: 24,
          fontWeight: 700,
          color: "#f55c2a",
          textTransform: "uppercase",
          letterSpacing: "0.16em",
          opacity: labelOpacity,
        }}
      >
        A coaching business · weeks of silence
      </div>

      {/* Dim overlay */}
      {frame >= APPROVE_IN && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "#000",
            opacity: overlayOpacity,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Approve button + ripple */}
      {showButton && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            opacity: buttonOpacity,
          }}
        >
          {/* Ripple ring */}
          <div
            style={{
              position: "absolute",
              width: 620 * rippleP,
              height: 620 * rippleP,
              borderRadius: "50%",
              border: "2px solid rgba(245,92,42,0.45)",
              opacity: rippleOpacity,
              pointerEvents: "none",
            }}
          />

          <div
            style={{ transform: `scale(${buttonScale})`, textAlign: "center" }}
          >
            {/* Context line above button */}
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 18,
                color: "#52525b",
                fontWeight: 500,
                marginBottom: 24,
                letterSpacing: "0.02em",
              }}
            >
              7 videos · Week 1 · June 2026
            </div>

            {/* Button */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 14,
                padding: "22px 58px",
                background: "#f55c2a",
                borderRadius: 18,
                boxShadow: `0 0 ${88 * glow}px ${42 * glow}px rgba(245,92,42,${
                  0.28 + glow * 0.18
                }), 0 10px 36px rgba(0,0,0,0.45)`,
              }}
            >
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 30,
                  fontWeight: 800,
                  color: "#fff",
                  letterSpacing: "-0.01em",
                }}
              >
                Approve Plan
              </span>
              <span style={{ fontSize: 28, color: "rgba(255,255,255,0.85)" }}>
                →
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Click flash */}
      {flashOpacity > 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "#fff",
            opacity: flashOpacity,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Counter — slides up after cascade completes */}
      {frame >= COUNTER_FRAME && (
        <div
          style={{
            position: "absolute",
            bottom: 200,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 20,
            opacity: counterP,
            transform: `translateY(${interpolate(counterP, [0, 1], [16, 0])}px)`,
          }}
        >
          {(
            [
              { text: "7 videos.", color: "#F4F4F8" },
              { text: "·", color: "#3a3a44" },
              { text: "One approval.", color: "#F4F4F8" },
              { text: "·", color: "#3a3a44" },
              { text: "Zero editing.", color: "#34D399" },
            ] as const
          ).map(({ text, color }, i) => (
            <span
              key={i}
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: text === "·" ? 28 : 32,
                fontWeight: text === "·" ? 400 : 900,
                color,
                letterSpacing: text === "·" ? "0" : "-0.03em",
              }}
            >
              {text}
            </span>
          ))}
        </div>
      )}
    </AbsoluteFill>
  );
};
