"use client";

import { useI18n } from "@/i18n/provider";
import Link from "next/link";
export default function NotFound() {
  const { t: tr } = useI18n();

  return (
    <div className="panel">
      <p className="eyebrow">404</p>
      <h1>{tr("Không tìm thấy trang")}</h1>
      <p>{tr("Đường dẫn này chưa có trong ứng dụng.")}</p>
      <Link className="text-link" href="/overview">
        {tr("Về tổng quan")}
      </Link>
    </div>
  );
}
