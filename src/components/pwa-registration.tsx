"use client";

import { useEffect, useState } from "react";

export function PwaRegistration() {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    let active = true;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, []);
  return failed ? <p className="pwa-warning" role="status">Chưa bật được trang dự phòng ngoại tuyến. Hãy tải lại trang khi có kết nối.</p> : null;
}
