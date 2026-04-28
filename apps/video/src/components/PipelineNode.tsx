import React from "react";
import { useCurrentFrame, spring, interpolate, useVideoConfig } from "remotion";

interface PipelineNodeProps {
  icon: React.ReactNode;
  label: string;
  activateAtFrame: number;
  detail?: React.ReactNode;
  x: number;
  y: number;
  size?: number;
}

export const PipelineNode: React.FC<PipelineNodeProps> = ({
  icon,
  label,
  activateAtFrame,
  detail,
  x,
  y,
  size = 96,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const isActive = frame >= activateAtFrame;

  const activation = spring({
    frame: frame - activateAtFrame,
    fps,
    config: { stiffness: 200, damping: 14 },
  });

  // sonar ring expands then fades
  const ringScale = interpolate(activation, [0, 1], [1, 2.6]);
  const ringOpacity = interpolate(activation, [0, 0.25, 1], [0.9, 0.5, 0]);

  const labelOpacity = isActive
    ? spring({
        frame: frame - activateAtFrame - 6,
        fps,
        config: { damping: 22 },
      })
    : 0;

  const detailOpacity = isActive
    ? spring({
        frame: frame - activateAtFrame - 12,
        fps,
        config: { damping: 22 },
      })
    : 0;

  const circleGlow = isActive
    ? `0 0 ${32 * activation}px rgba(124,92,252,0.55)`
    : "none";

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: "translate(-50%, -50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {/* circle + sonar ring */}
      <div style={{ position: "relative", width: size, height: size }}>
        {/* sonar ring */}
        {isActive && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: size,
              height: size,
              transform: `translate(-50%, -50%) scale(${ringScale})`,
              borderRadius: "50%",
              border: "2px solid #7C5CFC",
              opacity: ringOpacity,
              pointerEvents: "none",
            }}
          />
        )}

        {/* node circle */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            width: size,
            height: size,
            borderRadius: "50%",
            background: isActive
              ? "radial-gradient(circle, rgba(124,92,252,0.28), rgba(124,92,252,0.06))"
              : "rgba(255,255,255,0.03)",
            border: `2px solid ${isActive ? "#7C5CFC" : "rgba(255,255,255,0.1)"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: isActive ? "#7C5CFC" : "#5A5A72",
            boxShadow: circleGlow,
            transition: "color 0.2s, border-color 0.2s",
          }}
        >
          {icon}
        </div>
      </div>

      {/* label */}
      <div
        style={{
          marginTop: 14,
          fontSize: 13,
          fontWeight: 600,
          fontFamily: "'Inter', sans-serif",
          color: "#9898B0",
          whiteSpace: "nowrap",
          opacity: labelOpacity,
          textAlign: "center",
        }}
      >
        {label}
      </div>

      {/* micro-detail */}
      {detail && (
        <div
          style={{
            marginTop: 10,
            opacity: detailOpacity,
            display: "flex",
            justifyContent: "center",
          }}
        >
          {detail}
        </div>
      )}
    </div>
  );
};
