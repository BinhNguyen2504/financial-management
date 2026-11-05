"use client";

import { ChevronDown, History } from "lucide-react";
import { AnimatedDetails } from "@/components/animated-details";
import type { SavingsBook } from "@/domain/savings/types";
import { formatTime } from "@/i18n/format";
import { useI18n } from "@/i18n/provider";
import { auditActionNames } from "./editor-config";

export function SavingsHistory({ audit }: { audit: SavingsBook["audit"] }) {
  const { t: tr, locale } = useI18n("savings");

  return (
    <AnimatedDetails className="savings-history">
      <summary className="savings-history-toggle">
        <History size={20} aria-hidden="true" />
        <span className="savings-history-heading">
          <span className="savings-history-title">
            <strong>{tr("Lịch sử thay đổi")}</strong>
            <span className="savings-history-count">{audit.length}</span>
          </span>
          <span className="savings-history-scope">
            {tr("Toàn bộ sổ Tiết kiệm · Mới nhất trước")}
          </span>
        </span>
        <ChevronDown
          className="savings-history-chevron"
          size={18}
          aria-hidden="true"
        />
      </summary>
      <div className="savings-history-content">
        {audit.length === 0 ? (
          <p className="savings-history-empty">
            {tr("Chưa có thay đổi. Các lần cập nhật sổ sẽ xuất hiện tại đây.")}
          </p>
        ) : (
          <>
            <p className="savings-history-timezone">
              {tr("Thời gian ghi nhận theo giờ Việt Nam")}
            </p>
            <ol className="savings-history-list" role="list">
              {[...audit].reverse().map((entry) => (
                <li key={entry.version}>
                  <div className="savings-history-entry">
                    <strong className="savings-history-action">
                      {tr(
                        entry.action.type === "reviseTransaction"
                          ? entry.action.replacement
                            ? "Sửa giao dịch"
                            : "Hủy giao dịch"
                          : auditActionNames[entry.action.type],
                      )}
                    </strong>
                    <time dateTime={entry.at}>
                      {formatTime(entry.at, locale)}
                    </time>
                    <span className="savings-history-version">
                      {tr("Lần ghi")} #{entry.version}
                    </span>
                  </div>
                  {"reason" in entry.action && entry.action.reason && (
                    <p className="savings-history-reason">
                      <span>{tr("Lý do thay đổi")}</span>
                      {entry.action.reason}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </AnimatedDetails>
  );
}
