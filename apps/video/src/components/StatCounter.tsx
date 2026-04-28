import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

type Format = "number" | "hms" | "mms";

interface StatCounterProps {
  from?: number;
  to: number;
  duration?: number;
  delay?: number;
  suffix?: string;
  prefix?: string;
  format?: Format;
  style?: React.CSSProperties;
}

export const StatCounter: React.FC<StatCounterProps> = ({
  from = 0,
  to,
  duration = 90,
  delay = 0,
  suffix = "",
  prefix = "",
  format = "number",
  style,
}) => {
  const frame = useCurrentFrame();

  const value = interpolate(frame - delay, [0, duration], [from, to], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const display = formatValue(Math.floor(value), format);

  return (
    <span style={style}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
};

function formatValue(v: number, format: Format): string {
  if (format === "hms") {
    const h = Math.floor(Math.abs(v) / 3600);
    const m = Math.floor((Math.abs(v) % 3600) / 60);
    const s = Math.abs(v) % 60;
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  if (format === "mms") {
    const m = Math.floor(Math.abs(v) / 60);
    const s = Math.abs(v) % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }
  return Math.abs(v).toLocaleString();
}
