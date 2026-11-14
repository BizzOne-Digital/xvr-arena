import { ImageResponse } from "next/og";

export const alt = "XVR – Manitoba's Largest Free-Roaming Virtual Reality Arena";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "70px 80px",
          background: "radial-gradient(circle at 75% 35%, rgba(0,141,255,0.45), transparent 55%), linear-gradient(135deg, #03070D 0%, #071421 60%, #03070D 100%)",
          color: "#F7FBFF",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 110, fontWeight: 900, color: "#00DFFF", letterSpacing: 6, textShadow: "0 0 30px #00DFFF" }}>XVR</div>
        <div style={{ display: "flex", fontSize: 26, letterSpacing: 8, color: "#9FB4C5", marginTop: 4 }}>FREE-ROAMING VR ARENA</div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 50, fontSize: 64, fontWeight: 800, fontStyle: "italic", lineHeight: 1.05 }}>
          <span>MANITOBA&apos;S LARGEST</span>
          <span style={{ color: "#00DFFF" }}>FREE-ROAMING VR ARENA</span>
        </div>
        <div style={{ display: "flex", marginTop: 36, fontSize: 26, color: "#9FB4C5" }}>Winnipeg · VR &amp; Mixed Reality · Parties · Team Events</div>
        <div style={{ position: "absolute", right: 80, top: 90, width: 360, height: 6, background: "#FF254A", transform: "rotate(-14deg)", boxShadow: "0 0 30px #FF254A" }} />
      </div>
    ),
    size,
  );
}
