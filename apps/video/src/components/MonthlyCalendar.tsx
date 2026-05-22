import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { CalendarCell } from "./CalendarCell";
import {
  WEEK_TITLES,
  WEEK_DAYS,
  WEEK_DATES,
  WEEK_TIMES,
  WEEK_STYLES,
  getAppearFrame,
} from "../data/calendar-data";

export const MonthlyCalendar: React.FC = () => {
  const frame = useCurrentFrame();

  const headerFade = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 44,
      }}
    >
      {/* Header — centered, large and readable */}
      <div
        style={{
          textAlign: "center",
          opacity: headerFade,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 14,
            justifyContent: "center",
            marginBottom: 12,
          }}
        >
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 44,
              fontWeight: 900,
              color: "#F4F4F8",
              letterSpacing: "-0.03em",
            }}
          >
            Week 1
          </span>
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 44,
              fontWeight: 900,
              color: "#2e2e38",
              letterSpacing: "-0.03em",
            }}
          >
            · June 2026
          </span>
        </div>
        <div
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 20,
            fontWeight: 600,
            color: "#52525b",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          Life Coach · 1 post per day
        </div>
      </div>

      {/* 7-column card grid — fixed 3:4 ratio height */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 16,
          width: 1760,
          height: 322,
        }}
      >
        {WEEK_TITLES.map((title, i) => (
          <CalendarCell
            key={i}
            dayName={WEEK_DAYS[i]}
            date={WEEK_DATES[i]}
            title={title}
            postTime={WEEK_TIMES[i]}
            style={WEEK_STYLES[i]}
            appearAtFrame={getAppearFrame(i)}
          />
        ))}
      </div>
    </div>
  );
};
