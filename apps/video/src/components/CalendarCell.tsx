import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

interface CalendarCellProps {
  day: number;
  title?: string;
  postTime?: string;
  appearAtFrame: number;
}

export const CalendarCell: React.FC<CalendarCellProps> = ({
  day,
  title,
  postTime,
  appearAtFrame,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const hasCard = !!title && frame >= appearAtFrame;

  const p = hasCard
    ? spring({
        frame: frame - appearAtFrame,
        fps,
        config: { stiffness: 280, damping: 22 },
      })
    : 0;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: hasCard ? "#13131a" : "#0c0c10",
        border: `1px solid ${hasCard ? "rgba(245,92,42,0.14)" : "rgba(255,255,255,0.04)"}`,
        borderRadius: 8,
        padding: "9px 10px 8px 12px",
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {/* orange left accent */}
      {hasCard && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 3,
            background: "#f55c2a",
            borderRadius: "8px 0 0 8px",
            opacity: p,
          }}
        />
      )}

      {/* day number */}
      <div
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 10,
          fontWeight: 700,
          color: hasCard ? "#3a3a44" : "#222228",
          marginBottom: 6,
          lineHeight: 1,
        }}
      >
        {day}
      </div>

      {hasCard && (
        <div
          style={{
            opacity: p,
            transform: `translateY(${interpolate(p, [0, 1], [5, 0])}px)`,
          }}
        >
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 11,
              fontWeight: 600,
              color: "#E4E4E8",
              lineHeight: 1.4,
              maxHeight: "2.9em",
              overflow: "hidden",
              paddingLeft: 8,
              marginBottom: 5,
            }}
          >
            {title}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              paddingLeft: 8,
            }}
          >
            <div
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: "#34D399",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 9,
                color: "#52525b",
                fontWeight: 500,
              }}
            >
              Posted · {postTime}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
