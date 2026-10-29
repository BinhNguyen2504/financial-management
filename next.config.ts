import type { NextConfig } from "next";

const backupBytes = Number(
  process.env.DATA_BACKUP_MAX_BYTES ?? 20 * 1024 * 1024,
);
if (
  !Number.isSafeInteger(backupBytes) ||
  backupBytes < 1024 ||
  !Number.isSafeInteger(backupBytes + 1024)
)
  throw new Error(
    "DATA_BACKUP_MAX_BYTES must be a positive integer of at least 1024 bytes",
  );

const config: NextConfig = {
  poweredByHeader: false,
  // The proxy must buffer complete backups accepted by the import route.
  experimental: { proxyClientMaxBodySize: backupBytes + 1024 },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
        ],
      },
    ];
  },
};

export default config;
