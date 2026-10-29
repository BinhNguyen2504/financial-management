"use client";
import Link from "next/link";
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
  return (
    <div className="settings-feedback">
      <p className="settings-state-label">
        {tr(
          status.empty
            ? "Tài khoản chưa có dữ liệu tài chính"
            : "Tài khoản đang có dữ liệu",
        )}
      </p>
      {!status.empty && (
        <>
          <p>
            {tr(
              "Các mục bên dưới đang chặn khôi phục. Số lượng bao gồm sổ, cấu hình, lịch sử và dữ liệu đã xóa hoặc hủy; không đồng nghĩa số giao dịch.",
            )}
          </p>
          <div className="restore-blockers">
            {status.blockers?.map((module) =>
              module.count > 0 ? (
                <details key={module.key}>
                  <summary>
                    {tr(module.label)} ·{" "}
                    {module.count.toLocaleString(numberLocale)} {tr("bản ghi")}
                  </summary>
                  <dl>
                    {module.details.map((detail) => (
                      <div key={detail.table}>
                        <dt>{tr(detail.label)}</dt>
                        <dd>{detail.count.toLocaleString(numberLocale)}</dd>
                      </div>
                    ))}
                  </dl>
                  <Link href={module.href}>{tr("Mở mục để xem dữ liệu")}</Link>
                </details>
              ) : (
                <p key={module.key}>
                  {tr(module.label)}: {tr("Trống")}
                </p>
              ),
            )}
          </div>
          <p>
            {tr(
              "Xóa/hủy giao dịch, ngừng sử dụng danh mục hoặc đưa số dư về 0 vẫn giữ lại sổ và lịch sử. Những thao tác này không làm tài khoản trống để khôi phục.",
            )}
          </p>
          <p>
            {tr(
              "Bạn có thể dùng tài khoản chưa có dữ liệu, hoặc chọn Làm trống dữ liệu tài chính bên dưới sau khi lưu bản sao lưu.",
            )}
          </p>
          <a className="expense-secondary" href="#reset-data">
            {tr("Xem cách làm trống tài khoản")}
          </a>
        </>
      )}
      {!status.importReady && (
        <p>
          {tr(
            "Khôi phục chưa được bật trên hệ thống này. Bạn vẫn có thể tải bản sao lưu; hãy thử kiểm tra lại sau.",
          )}
        </p>
      )}
      <div className="settings-actions">
        <button
          className="expense-secondary"
          disabled={checking || busy}
          onClick={reload}
        >
          {tr("Kiểm tra lại")}
        </button>
      </div>
    </div>
  );
}
