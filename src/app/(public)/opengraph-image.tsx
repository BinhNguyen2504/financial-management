import { ImageResponse } from "next/og";

export const alt =
  "Financial Manager — Làm chủ tiền bạc. Sống trọn điều bạn muốn.";
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
        background: "#FAF9F6",
        color: "#242420",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 24,
          color: "#A74425",
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
        <span>Làm chủ tiền bạc.</span>
        <span style={{ color: "#A74425" }}>Sống trọn điều bạn muốn.</span>
      </div>
      <div
        style={{
          display: "flex",
          marginTop: "auto",
          fontSize: 23,
          color: "#716859",
        }}
      >
        Thu nhập · Chi tiêu · Tiết kiệm · Đầu tư
      </div>
    </div>,
    size,
  );
}
