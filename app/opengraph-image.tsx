import { ImageResponse } from "next/og";

export const alt = "MyBingoCard free bingo card maker and generator";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

const cells = [
  "Baby Shower",
  "Classroom",
  "Wedding",
  "Team Event",
  "FREE",
  "Holiday",
  "Party",
  "Custom",
  "Online Play",
];

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#f8fafc",
          color: "#0f172a",
          fontFamily: "Arial, sans-serif",
          padding: 72,
          gap: 56,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", width: 560 }}>
          <div
            style={{
              display: "flex",
              width: 92,
              height: 92,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
              color: "white",
              fontSize: 48,
              fontWeight: 900,
              marginBottom: 34,
            }}
          >
            B
          </div>
          <div style={{ fontSize: 64, lineHeight: 1.04, fontWeight: 900, letterSpacing: 0 }}>
            Free Bingo Card
          </div>
          <div style={{ fontSize: 54, lineHeight: 1.08, fontWeight: 900, letterSpacing: 0 }}>
            Maker &amp; Generator
          </div>
          <div style={{ marginTop: 26, fontSize: 30, lineHeight: 1.35, color: "#475569" }}>
            Create custom printable cards for free, then add paid sharing or live hosting.
          </div>
          <div
            style={{
              marginTop: 38,
              display: "flex",
              width: 290,
              borderRadius: 999,
              padding: "18px 28px",
              background: "#4f46e5",
              color: "white",
              fontSize: 26,
              fontWeight: 800,
              justifyContent: "center",
            }}
          >
            mybingocard.com
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 430,
            padding: 28,
            borderRadius: 32,
            background: "white",
            boxShadow: "0 30px 70px rgba(79, 70, 229, 0.2)",
            border: "1px solid #e2e8f0",
          }}
        >
          <div style={{ display: "flex", justifyContent: "center", gap: 14, marginBottom: 24 }}>
            {"BINGO".split("").map((letter) => (
              <div key={letter} style={{ fontSize: 42, fontWeight: 900, color: "#4f46e5" }}>
                {letter}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {cells.map((cell, index) => (
              <div
                key={cell}
                style={{
                  display: "flex",
                  width: 118,
                  height: 86,
                  borderRadius: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  padding: 10,
                  fontSize: 18,
                  lineHeight: 1.15,
                  fontWeight: 800,
                  background: index === 4 ? "linear-gradient(135deg, #7c3aed, #4f46e5)" : "#f8fafc",
                  color: index === 4 ? "white" : "#334155",
                  border: index === 4 ? "0" : "1px solid #e2e8f0",
                }}
              >
                {cell}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    size
  );
}
