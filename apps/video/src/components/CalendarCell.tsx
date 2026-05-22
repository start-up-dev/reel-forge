import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

interface WeekCardProps {
  dayName: string;
  date: string;
  title: string;
  postTime: string;
  style: string;
  appearAtFrame: number;
}

export const CalendarCell: React.FC<WeekCardProps> = ({
  dayName,
  date,
  title,
  postTime,
  style,
  appearAtFrame,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const active = frame >= appearAtFrame;

  const p = active
    ? spring({
        frame: frame - appearAtFrame,
        fps,
        config: { stiffness: 260, damping: 22 },
      })
    : 0;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: active ? "#111118" : "#0c0c10",
        border: `1px solid ${active ? "rgba(245,92,42,0.22)" : "rgba(255,255,255,0.05)"}`,
        borderRadius: 14,
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
        padding: "18px 16px 16px",
        display: "flex",
        flexDirection: "column",
        opacity: active ? 1 : 0.35,
        transform: `scale(${interpolate(p, [0, 1], [0.94, 1])}) translateY(${interpolate(p, [0, 1], [14, 0])}px)`,
      }}
    >
      {/* Orange left accent bar */}
      {active && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 4,
            background: "linear-gradient(to bottom, #f55c2a, #e04415)",
            borderRadius: "14px 0 0 14px",
            opacity: p,
          }}
        />
      )}

      {/* Day name */}
      <div
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 11,
          fontWeight: 800,
          color: active ? "#f55c2a" : "#2e2e38",
          textTransform: "uppercase",
          letterSpacing: "0.18em",
          marginBottom: 4,
          opacity: active ? p : 1,
        }}
      >
        {dayName}
      </div>

      {/* Date */}
      <div
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 26,
          fontWeight: 900,
          color: active ? "#F4F4F8" : "#222228",
          letterSpacing: "-0.03em",
          lineHeight: 1,
          marginBottom: 12,
          opacity: active ? p : 1,
        }}
      >
        {date}
      </div>

      {/* Divider */}
      <div
        style={{
          height: 1,
          background: active ? "rgba(245,92,42,0.18)" : "rgba(255,255,255,0.04)",
          marginBottom: 14,
          opacity: active ? p : 1,
        }}
      />

      {/* Video title — grows to fill remaining space */}
      {active ? (
        <div
          style={{
            flex: 1,
            fontFamily: "'Inter', sans-serif",
            fontSize: 15,
            fontWeight: 700,
            color: "#E4E4F0",
            lineHeight: 1.5,
            overflow: "hidden",
            opacity: p,
            transform: `translateY(${interpolate(p, [0, 1], [8, 0])}px)`,
          }}
        >
          {title}
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, paddingTop: 2 }}>
          <div style={{ height: 10, borderRadius: 4, background: "rgba(255,255,255,0.05)", width: "90%" }} />
          <div style={{ height: 10, borderRadius: 4, background: "rgba(255,255,255,0.04)", width: "72%" }} />
          <div style={{ height: 10, borderRadius: 4, background: "rgba(255,255,255,0.03)", width: "82%" }} />
        </div>
      )}

      {/* Footer: style pill + post time */}
      {active && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginTop: 14,
            opacity: p,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignSelf: "flex-start",
              padding: "4px 10px",
              borderRadius: 9999,
              background: "rgba(245,92,42,0.12)",
              border: "1px solid rgba(245,92,42,0.25)",
            }}
          >
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 11,
                fontWeight: 700,
                color: "#f55c2a",
                letterSpacing: "0.04em",
              }}
            >
              {style}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
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
                fontSize: 13,
                fontWeight: 600,
                color: "#52525b",
              }}
            >
              {postTime}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
