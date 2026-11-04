"use client";
import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";
import { LoadingSpinner } from "@/components/loading";
import { useI18n } from "@/i18n/provider";
import type { DataStatus } from "./api";

export function RestoreStatus({
  status,
  checking,
  busy,
  reload,
}: {
  status: DataStatus;
  checking: boolean;
  busy: boolean;
  reload(): void;
}) {
  const { t: tr, numberLocale } = useI18n("settings");
  const modules = status.blockers ?? [];
  const occupied = modules.filter((module) => module.count > 0).length;
  const empty = modules.length - occupied;
  return (
    <div className="settings-feedback restore-status" aria-busy={checking}>
      <p className="settings-state-label">
        {tr(
          status.empty
            ? "Tài khoản chưa có dữ liệu tài chính"
            : "Tài khoản đang có dữ liệu",
        )}
      </p>
      {!status.empty && (
        <>
          <p>{tr("Khôi phục chỉ áp dụng cho tài khoản trống.")}</p>
          {modules.length > 0 && (
            <div className="restore-modules">
              <p
                className="restore-module-overview"
                role="status"
                aria-atomic="true"
              >
                {tr(
                  occupied === 1 ? "1 mục có dữ liệu" : "{0} mục có dữ liệu",
                  { 0: occupied.toLocaleString(numberLocale) },
                )}
                {" · "}
                {tr(empty === 1 ? "1 mục trống" : "{0} mục trống", {
                  0: empty.toLocaleString(numberLocale),
                })}
              </p>
              <div className="restore-blockers">
                {modules.map((module) =>
                  module.count > 0 ? (
                    <details key={module.key} data-module={module.key}>
                      <summary>
                        <span className="restore-module-name">
                          {tr(module.label)}
                        </span>
                        <span className="restore-module-state">
                          <span>{tr("Có dữ liệu")}</span>
                          <ChevronRight size={16} aria-hidden="true" />
                        </span>
                      </summary>
                      <div className="restore-module-body">
                        <p className="restore-record-total">
                          {tr(
                            module.count === 1
                              ? "1 bản ghi lưu trữ"
                              : "{0} bản ghi lưu trữ",
                            { 0: module.count.toLocaleString(numberLocale) },
                          )}
                        </p>
                        <p className="restore-detail-note">
                          {tr(
                            "Gồm sổ, cấu hình và lịch sử; không phải số giao dịch.",
                          )}
                        </p>
                        <dl>
                          {module.details.map((detail) => (
                            <div key={detail.table}>
                              <dt>{tr(detail.label)}</dt>
                              <dd>
                                {detail.count.toLocaleString(numberLocale)}
                              </dd>
                            </div>
                          ))}
                        </dl>
                        <Link className="text-link" href={module.href}>
                          {tr("Mở mục để xem dữ liệu")}
                        </Link>
                      </div>
                    </details>
                  ) : (
                    <div
                      key={module.key}
                      className="restore-module-empty"
                      data-module={module.key}
                    >
                      <span className="restore-module-name">
                        {tr(module.label)}
                      </span>
                      <span className="restore-module-state">
                        <span>{tr("Trống")}</span>
                        <Check size={16} aria-hidden="true" />
                      </span>
                    </div>
                  ),
                )}
              </div>
            </div>
          )}
          <details className="restore-explanation">
            <summary>
              <ChevronRight size={16} aria-hidden="true" />
              <span>{tr("Vì sao tài khoản vẫn có dữ liệu?")}</span>
            </summary>
            <p>
              {tr(
                "Xóa/hủy giao dịch, ngừng sử dụng danh mục hoặc đưa số dư về 0 vẫn giữ lại sổ và lịch sử. Những thao tác này không làm tài khoản trống để khôi phục.",
              )}
            </p>
          </details>
          <div className="restore-next-step">
            <h4>{tr("Để tiếp tục khôi phục")}</h4>
            <p>
              {tr(
                "Dùng tài khoản trống khác để giữ dữ liệu hiện tại, hoặc lưu bản sao lưu rồi làm trống tài khoản này.",
              )}
            </p>
            <a className="expense-secondary" href="#reset-data">
              {tr("Xem cách làm trống tài khoản")}
            </a>
          </div>
        </>
      )}
      {!status.importReady && (
        <p className="restore-system-note">
          {tr(
            "Khôi phục chưa được bật trên hệ thống này. Bạn vẫn có thể tải bản sao lưu; hãy thử kiểm tra lại sau.",
          )}
        </p>
      )}
      <div className="settings-actions restore-status-actions">
        <button
          className="expense-secondary"
          disabled={checking || busy}
          aria-busy={checking}
          onClick={reload}
        >
          {checking && <LoadingSpinner />}
          {tr("Kiểm tra lại")}
        </button>
      </div>
    </div>
  );
}
