import { ImageResponse } from "next/og";

export const alt = "ReelForge — AI Short-Form Video Content Machine";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function loadInterFont(weight: 700 | 900): Promise<ArrayBuffer> {
  const url = `https://cdn.jsdelivr.net/npm/@fontsource/inter@5.1.0/files/inter-latin-${weight}-normal.woff`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Font fetch failed: ${res.status}`);
  return res.arrayBuffer();
}

export default async function Image() {
  const [interBold, interBlack] = await Promise.all([
    loadInterFont(700),
    loadInterFont(900),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          backgroundColor: "#09090b",
          padding: "60px 80px",
          fontFamily: "Inter",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Orange glow — top right */}
        <div
          style={{
            position: "absolute",
            top: "-180px",
            right: "-180px",
            width: "700px",
            height: "700px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(245,92,42,0.18) 0%, transparent 65%)",
            display: "flex",
          }}
        />
        {/* Blue glow — bottom left */}
        <div
          style={{
            position: "absolute",
            bottom: "-160px",
            left: "-160px",
            width: "520px",
            height: "520px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(74,144,226,0.1) 0%, transparent 65%)",
            display: "flex",
          }}
        />

        {/* Top content */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {/* Badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(245,92,42,0.1)",
              border: "1.5px solid rgba(245,92,42,0.35)",
              borderRadius: "100px",
              padding: "10px 22px",
              width: "fit-content",
              marginBottom: "32px",
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#f55c2a",
                display: "flex",
              }}
            />
            <span
              style={{
                color: "#f55c2a",
                fontSize: "15px",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              AI Short-Form Video Automation
            </span>
          </div>

          {/* Product name */}
          <div
            style={{
              fontSize: "100px",
              fontWeight: 900,
              color: "#F4F4F8",
              lineHeight: 1,
              letterSpacing: "-0.04em",
              marginBottom: "18px",
              display: "flex",
            }}
          >
            ReelForge
          </div>

          {/* Tagline */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginBottom: "44px",
            }}
          >
            <span
              style={{
                fontSize: "34px",
                fontWeight: 700,
                color: "#71717a",
                lineHeight: 1.35,
              }}
            >
              Your Content Channel,
            </span>
            <span
              style={{
                fontSize: "34px",
                fontWeight: 700,
                color: "#f55c2a",
                lineHeight: 1.35,
              }}
            >
              On Autopilot.
            </span>
          </div>

          {/* Stat pills */}
          <div style={{ display: "flex", gap: "14px" }}>
            {["7 Videos / Week", "10 Min Setup", "Auto-Posts to Social"].map(
              (stat) => (
                <div
                  key={stat}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.09)",
                    borderRadius: "12px",
                    padding: "12px 22px",
                    color: "#a1a1aa",
                    fontSize: "16px",
                    fontWeight: 700,
                  }}
                >
                  {stat}
                </div>
              ),
            )}
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(255,255,255,0.07)",
            paddingTop: "20px",
          }}
        >
          <span
            style={{
              fontSize: "18px",
              fontWeight: 700,
              color: "#3f3f46",
              letterSpacing: "0.04em",
            }}
          >
            aireelforge.com
          </span>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "rgba(245,92,42,0.08)",
              border: "1px solid rgba(245,92,42,0.2)",
              borderRadius: "8px",
              padding: "6px 14px",
            }}
          >
            <span
              style={{
                fontSize: "13px",
                fontWeight: 700,
                color: "#f55c2a",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Start for $5 →
            </span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Inter", data: interBold, style: "normal", weight: 700 },
        { name: "Inter", data: interBlack, style: "normal", weight: 900 },
      ],
    },
  );
}
