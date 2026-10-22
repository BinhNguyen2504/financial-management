"use client";
import { useI18n } from "@/i18n/provider";

export default function ErrorPage({ reset }: { reset: () => void }) {
  const { t: tr } = useI18n();

  return (
    <div className="panel" role="alert">
      <h1>{tr("Chưa tải được nội dung")}</h1>
      <p>{tr("Hãy kiểm tra kết nối rồi thử lại.")}</p>
      <button className="button" onClick={reset}>
        {tr("Thử lại")}
      </button>
    </div>
  );
}
