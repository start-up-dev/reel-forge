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

export const SceneOutput: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const dashP = spring({ frame, fps, config: { stiffness: 85, damping: 22 } });
  const phoneP = spring({ frame: frame - 14, fps, config: { stiffness: 85, damping: 22 } });
  const badgeP = spring({ frame: frame - 45, fps, config: { stiffness: 150, damping: 22 } });
  const labelP = spring({ frame: frame - 6, fps, config: { stiffness: 120, damping: 22 } });

  return (
    <AbsoluteFill style={{ background: "#09090b" }}>
      {/* Radial glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 1500px 700px at 50% 55%, rgba(245,92,42,0.07), transparent)",
          pointerEvents: "none",
        }}
      />

      {/* "Here's what they look like" label */}
      <div
        style={{
          position: "absolute",
          top: 52,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: labelP,
          transform: `translateY(${interpolate(labelP, [0, 1], [-10, 0])}px)`,
        }}
      >
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            fontWeight: 700,
            color: "#f55c2a",
            textTransform: "uppercase",
            letterSpacing: "0.18em",
          }}
        >
          Real output
        </span>
      </div>

      {/* Dashboard screenshot — slides from left */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 420,
          top: "50%",
          transform: `translateY(-48%) translateX(${interpolate(
            dashP,
            [0, 1],
            [-50, 0]
          )}px)`,
          opacity: dashP,
        }}
      >
        <div
          style={{
            borderRadius: 14,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.07)",
            boxShadow: "0 20px 70px rgba(0,0,0,0.6)",
          }}
        >
          <Img
            src={staticFile("launch_assets/calender-ui.png")}
            style={{ width: "100%", display: "block" }}
          />
        </div>
      </div>

      {/* Phone — slides from right, overlaps dashboard */}
      <div
        style={{
          position: "absolute",
          right: 82,
          top: "50%",
          width: 300,
          transform: `translateY(-58%) translateX(${interpolate(
            phoneP,
            [0, 1],
            [50, 0]
          )}px) scale(${interpolate(phoneP, [0, 1], [0.92, 1])})`,
          opacity: phoneP,
          zIndex: 2,
        }}
      >
        <div
          style={{
            borderRadius: 40,
            overflow: "hidden",
            boxShadow:
              "0 40px 120px rgba(0,0,0,0.85), 0 0 80px rgba(245,92,42,0.15)",
          }}
        >
          <Img
            src={staticFile("launch_assets/fb-reel-ui.png")}
            style={{ width: "100%", display: "block" }}
          />
        </div>
      </div>

      {/* Human-reviewed badge */}
      <div
        style={{
          position: "absolute",
          bottom: 56,
          right: 82,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "11px 20px",
          background: "rgba(52,211,153,0.07)",
          border: "1px solid rgba(52,211,153,0.18)",
          borderRadius: 40,
          opacity: badgeP,
          transform: `translateY(${interpolate(badgeP, [0, 1], [10, 0])}px)`,
        }}
      >
        <div
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "#34D399",
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 12,
            fontWeight: 600,
            color: "#34D399",
            letterSpacing: "0.02em",
          }}
        >
          Every clip reviewed by our team
        </span>
      </div>
    </AbsoluteFill>
  );
};
