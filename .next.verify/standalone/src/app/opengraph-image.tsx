import { ImageResponse } from "next/og";

// Social share card for every page. Generated at build time, so it costs
// nothing at runtime and needs no image assets in the repo.

export const alt = "PasteAndSave - Free Online Video Downloader";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #0c0a14 0%, #1c1030 45%, #0e1626 100%)",
          position: "relative",
        }}
      >
        {/* soft aurora glows */}
        <div
          style={{
            position: "absolute",
            top: -140,
            left: -100,
            width: 560,
            height: 560,
            borderRadius: 9999,
            background: "rgba(139, 92, 246, 0.35)",
            filter: "blur(120px)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -160,
            right: -80,
            width: 520,
            height: 520,
            borderRadius: 9999,
            background: "rgba(56, 189, 248, 0.28)",
            filter: "blur(120px)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: -120,
            right: 160,
            width: 420,
            height: 420,
            borderRadius: 9999,
            background: "rgba(217, 70, 239, 0.25)",
            filter: "blur(120px)",
            display: "flex",
          }}
        />

        {/* logo badge */}
        <div
          style={{
            width: 130,
            height: 130,
            borderRadius: 34,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #8b5cf6 0%, #d946ef 55%, #38bdf8 100%)",
            boxShadow: "0 20px 60px rgba(139, 92, 246, 0.45)",
          }}
        >
          <svg width="72" height="72" viewBox="0 0 40 40" fill="none">
            <path
              d="M20 9.5 V22"
              stroke="#fff"
              strokeWidth="3.4"
              strokeLinecap="round"
            />
            <path
              d="M14.3 16.7 L20 22.6 L25.7 16.7"
              stroke="#fff"
              strokeWidth="3.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M12 27.5 H28"
              stroke="#fff"
              strokeWidth="3.4"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* wordmark */}
        <div
          style={{
            display: "flex",
            marginTop: 44,
            fontSize: 84,
            fontWeight: 700,
            letterSpacing: -3,
            color: "#ffffff",
          }}
        >
          <span>PasteAnd</span>
          <span style={{ color: "#a78bfa" }}>Save</span>
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 18,
            fontSize: 34,
            color: "rgba(255, 255, 255, 0.82)",
          }}
        >
          Free online video downloader
        </div>

        {/* feature chips */}
        <div style={{ display: "flex", gap: 16, marginTop: 42 }}>
          {["1,200+ sites", "HD MP4", "MP3", "No signup"].map((label) => (
            <div
              key={label}
              style={{
                display: "flex",
                padding: "12px 28px",
                borderRadius: 9999,
                fontSize: 26,
                color: "rgba(255, 255, 255, 0.92)",
                background: "rgba(255, 255, 255, 0.10)",
                border: "1px solid rgba(255, 255, 255, 0.18)",
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
