import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

function formatHMS(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function formatMS(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export const Scene1_Claim: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // counters animate over 120 frames
  const leftSecs = interpolate(frame, [0, 120], [0, 14400], {
    extrapolateRight: "clamp",
  });
  const rightSecs = interpolate(frame, [0, 120], [600, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // card entry springs
  const leftEntry = spring({ frame, fps, config: { damping: 22 } });
  const rightEntry = spring({
    frame: frame - 10,
    fps,
    config: { damping: 22 },
  });

  // arrow draws itself
  const arrowProgress = interpolate(frame, [55, 88], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // tagline words
  const WORDS = ["One", "idea.", "One", "click.", "Finished."];

  const label: React.CSSProperties = {
    fontFamily: "'Inter', sans-serif",
    fontSize: 12,
    fontWeight: 600,
    color: "#a1a1aa",
    textTransform: "uppercase",
    letterSpacing: "0.16em",
    marginTop: 18,
  };

  return (
    <AbsoluteFill
      style={{
        background: "#09090b",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 52,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 800px 500px at 50% 40%, rgba(245,92,42,0.1), transparent)",
          pointerEvents: "none",
        }}
      />

      {/* counters row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 64,
          zIndex: 1,
        }}
      >
        {/* left — old way */}
        <div
          style={{
            textAlign: "center",
            transform: `translateX(${interpolate(leftEntry, [0, 1], [-80, 0])}px)`,
            opacity: leftEntry,
          }}
        >
          <div
            style={{
              fontFamily: "'JetBrains Mono', 'Courier New', monospace",
              fontSize: 96,
              fontWeight: 700,
              color: "#F87171",
              lineHeight: 1,
              letterSpacing: "-0.02em",
            }}
          >
            {formatHMS(Math.floor(leftSecs))}
          </div>
          <div style={label}>The Old Way</div>
        </div>

        {/* arrow */}
        <div>
          <svg
            width="100"
            height="48"
            viewBox="0 0 100 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M8 24 L80 24 M62 10 L80 24 L62 38"
              stroke="#f55c2a"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="110"
              strokeDashoffset={110 * (1 - arrowProgress)}
            />
          </svg>
        </div>

        {/* right — reelforge */}
        <div
          style={{
            textAlign: "center",
            transform: `translateX(${interpolate(rightEntry, [0, 1], [80, 0])}px)`,
            opacity: rightEntry,
          }}
        >
          <div
            style={{
              fontFamily: "'JetBrains Mono', 'Courier New', monospace",
              fontSize: 96,
              fontWeight: 700,
              color: "#34D399",
              lineHeight: 1,
              letterSpacing: "-0.02em",
            }}
          >
            {formatMS(Math.floor(rightSecs))}
          </div>
          <div style={label}>With ReelForge</div>
        </div>
      </div>

      {/* tagline */}
      <div
        style={{
          display: "flex",
          gap: 18,
          alignItems: "center",
          zIndex: 1,
        }}
      >
        {WORDS.map((word, i) => {
          const wp = spring({
            frame: frame - (80 + i * 8),
            fps,
            config: { stiffness: 160, damping: 20 },
          });
          return (
            <span
              key={i}
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 48,
                fontWeight: 800,
                color: "#F4F4F8",
                letterSpacing: "-0.02em",
                opacity: wp,
                transform: `translateY(${interpolate(wp, [0, 1], [22, 0])}px)`,
                display: "inline-block",
              }}
            >
              {word}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
