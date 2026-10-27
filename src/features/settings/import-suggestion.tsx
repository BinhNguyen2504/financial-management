"use client";
import { useI18n } from "@/i18n/provider";

import { useUser } from "@/features/profile/user-provider";
import {
  createRefreshController,
  subscribeToForegroundRefresh,
} from "@/lib/foreground-refresh";
import { X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { dataRequest, type DataStatus } from "./api";
import "./settings.css";

export function ImportSuggestion() {
  const { t: tr } = useI18n("settings");

  const { user } = useUser();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let active = true;
    const key = `fm-import-dismissed:${user?.id}`;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset the previous account suggestion before checking the new owner.
    setVisible(false);
    const refresh = async () => {
      if (!user || document.visibilityState !== "visible") return;
      try {
        try {
          if (sessionStorage.getItem(key)) {
            if (active) setVisible(false);
            return;
          }
        } catch {
          /* Session-only dismissal still works in memory. */
        }
        const status: DataStatus = await (await dataRequest("/status")).json();
        if (active)
          setVisible(
            status.empty &&
              status.importReady !== false &&
              status.ownerId === user.id,
          );
      } catch (error) {
        if (active) setVisible(false);
        throw error;
      }
    };
    const controller = createRefreshController(refresh);
    void controller.reload().catch(() => {});
    const unsubscribe = subscribeToForegroundRefresh(controller);
    return () => {
      active = false;
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Key account-owned state to user identity; metadata refreshes must preserve drafts.
  }, [user?.id]);
  if (!visible) return null;
  return (
    <aside
      className="panel import-suggestion"
      aria-label={tr("Khôi phục dữ liệu cũ")}
    >
      <div>
        <h2>{tr("Bạn đã có bản sao lưu?")}</h2>
        <p>
          {tr(
            "Tài khoản chưa có dữ liệu. Bạn có thể khôi phục toàn bộ dữ liệu cũ trong Cài đặt.",
          )}
        </p>
        <Link href="/settings#import">{tr("Đến phần nhập bản sao lưu")}</Link>
      </div>
      <button
        className="expense-secondary"
        aria-label={tr("Đóng gợi ý khôi phục")}
        onClick={() => {
          setVisible(false);
          try {
            sessionStorage.setItem(`fm-import-dismissed:${user?.id}`, "1");
          } catch {
            /* Optional. */
          }
        }}
      >
        <X size={18} aria-hidden="true" />
      </button>
    </aside>
  );
}
