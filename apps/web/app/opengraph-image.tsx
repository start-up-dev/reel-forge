import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import { join } from "path";

export const alt =
  "ReelForge — Automatic Facebook Video Maker for Small Business";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function loadFont(
  weight: 700 | 900,
  style: "normal" | "italic" = "normal",
): Promise<ArrayBuffer | null> {
  const url = `https://cdn.jsdelivr.net/npm/@fontsource/inter@5.1.0/files/inter-latin-${weight}-${style}.woff`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return res.arrayBuffer();
  } catch {
    return null;
  }
}

async function loadLogo(): Promise<string | null> {
  try {
    const buf = await readFile(join(process.cwd(), "public/logo.png"));
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

async function loadOgBg(): Promise<string | null> {
  try {
    const buf = await readFile(join(process.cwd(), "public/og-bg.png"));
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export default async function Image() {
  const [bold, black, blackItalic, logo, ogBg] = await Promise.all([
    loadFont(700),
    loadFont(900),
    loadFont(900, "italic"),
    loadLogo(),
    loadOgBg(),
  ]);

  const fonts: {
    name: string;
    data: ArrayBuffer;
    style: "normal" | "italic";
    weight: 700 | 900;
  }[] = [];
  if (bold)
    fonts.push({ name: "Inter", data: bold, style: "normal", weight: 700 });
  if (black)
    fonts.push({ name: "Inter", data: black, style: "normal", weight: 900 });
  if (blackItalic)
    fonts.push({
      name: "Inter",
      data: blackItalic,
      style: "italic",
      weight: 900,
    });

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        backgroundColor: "#09090b",
        fontFamily: "Inter",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* ── Background glows ── */}
      <div
        style={{
          position: "absolute",
          top: "-200px",
          left: "380px",
          width: "820px",
          height: "700px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(245,92,42,0.11) 0%, transparent 65%)",
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-100px",
          left: "-100px",
          width: "380px",
          height: "380px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(74,144,226,0.07) 0%, transparent 65%)",
          display: "flex",
        }}
      />

      {/* ── Left panel ── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "640px",
          height: "100%",
          padding: "48px 56px",
          position: "relative",
          zIndex: 10,
        }}
      >
        {/* Fix #1 — logo size via style, not HTML attrs */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logo}
              alt=""
              style={{
                width: 150,
                height: 80,
                objectFit: "contain",
                borderRadius: "8px",
              }}
            />
          ) : (
            <div
              style={{
                width: "100px",
                height: "100px",
                borderRadius: "8px",
                background: "#f55c2a",
                display: "flex",
              }}
            />
          )}
        </div>

        {/* Headline block — Fix #2 (62px), Fix #3 (no sub-copy) */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "center",
          }}
        >
          {/* Eyebrow */}
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              alignItems: "center",
              gap: "8px",
              background: "rgba(245,92,42,0.1)",
              border: "1.5px solid rgba(245,92,42,0.3)",
              borderRadius: "100px",
              padding: "7px 16px",
              marginBottom: "22px",
            }}
          >
            <div
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#f55c2a",
                display: "flex",
              }}
            />
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "#f55c2a",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              Automatic Facebook Video Maker
            </span>
          </div>

          {/* H1 — Fix #2: 62px so "Your Facebook Page," fits on 2 lines */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginBottom: "30px",
            }}
          >
            <span
              style={{
                fontSize: "48px",
                fontWeight: 900,
                color: "#F4F4F8",
                lineHeight: 1,
                letterSpacing: "-0.04em",
              }}
            >
              Your Facebook Page,
            </span>
            <span
              style={{
                fontSize: "62px",
                fontWeight: 900,
                fontStyle: blackItalic ? "italic" : "normal",
                background: "linear-gradient(90deg, #f55c2a 0%, #4a90e2 100%)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                color: "transparent",
                lineHeight: 1,
                letterSpacing: "-0.04em",
              }}
            >
              On Autopilot.
            </span>
          </div>

          {/* Stats row — Fix: alignSelf instead of width fit-content */}
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "14px",
              overflow: "hidden",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            {(
              [
                ["7", "Videos / Week"],
                ["10 min", "To Set Up"],
                ["0", "Editing"],
              ] as [string, string][]
            ).map(([val, label], i) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: "12px 24px",
                  borderRight:
                    i < 2 ? "1px solid rgba(255,255,255,0.08)" : "none",
                }}
              >
                <span
                  style={{
                    fontSize: "22px",
                    fontWeight: 900,
                    color: "#F4F4F8",
                    lineHeight: 1,
                  }}
                >
                  {val}
                </span>
                <span
                  style={{
                    fontSize: "9px",
                    fontWeight: 700,
                    color: "#52525b",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    marginTop: "4px",
                  }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            paddingTop: "16px",
          }}
        >
          <span
            style={{
              fontSize: "14px",
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
              background: "rgba(245,92,42,0.1)",
              border: "1px solid rgba(245,92,42,0.25)",
              borderRadius: "8px",
              padding: "6px 14px",
            }}
          >
            <span
              style={{
                fontSize: "12px",
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

      {/* ── Right side: og-bg image ── */}
      {ogBg && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={ogBg}
          alt=""
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            width: 650,
            height: 630,
            objectFit: "contain",
          }}
        />
      )}
    </div>,
    { ...size, fonts },
  );
}
