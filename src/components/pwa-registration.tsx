"use client";
import { useI18n } from "@/i18n/provider";

import { useEffect, useState } from "react";

export function PwaRegistration() {
  const { t: tr } = useI18n();

  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator)
    )
      return;
    let active = true;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);
  return failed ? (
    <p className="pwa-warning" role="status">
      {tr(
        "Chưa bật được trang dự phòng ngoại tuyến. Hãy tải lại trang khi có kết nối.",
      )}
    </p>
  ) : null;
}
