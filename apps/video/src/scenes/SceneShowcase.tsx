import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  staticFile,
} from "remotion";
import { Heart, MessageCircle, Share2, Bookmark, Check } from "lucide-react";

const LOCAL = (name: string) => staticFile(`launch_assets/${name}`);

const PHONES = [
  {
    style: "CMO",
    niche: "Marketing",
    creator: "ReelForge CMO",
    hook: "How we grew to 50K views in 30 days",
    gradient: "linear-gradient(160deg, #0f172a 0%, #1e3a5f 100%)",
    accent: "#4a90e2",
    videoUrl: LOCAL("ReelForgeCMO.mp4"),
  },
  {
    style: "Coaching",
    niche: "Business Coach",
    creator: "Business Coach",
    hook: "The $10K client acquisition system",
    gradient: "linear-gradient(160deg, #1a0505 0%, #3d1a0a 100%)",
    accent: "#f55c2a",
    videoUrl: LOCAL("BuisnessCoach.mp4"),
  },
  {
    style: "Real Estate",
    niche: "Real Estate",
    creator: "Property Pro",
    hook: "3 things buyers never tell you",
    gradient: "linear-gradient(160deg, #0a1a0f 0%, #1a3020 100%)",
    accent: "#34d399",
    videoUrl: LOCAL("RealEstate.mp4"),
  },
  {
    style: "CMO",
    niche: "Marketing",
    creator: "ReelForge CMO",
    hook: "AI-generated content that actually converts",
    gradient: "linear-gradient(160deg, #0d0d1a 0%, #1a1040 100%)",
    accent: "#a78bfa",
    videoUrl: LOCAL("ReelForgeCMO.mp4"),
  },
  {
    style: "Coaching",
    niche: "Business Coach",
    creator: "Business Coach",
    hook: "Stop trading time for money",
    gradient: "linear-gradient(160deg, #001a1a 0%, #003d3d 100%)",
    accent: "#2dd4bf",
    videoUrl: LOCAL("BuisnessCoach.mp4"),
  },
  {
    style: "Real Estate",
    niche: "Real Estate",
    creator: "Property Pro",
    hook: "Why most homes sit on the market too long",
    gradient: "linear-gradient(160deg, #1a1500 0%, #3d3000 100%)",
    accent: "#fbbf24",
    videoUrl: LOCAL("RealEstate.mp4"),
  },
  {
    style: "CMO",
    niche: "Marketing",
    creator: "ReelForge CMO",
    hook: "Your Facebook page on autopilot",
    gradient: "linear-gradient(160deg, #0a1a2e 0%, #1a2e4a 100%)",
    accent: "#4a90e2",
    videoUrl: LOCAL("ReelForgeCMO.mp4"),
  },
];

// Vertical stagger offsets (px) per phone — mirrors landing page
const V_OFFSETS = [0, -60, -20, -100, -10, -50, -30];

const LIKES = ["2.4K", "18K", "892", "5.1K", "341", "12K", "2.8K"];
const COMMENTS = ["128", "842", "67", "234", "48", "391", "156"];

const PHONE_W = 258;
const PHONE_GAP = 40;

function PhoneCard({
  phone,
  vOffset,
  likes,
  comments,
  entryDelay,
}: {
  phone: (typeof PHONES)[number];
  vOffset: number;
  likes: string;
  comments: string;
  entryDelay: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entryP = spring({
    frame: frame - entryDelay,
    fps,
    config: { stiffness: 80, damping: 20 },
  });

  const initials = phone.creator
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("");

  return (
    <div
      style={{
        width: PHONE_W,
        flexShrink: 0,
        marginBottom: `${Math.abs(vOffset)}px`,
        marginTop: vOffset < 0 ? 0 : `${Math.abs(vOffset)}px`,
        opacity: entryP,
        transform: `translateY(${interpolate(entryP, [0, 1], [40, 0])}px) scale(${interpolate(entryP, [0, 1], [0.96, 1])})`,
      }}
    >
      {/* Phone shell */}
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: "2.5rem",
          border: "6px solid #18181b",
          background: "#000",
          boxShadow: "0 30px 80px rgba(0,0,0,0.8)",
        }}
      >
        {/* Notch */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            paddingTop: 8,
            paddingBottom: 6,
          }}
        >
          <div
            style={{
              height: 6,
              width: 56,
              borderRadius: 9999,
              background: "#27272a",
            }}
          />
        </div>

        {/* Screen */}
        <div
          style={{
            position: "relative",
            marginLeft: 4,
            marginRight: 4,
            marginBottom: 4,
            overflow: "hidden",
            borderRadius: "1rem",
            height: 456,
            background: "#000",
          }}
        >
          {/* Gradient fallback — sits behind video */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: phone.gradient,
              zIndex: 0,
            }}
          />
          {/* Video — on top of gradient */}
          <video
            src={phone.videoUrl}
            autoPlay
            muted
            loop
            playsInline
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              zIndex: 1,
            }}
            onError={(e) => {
              (e.target as HTMLVideoElement).style.display = "none";
            }}
          />

          {/* Top-to-bottom scrim */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 35%, transparent 55%, rgba(0,0,0,0.8) 100%)",
              zIndex: 10,
            }}
          />

          {/* Right engagement column */}
          <div
            style={{
              position: "absolute",
              right: 10,
              bottom: 96,
              zIndex: 20,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
              }}
            >
              <Heart
                size={22}
                color="#fff"
                style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))" }}
              />
              <span
                style={{
                  color: "#fff",
                  fontSize: 8,
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 700,
                }}
              >
                {likes}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
              }}
            >
              <MessageCircle
                size={22}
                color="#fff"
                style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))" }}
              />
              <span
                style={{
                  color: "#fff",
                  fontSize: 8,
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 700,
                }}
              >
                {comments}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
              }}
            >
              <Share2
                size={22}
                color="#fff"
                style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))" }}
              />
              <span
                style={{
                  color: "#fff",
                  fontSize: 8,
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 700,
                }}
              >
                Share
              </span>
            </div>
            <Bookmark
              size={22}
              color="#fff"
              style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))" }}
            />
          </div>

          {/* Bottom creator info */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 44,
              zIndex: 20,
              padding: "0 12px 10px",
            }}
          >
            {/* Creator row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 4,
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: phone.accent,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 8,
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 900,
                  border: "1px solid rgba(255,255,255,0.2)",
                  flexShrink: 0,
                }}
              >
                {initials}
              </div>
              <span
                style={{
                  color: "#fff",
                  fontSize: 8,
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 900,
                  filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))",
                }}
              >
                {phone.creator}
              </span>
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: "#1877F2",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Check size={7} color="#fff" strokeWidth={4} />
              </div>
              <span
                style={{
                  color: "rgba(255,255,255,0.5)",
                  fontSize: 9,
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 700,
                }}
              >
                · Follow
              </span>
            </div>

            {/* Hook text */}
            <p
              style={{
                color: "#fff",
                fontSize: 10,
                fontFamily: "'Inter', sans-serif",
                lineHeight: 1.4,
                marginBottom: 8,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))",
              }}
            >
              {phone.hook}{" "}
              <span style={{ color: "rgba(255,255,255,0.4)" }}>... more</span>
            </p>

            {/* Comment input */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(255,255,255,0.08)",
                borderRadius: 9999,
                padding: "4px 10px",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <span
                style={{
                  color: "rgba(255,255,255,0.4)",
                  fontSize: 9,
                  fontFamily: "'Inter', sans-serif",
                  flex: 1,
                }}
              >
                Add a comment
              </span>
              <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 10 }}>
                😊
              </span>
              <span
                style={{
                  color: "rgba(255,255,255,0.35)",
                  fontSize: 8,
                  fontWeight: 900,
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                GIF
              </span>
            </div>
          </div>
        </div>

        {/* Home indicator */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "6px 0",
            background: "#000",
          }}
        >
          <div
            style={{
              height: 4,
              width: 64,
              borderRadius: 9999,
              background: "#27272a",
            }}
          />
        </div>
      </div>

      {/* Style tag below phone */}
      <div
        style={{
          textAlign: "center",
          marginTop: 14,
          fontFamily: "'Inter', sans-serif",
          fontSize: 10,
          fontWeight: 700,
          color: "#52525b",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
        }}
      >
        {phone.style} · {phone.niche}
      </div>
    </div>
  );
}

export const SceneShowcase: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const totalRowWidth =
    PHONES.length * PHONE_W + (PHONES.length - 1) * PHONE_GAP;
  // Start centered (slight overflow on both sides), then drift left
  const initialX = (1920 - totalRowWidth) / 2;
  const scrollX = initialX - frame * 1.6;

  // Header entrance
  const labelP = spring({
    frame,
    fps,
    config: { stiffness: 120, damping: 22 },
  });
  const badgeP = spring({
    frame: frame - 30,
    fps,
    config: { stiffness: 120, damping: 22 },
  });

  return (
    <AbsoluteFill style={{ background: "#09090b", overflow: "hidden" }}>
      {/* Fade edge masks — left and right */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 200,
          background: "linear-gradient(to right, #09090b, transparent)",
          zIndex: 10,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          width: 200,
          background: "linear-gradient(to left, #09090b, transparent)",
          zIndex: 10,
          pointerEvents: "none",
        }}
      />

      {/* Section label */}
      <div
        style={{
          position: "absolute",
          top: 48,
          left: 0,
          right: 0,
          textAlign: "center",
          zIndex: 20,
          opacity: labelP,
          transform: `translateY(${interpolate(labelP, [0, 1], [-10, 0])}px)`,
        }}
      >
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            position: "absolute",
            top: 50,
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: 24,
            fontWeight: 700,
            color: "#f55c2a",
            textTransform: "uppercase",
            letterSpacing: "0.2em",
            zIndex: 20,
          }}
        >
          Built with ReelForge
        </span>
      </div>

      {/* Scrolling phone row */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          transform: `translateY(-52%) translateX(${scrollX}px)`,
          display: "flex",
          gap: PHONE_GAP,
          alignItems: "flex-end",
        }}
      >
        {PHONES.map((phone, i) => (
          <PhoneCard
            key={i}
            phone={phone}
            vOffset={V_OFFSETS[i] ?? 0}
            likes={LIKES[i] ?? "1K"}
            comments={COMMENTS[i] ?? "100"}
            entryDelay={i * 4}
          />
        ))}
      </div>

      {/* Human-reviewed badge — bottom center */}
      <div
        style={{
          position: "absolute",
          bottom: 44,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          zIndex: 20,
          opacity: badgeP,
          transform: `translateY(${interpolate(badgeP, [0, 1], [12, 0])}px)`,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 22px",
            background: "rgba(52,211,153,0.07)",
            border: "1px solid rgba(52,211,153,0.18)",
            borderRadius: 9999,
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
              position: "absolute",
              bottom: 100,
              left: "50%",
              transform: "translateX(-50%)",
              fontSize: 24,
              fontWeight: 700,
              color: "#34D399",
              letterSpacing: "0.02em",
            }}
          >
            Every clip personally reviewed by our team before it posts
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
