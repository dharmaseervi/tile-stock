import { ImageResponse } from "next/og";

export const alt = "Tiles Stock — stock management for tile dealers";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Generated share card. This is what a dealer sees when the link lands in a
 * WhatsApp group, so it carries the sample-board motif rather than a logo
 * on a plain background — the tiles are the recognisable thing.
 */
export default async function Image() {
  const KILN = "#F7F8F6";
  const INK = "#1E2422";
  const INK_SOFT = "#52605B";
  const GLAZE = "#1F6F6B";
  const GLAZE_DEEP = "#164F4C";
  const GROUT = "#C4C9C0";
  const OCHRE = "#B4821E";

  const tiles = [
    { tone: "#C9CDC8", label: "Dolomite Grey", boxes: "184", low: false },
    { tone: "#AEC4C2", label: "Genoua Aqua", boxes: "96", low: false },
    { tone: "#B7B2AC", label: "Sofita Grey", boxes: "12", low: true },
    { tone: "#D6D9D4", label: "Valley White", boxes: "240", low: false },
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: KILN,
          padding: 64,
          alignItems: "center",
          gap: 56,
        }}
      >
        {/* Left — the pitch */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 34 }}>
            <div style={{ display: "flex", flexWrap: "wrap", width: 26, height: 26, gap: 2 }}>
              <div style={{ width: 12, height: 12, background: GLAZE, opacity: 0.22, borderRadius: 2 }} />
              <div style={{ width: 12, height: 12, background: GLAZE, opacity: 0.22, borderRadius: 2 }} />
              <div style={{ width: 12, height: 12, background: GLAZE, opacity: 0.22, borderRadius: 2 }} />
              <div style={{ width: 12, height: 12, background: GLAZE, borderRadius: 2 }} />
            </div>
            <div style={{ fontSize: 26, color: GLAZE_DEEP, fontStyle: "italic", letterSpacing: -0.4 }}>
              Tiles Stock
            </div>
          </div>

          <div
            style={{
              fontSize: 62,
              lineHeight: 1.06,
              color: INK,
              letterSpacing: -1.6,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span>Know what's on the</span>
            <span style={{ color: GLAZE_DEEP, fontStyle: "italic" }}>godown floor</span>
            <span>without walking it.</span>
          </div>

          <div style={{ fontSize: 25, color: INK_SOFT, marginTop: 28, lineHeight: 1.4, maxWidth: 560 }}>
            Stock by design, size, and shade lot — for Indian tile dealers.
          </div>
        </div>

        {/* Right — the sample board */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            width: 400,
            height: 400,
            gap: 5,
            padding: 5,
            background: GROUT,
            borderRadius: 12,
          }}
        >
          {tiles.map((t) => (
            <div
              key={t.label}
              style={{
                width: 192,
                height: 192,
                background: t.tone,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                padding: 18,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ fontSize: 17, color: INK, maxWidth: 110, lineHeight: 1.2 }}>{t.label}</div>
                {t.low && (
                  <div
                    style={{
                      fontSize: 11,
                      background: OCHRE,
                      color: "#fff",
                      padding: "3px 8px",
                      borderRadius: 99,
                      display: "flex",
                    }}
                  >
                    LOW
                  </div>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <div style={{ fontSize: 40, color: t.low ? "#A6432E" : INK, letterSpacing: -1 }}>
                  {t.boxes}
                </div>
                <div style={{ fontSize: 15, color: "rgba(30,36,34,.55)" }}>boxes</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
