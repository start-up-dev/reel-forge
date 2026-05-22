import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import { join } from "path";

export const alt = "ReelForge — Automatic Facebook Video Maker for Small Business";
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

const PHONES = [
  {
    creatorName: "Wealth Coach Pro",
    hook: "3 money habits that changed everything",
    gradientFrom: "#0f172a",
    gradientTo: "#1e3a5f",
    accentColor: "#4a90e2",
    likes: "18K",
    comments: "842",
    left: 644,
    top: 52,
  },
  {
    creatorName: "Routine Mastery",
    hook: "The morning that made me $10k",
    gradientFrom: "#1a0a05",
    gradientTo: "#3d1a0a",
    accentColor: "#f55c2a",
    likes: "12K",
    comments: "391",
    left: 844,
    top: 22,
  },
  {
    creatorName: "AI Accelerator",
    hook: "5 AI tools you probably don't know",
    gradientFrom: "#0d0d1a",
    gradientTo: "#1a1040",
    accentColor: "#a78bfa",
    likes: "5.1K",
    comments: "234",
    left: 1034,
    top: 58,
  },
];

const PW = 192;
const PH = 362;

export default async function Image() {
  const [bold, black, blackItalic, logo] = await Promise.all([
    loadFont(700),
    loadFont(900),
    loadFont(900, "italic"),
    loadLogo(),
  ]);

  const fonts: { name: string; data: ArrayBuffer; style: "normal" | "italic"; weight: 700 | 900 }[] = [];
  if (bold) fonts.push({ name: "Inter", data: bold, style: "normal", weight: 700 });
  if (black) fonts.push({ name: "Inter", data: black, style: "normal", weight: 900 });
  if (blackItalic) fonts.push({ name: "Inter", data: blackItalic, style: "italic", weight: 900 });

  return new ImageResponse(
    (
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
        {/* ── Glows ── */}
        <div
          style={{
            position: "absolute",
            top: "-220px",
            left: "400px",
            width: "800px",
            height: "700px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(245,92,42,0.13) 0%, transparent 65%)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-120px",
            left: "-120px",
            width: "420px",
            height: "420px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(74,144,226,0.07) 0%, transparent 65%)",
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
            padding: "50px 56px",
            position: "relative",
            zIndex: 10,
          }}
        >
          {/* Logo + wordmark */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logo}
                width={34}
                height={34}
                alt=""
                style={{ borderRadius: "8px" }}
              />
            ) : (
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "8px",
                  background: "#f55c2a",
                  display: "flex",
                }}
              />
            )}
            <span
              style={{
                fontSize: "20px",
                fontWeight: 900,
                color: "#F4F4F8",
                letterSpacing: "-0.02em",
              }}
            >
              ReelForge
            </span>
          </div>

          {/* Headline block */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              justifyContent: "center",
              paddingBottom: "8px",
            }}
          >
            {/* Eyebrow */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(245,92,42,0.1)",
                border: "1.5px solid rgba(245,92,42,0.3)",
                borderRadius: "100px",
                padding: "8px 18px",
                width: "fit-content",
                marginBottom: "26px",
              }}
            >
              <div
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: "#f55c2a",
                  display: "flex",
                }}
              />
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#f55c2a",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                Videos. Auto-posted. You approved once.
              </span>
            </div>

            {/* H1 */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                marginBottom: "28px",
                gap: "0px",
              }}
            >
              <span
                style={{
                  fontSize: "76px",
                  fontWeight: 900,
                  color: "#F4F4F8",
                  lineHeight: 0.95,
                  letterSpacing: "-0.04em",
                }}
              >
                Your Facebook
              </span>
              <span
                style={{
                  fontSize: "76px",
                  fontWeight: 900,
                  color: "#F4F4F8",
                  lineHeight: 0.95,
                  letterSpacing: "-0.04em",
                  marginBottom: "10px",
                }}
              >
                Page,
              </span>
              <span
                style={{
                  fontSize: "76px",
                  fontWeight: 900,
                  fontStyle: blackItalic ? "italic" : "normal",
                  background: "linear-gradient(90deg, #f55c2a 0%, #4a90e2 100%)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                  lineHeight: 0.95,
                  letterSpacing: "-0.04em",
                }}
              >
                On Autopilot.
              </span>
            </div>

            {/* Sub-copy */}
            <p
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: "#52525b",
                lineHeight: 1.5,
                margin: 0,
                marginBottom: "32px",
              }}
            >
              Scripts · Videos · Posted. Set up in 10 minutes.
            </p>

            {/* Stats row */}
            <div
              style={{
                display: "flex",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: "16px",
                overflow: "hidden",
                width: "fit-content",
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
                    padding: "14px 26px",
                    borderRight:
                      i < 2 ? "1px solid rgba(255,255,255,0.07)" : "none",
                  }}
                >
                  <span
                    style={{
                      fontSize: "24px",
                      fontWeight: 900,
                      color: "#F4F4F8",
                      lineHeight: 1,
                    }}
                  >
                    {val}
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      color: "#52525b",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      marginTop: "5px",
                    }}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              paddingTop: "18px",
            }}
          >
            <span
              style={{
                fontSize: "15px",
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
                padding: "7px 16px",
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

        {/* ── Phone frames ── */}
        {PHONES.map((phone) => {
          const initials = phone.creatorName
            .split(" ")
            .slice(0, 2)
            .map((w) => w[0])
            .join("");

          return (
            <div
              key={phone.creatorName}
              style={{
                position: "absolute",
                left: phone.left,
                top: phone.top,
                width: PW,
                height: PH,
                borderRadius: "30px",
                border: "5px solid #18181b",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 30px 80px rgba(0,0,0,0.8)",
              }}
            >
              {/* Notch */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "16px",
                  background: phone.gradientFrom,
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "4px",
                    borderRadius: "3px",
                    background: "#27272a",
                    display: "flex",
                  }}
                />
              </div>

              {/* Screen */}
              <div
                style={{
                  flex: 1,
                  position: "relative",
                  display: "flex",
                  background: `linear-gradient(160deg, ${phone.gradientFrom}, ${phone.gradientTo})`,
                }}
              >
                {/* Gradient scrim */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background:
                      "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 35%, rgba(0,0,0,0.88) 100%)",
                    display: "flex",
                  }}
                />

                {/* Right engagement column */}
                <div
                  style={{
                    position: "absolute",
                    right: "8px",
                    bottom: "90px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  {/* Heart icon */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "2px",
                    }}
                  >
                    <svg
                      width="18"
                      height="16"
                      viewBox="0 0 24 22"
                      fill="white"
                    >
                      <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" />
                    </svg>
                    <span
                      style={{
                        fontSize: "8px",
                        fontWeight: 700,
                        color: "white",
                        display: "flex",
                      }}
                    >
                      {phone.likes}
                    </span>
                  </div>
                  {/* Comment icon */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "2px",
                    }}
                  >
                    <svg
                      width="18"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="white"
                    >
                      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                    </svg>
                    <span
                      style={{
                        fontSize: "8px",
                        fontWeight: 700,
                        color: "white",
                        display: "flex",
                      }}
                    >
                      {phone.comments}
                    </span>
                  </div>
                </div>

                {/* Bottom info */}
                <div
                  style={{
                    position: "absolute",
                    bottom: "10px",
                    left: "10px",
                    right: "34px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                    zIndex: 2,
                  }}
                >
                  {/* Creator row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    <div
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "50%",
                        background: phone.accentColor,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "8px",
                        fontWeight: 900,
                        color: "white",
                        border: "1.5px solid rgba(255,255,255,0.2)",
                        flexShrink: 0,
                      }}
                    >
                      {initials}
                    </div>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 900,
                        color: "white",
                        display: "flex",
                      }}
                    >
                      {phone.creatorName}
                    </span>
                    {/* FB verified dot */}
                    <div
                      style={{
                        width: "12px",
                        height: "12px",
                        borderRadius: "50%",
                        background: "#1877F2",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          fontSize: "7px",
                          fontWeight: 900,
                          color: "white",
                          display: "flex",
                        }}
                      >
                        ✓
                      </span>
                    </div>
                  </div>
                  {/* Hook */}
                  <span
                    style={{
                      fontSize: "9px",
                      color: "rgba(255,255,255,0.8)",
                      lineHeight: 1.3,
                      display: "flex",
                    }}
                  >
                    {phone.hook}
                  </span>
                  {/* Comment input mock */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      background: "rgba(0,0,0,0.4)",
                      borderRadius: "12px",
                      border: "1px solid rgba(255,255,255,0.12)",
                      padding: "4px 8px",
                      marginTop: "2px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "8px",
                        color: "rgba(255,255,255,0.35)",
                        display: "flex",
                      }}
                    >
                      Add a comment…
                    </span>
                  </div>
                </div>
              </div>

              {/* Home indicator */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "12px",
                  background: "black",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: "44px",
                    height: "3px",
                    borderRadius: "2px",
                    background: "#27272a",
                    display: "flex",
                  }}
                />
              </div>
            </div>
          );
        })}

        {/* ── Left-edge fade to blend split ── */}
        <div
          style={{
            position: "absolute",
            left: "600px",
            top: 0,
            bottom: 0,
            width: "80px",
            background: "linear-gradient(to right, #09090b, transparent)",
            zIndex: 5,
            display: "flex",
          }}
        />

        {/* ── "Built with ReelForge" trust badge ── */}
        <div
          style={{
            position: "absolute",
            bottom: "32px",
            left: "820px",
            display: "flex",
            alignItems: "center",
            gap: "7px",
            background: "rgba(52,211,153,0.07)",
            border: "1px solid rgba(52,211,153,0.2)",
            borderRadius: "100px",
            padding: "7px 16px",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              stroke="#34D399"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "#34D399",
              letterSpacing: "0.05em",
              display: "flex",
            }}
          >
            Every clip reviewed before it posts
          </span>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
