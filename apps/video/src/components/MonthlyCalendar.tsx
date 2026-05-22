import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { CalendarCell } from "./CalendarCell";
import { LIFE_COACH_TITLES, POST_TIMES, getAppearFrame } from "../data/calendar-data";

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const MonthlyCalendar: React.FC = () => {
  const frame = useCurrentFrame();

  const headerFade = interpolate(frame, [0, 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        left: 80,
        right: 80,
        top: 30,
        bottom: 90,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Month + year header */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 10,
          height: 50,
          marginBottom: 10,
          flexShrink: 0,
          opacity: headerFade,
        }}
      >
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 30,
            fontWeight: 800,
            color: "#F4F4F8",
            letterSpacing: "-0.02em",
          }}
        >
          June
        </span>
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 30,
            fontWeight: 800,
            color: "#3a3a44",
            letterSpacing: "-0.02em",
          }}
        >
          2026
        </span>
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 12,
            fontWeight: 500,
            color: "#2a2a32",
            letterSpacing: "0.04em",
            marginLeft: 8,
          }}
        >
          · Content Calendar
        </span>
      </div>

      {/* Day-of-week headers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 8,
          marginBottom: 8,
          flexShrink: 0,
          opacity: headerFade,
        }}
      >
        {DAYS_OF_WEEK.map((d) => (
          <div
            key={d}
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 10,
              fontWeight: 700,
              color: "#2e2e38",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              height: 28,
              display: "flex",
              alignItems: "center",
              paddingLeft: 4,
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* 5 × 7 cell grid */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gridTemplateRows: "repeat(5, 1fr)",
          gap: 8,
        }}
      >
        {/* Days 1–30 with video cards */}
        {Array.from({ length: 30 }, (_, i) => (
          <CalendarCell
            key={i}
            day={i + 1}
            title={LIFE_COACH_TITLES[i]}
            postTime={POST_TIMES[i]}
            appearAtFrame={getAppearFrame(i)}
          />
        ))}

        {/* Trailing empty cells — row 5, cols 3–7 */}
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={`trail-${i}`}
            style={{
              background: "#08080b",
              border: "1px solid rgba(255,255,255,0.02)",
              borderRadius: 8,
            }}
          />
        ))}
      </div>
    </div>
  );
};
