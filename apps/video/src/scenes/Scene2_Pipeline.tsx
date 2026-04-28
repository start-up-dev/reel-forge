import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import {
  Lightbulb,
  FileText,
  Mic2,
  Image as ImageIcon,
  CheckCircle2,
} from "lucide-react";
import { PipelineNode } from "../components/PipelineNode";
import { ParticleTrail } from "../components/ParticleTrail";
import { WaveformBars } from "../components/WaveformBars";
import { Typewriter } from "../components/Typewriter";

const NODE_X = [240, 600, 960, 1320, 1680];
const NODE_Y = 480;
const NODE_SIZE = 96;
const ACTIVATE = [0, 60, 120, 180, 240];
const LINE_LEN = 264; // NODE_X spacing(360) − circle diameter(96) = 264

// lines run from right edge of circle i to left edge of circle i+1
const LINES = NODE_X.slice(0, -1).map((x, i) => ({
  x1: x + NODE_SIZE / 2,
  x2: NODE_X[i + 1] - NODE_SIZE / 2,
  y: NODE_Y,
}));

const BURST_ANGLES = Array.from(
  { length: 16 },
  (_, i) => (i / 16) * Math.PI * 2 + (i % 3) * 0.16
);
const BURST_DIST = [60, 78, 70, 85, 65, 90, 72, 80, 68, 75, 88, 62, 82, 70, 78, 65];

// local sub-component for the image grid detail
const ImageGrid: React.FC<{ activateAtFrame: number }> = ({
  activateAtFrame,
}) => {
  const frame = useCurrentFrame();
  const blur = interpolate(frame - activateAtFrame, [0, 28], [10, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const colors = ["#1B4B6B", "#4A7C59", "#6B3050", "#3A3D6B"];
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 3,
        width: 82,
      }}
    >
      {colors.map((color, i) => (
        <div
          key={i}
          style={{
            width: 38,
            height: 38,
            background: color,
            borderRadius: 4,
            filter: `blur(${blur}px)`,
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        />
      ))}
    </div>
  );
};

export const Scene2_Pipeline: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerOpacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateRight: "clamp",
  });
  const footerOpacity = spring({
    frame: frame - 258,
    fps,
    config: { damping: 22 },
  });

  // burst spring (last node activates at frame 240)
  const bp = spring({
    frame: frame - 240,
    fps,
    config: { stiffness: 260, damping: 10 },
  });

  const DETAIL_IDEA = (
    <div
      style={{
        width: 150,
        padding: "8px 12px",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 10,
        fontSize: 11,
        color: "#F4F4F8",
        fontFamily: "'Inter', sans-serif",
        lineHeight: 1.5,
      }}
    >
      <Typewriter
        text="Hidden coffee shops of Tokyo documentary."
        speed={0.5}
      />
    </div>
  );

  const DETAIL_SCRIPT = (
    <div
      style={{
        width: 160,
        fontSize: 10,
        fontFamily: "'Inter', sans-serif",
        lineHeight: 1.55,
      }}
    >
      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          color: "#f55c2a",
          marginBottom: 2,
        }}
      >
        0:00
      </div>
      <div style={{ color: "#a1a1aa", marginBottom: 8 }}>
        In the neon-lit alleys of Tokyo...
      </div>
      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          color: "#f55c2a",
          marginBottom: 2,
        }}
      >
        0:15
      </div>
      <div style={{ color: "#a1a1aa" }}>coffee isn't just a drink.</div>
    </div>
  );

  const DETAIL_VOICE = (
    <WaveformBars
      totalWidth={150}
      barCount={18}
      maxHeight={44}
      minHeight={5}
      color="#f55c2a"
      speed={0.14}
    />
  );

  const DETAIL_IMAGES = <ImageGrid activateAtFrame={ACTIVATE[3]} />;

  const DETAIL_VIDEO = (
    <div
      style={{
        width: 44,
        height: 76,
        borderRadius: 10,
        border: "2px solid rgba(245,92,42,0.55)",
        background: "rgba(245,92,42,0.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <CheckCircle2 size={24} color="#34D399" />
    </div>
  );

  const nodeDetails = [
    DETAIL_IDEA,
    DETAIL_SCRIPT,
    DETAIL_VOICE,
    DETAIL_IMAGES,
    DETAIL_VIDEO,
  ];

  const nodeIcons = [
    <Lightbulb size={34} />,
    <FileText size={34} />,
    <Mic2 size={34} />,
    <ImageIcon size={34} />,
    <CheckCircle2 size={34} />,
  ];

  const nodeLabels = [
    "Your Idea",
    "AI Script",
    "ElevenLabs Voice",
    "Grok Images",
    "Your Video",
  ];

  return (
    <AbsoluteFill style={{ background: "#09090b" }}>
      {/* dot-grid texture */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          pointerEvents: "none",
        }}
      />

      {/* scanline overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.018) 2px, rgba(255,255,255,0.018) 4px)",
          pointerEvents: "none",
        }}
      />

      {/* header */}
      <div
        style={{
          position: "absolute",
          top: 66,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: headerOpacity,
        }}
      >
        <div
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 11,
            fontWeight: 700,
            color: "#f55c2a",
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            marginBottom: 12,
          }}
        >
          The Automated Pipeline
        </div>
        <div
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 40,
            fontWeight: 900,
            color: "#F4F4F8",
            letterSpacing: "-0.02em",
            lineHeight: 1,
          }}
        >
          5 AI steps. Zero manual work.
        </div>
      </div>

      {/* SVG layer: connection lines + burst particles */}
      <svg
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 1920,
          height: 1080,
          pointerEvents: "none",
          overflow: "visible",
        }}
      >
        {/* static dim lines (always visible as background guides) */}
        {LINES.map((ln, i) => (
          <line
            key={`dim-${i}`}
            x1={ln.x1}
            y1={ln.y}
            x2={ln.x2}
            y2={ln.y}
            stroke="rgba(255,255,255,0.07)"
            strokeWidth={2}
          />
        ))}

        {/* animated drawing lines */}
        {LINES.map((ln, i) => {
          const progress = interpolate(
            frame,
            [ACTIVATE[i] + 4, ACTIVATE[i + 1]],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );
          return (
            <line
              key={`anim-${i}`}
              x1={ln.x1}
              y1={ln.y}
              x2={ln.x2}
              y2={ln.y}
              stroke="#f55c2a"
              strokeWidth={2.5}
              strokeDasharray={LINE_LEN}
              strokeDashoffset={LINE_LEN * (1 - progress)}
              style={{ filter: "drop-shadow(0 0 4px #f55c2a)" }}
            />
          );
        })}

        {/* burst particles at last node */}
        {frame >= 238 &&
          BURST_ANGLES.map((angle, i) => {
            const dist = BURST_DIST[i] * bp;
            const bx = NODE_X[4] + Math.cos(angle) * dist;
            const by = NODE_Y + Math.sin(angle) * dist;
            const opacity = interpolate(bp, [0, 0.15, 1], [0, 1, 0]);
            return (
              <circle
                key={`burst-${i}`}
                cx={bx}
                cy={by}
                r={3 + (i % 3)}
                fill="#f55c2a"
                opacity={opacity}
                style={{ filter: "drop-shadow(0 0 5px #f55c2a)" }}
              />
            );
          })}
      </svg>

      {/* particle trails between nodes */}
      {LINES.map((ln, i) => (
        <ParticleTrail
          key={`trail-${i}`}
          x1={ln.x1}
          y1={ln.y}
          x2={ln.x2}
          y2={ln.y}
          count={9}
          color="#f55c2a"
          startFrame={ACTIVATE[i] + 4}
          endFrame={ACTIVATE[i + 1]}
          size={7}
        />
      ))}

      {/* pipeline nodes */}
      {NODE_X.map((x, i) => (
        <PipelineNode
          key={i}
          icon={nodeIcons[i]}
          label={nodeLabels[i]}
          activateAtFrame={ACTIVATE[i]}
          detail={nodeDetails[i]}
          x={x}
          y={NODE_Y}
          size={NODE_SIZE}
        />
      ))}

      {/* footer */}
      <div
        style={{
          position: "absolute",
          bottom: 72,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: footerOpacity,
        }}
      >
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 20,
            fontWeight: 600,
            color: "#52525b",
            letterSpacing: "0.04em",
          }}
        >
          Zero manual effort.{" "}
          <span style={{ color: "#a1a1aa" }}>Fully automated.</span>
        </span>
      </div>
    </AbsoluteFill>
  );
};
