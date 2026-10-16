import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Financial Manager",
    short_name: "Financial",
    lang: "vi",
    scope: "/",
    description: "Quản lý tài chính cá nhân trên điện thoại và máy tính.",
    start_url: "/overview",
    display: "standalone",
    background_color: "#F7F3EB",
    theme_color: "#506B50",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
