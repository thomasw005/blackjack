import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "WilsonBlackjack";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
    return new ImageResponse(
        (
            <div
                style={{
                    background: "#171717",
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 24,
                }}
            >
                <div style={{ fontSize: 220, color: "#3ecf8e", lineHeight: 1 }}>♠</div>
                <div style={{ fontSize: 64, color: "#ffffff", fontWeight: 700, letterSpacing: "-2px" }}>
                    WilsonBlackjack
                </div>
            </div>
        ),
        { ...size }
    );
}
