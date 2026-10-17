import { ImageResponse } from "next/og";

export const alt =
  "Financial Manager — Một nơi rõ ràng hơn cho tài chính của bạn";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        padding: "70px 80px",
        background: "#F7F3EB",
        color: "#3F3A32",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 24,
          color: "#506B50",
        }}
      >
        <span>Financial Manager</span>
        <span>Đang phát triển</span>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          marginTop: 85,
          fontSize: 65,
          lineHeight: 1.2,
          letterSpacing: -2,
        }}
      >
        <span>Một nơi rõ ràng hơn</span>
        <span style={{ color: "#506B50" }}>cho tài chính của bạn.</span>
      </div>
      <div
        style={{
          display: "flex",
          marginTop: "auto",
          fontSize: 23,
          color: "#716859",
        }}
      >
        Thu nhập · Hũ chi tiêu · Tiết kiệm
      </div>
    </div>,
    size,
  );
}
