"use client";
import { LanguagePicker } from "@/i18n/language-picker";

import { LoadingSpinner, LoadingStatus } from "@/components/loading";

import { ThemePicker } from "@/components/ui-preferences";

import { HelpButton, HelpPageTitle } from "@/features/help/provider";

import {
  ArrowRight,
  Check,
  Download,
  FileJson,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";

import { InstallGuide } from "./install-guide";
import "./settings.css";
import { useSettingsWorkspace } from "./use-settings-workspace";
function period(value: string | null) {
  if (!value) return "Chưa có dữ liệu";
  return value.split("-").reverse().join("/");
}
export function SettingsWorkspace() {
  const controller = useSettingsWorkspace();
  const {
    tr,
    checking,
    userError,
    statusError,
    userLoading,
    busy,
    reloadUser,
    reloadStatus,
    exportError,
    summary,
    complete,
    user,
    download,
    prepared,
    numberLocale,
    fileInput,
    importError,
    canSelect,
    selectFile,
    importUnavailable,
    status,
    chooseFile,
    fileName,
    clearFile,
    restoreProfile,
    setRestoreProfile,
    restore,
    importNotice,
    result,
    profilePending,
    retryProfile,
  } = controller;

  return (
    <div className="settings-workspace">
      <header className="settings-heading">
        <p className="eyebrow">{tr("KHÔNG GIAN CỦA BẠN")}</p>
        <HelpPageTitle>{tr("Cài đặt")}</HelpPageTitle>
        <p className="lead">
          {tr("Quản lý dữ liệu của bạn và cách sử dụng ứng dụng.")}
        </p>
      </header>
      <section className="settings-data" aria-labelledby="data-heading">
        <div className="settings-section-heading">
          <h2 id="data-heading">{tr("Sao lưu và khôi phục")}</h2>
          <HelpButton
            pageId="settings"
            sectionId="restore"
            label={tr("Điều kiện khôi phục")}
          />
          <p>
            {tr(
              "Thu nhập, Chi tiêu, Tiết kiệm, Đầu tư và Quỹ an toàn — cùng toàn bộ lịch sử và các kỳ đã chốt.",
            )}
          </p>
        </div>
        {checking && !userError && (
          <LoadingStatus>
            {tr("Đang kiểm tra trạng thái dữ liệu…")}
          </LoadingStatus>
        )}
        {(statusError || userError) && (
          <div className="settings-feedback settings-feedback-error">
            <p role="alert">{userError || statusError}</p>
            <button
              className="expense-secondary"
              disabled={userLoading || (!userError && checking) || !!busy}
              onClick={() => void (userError ? reloadUser() : reloadStatus())}
            >
              <RefreshCw size={16} aria-hidden="true" />
              {tr("Thử kết nối lại")}
            </button>
          </div>
        )}
        <div className="settings-data-grid">
          <section
            className="panel settings-card"
            aria-labelledby="backup-heading"
          >
            <div className="settings-card-heading">
              <span className="settings-card-icon">
                <Download size={22} aria-hidden="true" />
              </span>
              <div>
                <h3 id="backup-heading">{tr("Sao lưu dữ liệu")}</h3>
                <p>{tr("Giữ một bản để có thể bắt đầu lại.")}</p>
              </div>
            </div>
            <p>
              {tr(
                "Tải bản sao lưu toàn bộ dữ liệu và giữ ở nơi an toàn để có thể khôi phục khi cần.",
              )}
            </p>
            <div className="settings-actions">
              <button
                aria-busy={busy === "export"}
                aria-describedby={
                  exportError ? "export-error" : "backup-safety"
                }
                className={
                  summary && !complete ? "expense-secondary" : "expense-primary"
                }
                disabled={!!busy || userLoading || !user}
                onClick={() => void download()}
              >
                {busy === "export" ? (
                  <LoadingSpinner />
                ) : (
                  <Download size={18} aria-hidden="true" />
                )}
                {busy === "export" ? tr("Đang xuất…") : tr("Tải bản sao lưu")}
              </button>
            </div>
            <p className="settings-hint" id="backup-safety">
              <ShieldCheck size={16} aria-hidden="true" />
              <span>
                {tr(
                  "File không có mật khẩu và chứa số tiền đầy đủ, kể cả khi đang che tiền. Không kèm email hay thông tin đăng nhập.",
                )}
              </span>
            </p>
            {exportError && (
              <div
                className="settings-feedback settings-feedback-error"
                id="export-error"
              >
                <p role="alert">{tr(exportError)}</p>
                <p>{tr("Chưa tạo được file. Bạn có thể thử tải lại.")}</p>
              </div>
            )}
            {prepared && (
              <div className="settings-feedback settings-download-ready">
                <p role="status">
                  <Check size={17} aria-hidden="true" />
                  {tr("Bản sao lưu đã sẵn sàng.")}
                </p>
                <p>{tr("Nếu trình duyệt chưa tải, chọn liên kết bên dưới.")}</p>
                <a
                  className="expense-secondary"
                  href={prepared.url}
                  download={prepared.name}
                >
                  <FileJson size={17} aria-hidden="true" />
                  {tr("Tải bản sao lưu")}
                </a>
                <small className="settings-file-name">
                  {prepared.name} ·{" "}
                  {Math.max(1, Math.ceil(prepared.size / 1024)).toLocaleString(
                    numberLocale,
                  )}{" "}
                  KB
                </small>
              </div>
            )}
          </section>
          <section
            className="panel settings-card"
            id="import"
            aria-labelledby="import-heading"
          >
            <div className="settings-card-heading">
              <span className="settings-card-icon">
                <Upload size={22} aria-hidden="true" />
              </span>
              <div>
                <h3 id="import-heading">{tr("Khôi phục dữ liệu")}</h3>
                <p>{tr("Dùng bản sao lưu từ tài khoản trước.")}</p>
              </div>
            </div>
            <p>
              {tr(
                "Chọn bản sao lưu đã tải từ Cài đặt, kiểm tra nội dung rồi xác nhận. Chỉ khôi phục vào tài khoản chưa có dữ liệu.",
              )}
            </p>
            <input
              ref={fileInput}
              id="backup-file"
              className="settings-file-input"
              type="file"
              hidden
              accept=".json,application/json"
              aria-label={tr("Chọn bản sao lưu toàn bộ dữ liệu")}
              aria-invalid={!!importError && !summary}
              aria-describedby={
                importError && !summary ? "import-error" : undefined
              }
              disabled={!canSelect}
              onChange={(e) => void selectFile(e.target.files?.[0])}
            />
            {importUnavailable ? (
              <div className="settings-feedback">
                <p>{tr("Khôi phục chưa được bật trên hệ thống này.")}</p>
                <p>
                  {tr(
                    "Bạn vẫn có thể tải bản sao lưu và giữ file để dùng sau.",
                  )}
                </p>
                <button
                  className="expense-secondary"
                  disabled={checking || !!busy}
                  onClick={() => void reloadStatus()}
                >
                  {tr("Kiểm tra lại")}
                </button>
              </div>
            ) : !status?.empty && status && !complete ? (
              <div className="settings-feedback">
                <p className="settings-state-label">
                  <ShieldCheck size={17} aria-hidden="true" />
                  {tr("Tài khoản đang có dữ liệu")}
                </p>
                <p>
                  {tr(
                    "Để tránh ghi đè, hãy đăng nhập một tài khoản mới chưa có dữ liệu trước khi khôi phục.",
                  )}
                </p>
              </div>
            ) : (
              !complete && (
                <>
                  <ol
                    className="settings-import-steps"
                    aria-label={tr("Các bước khôi phục")}
                  >
                    {[tr("Chọn file"), tr("Kiểm tra"), tr("Khôi phục")].map(
                      (label, i) => (
                        <li
                          key={label}
                          aria-current={
                            (summary ? 1 : 0) === i ? "step" : undefined
                          }
                        >
                          <span>{i + 1}</span>
                          {label}
                        </li>
                      ),
                    )}
                  </ol>
                  <div className="settings-actions">
                    <button
                      className="expense-secondary"
                      aria-describedby={
                        importError && !summary ? "import-error" : undefined
                      }
                      disabled={!canSelect}
                      onClick={chooseFile}
                    >
                      <Upload size={17} aria-hidden="true" />
                      {fileName ? tr("Chọn file khác") : tr("Nhập bản sao lưu")}
                    </button>
                  </div>
                  {status && (
                    <p className="settings-hint">
                      {tr("Bản sao lưu (.json) · Tối đa")}{" "}
                      {(status.maxBytes / 1024 / 1024).toLocaleString(
                        numberLocale,
                      )}{" "}
                      MiB
                    </p>
                  )}
                </>
              )
            )}
            {fileName && !complete && (
              <div className="settings-selected-file">
                <FileJson size={19} aria-hidden="true" />
                <span>{fileName}</span>
                <button
                  className="expense-secondary settings-icon-button"
                  aria-label={tr("Bỏ file đã chọn")}
                  disabled={!!busy}
                  onClick={clearFile}
                >
                  <X size={17} aria-hidden="true" />
                </button>
              </div>
            )}
            {importError && !summary && (
              <div
                className="settings-feedback settings-feedback-error"
                id="import-error"
              >
                <p role="alert">{tr(importError)}</p>
              </div>
            )}
            {busy === "preview" && (
              <LoadingStatus>{tr("Đang kiểm tra bản sao lưu…")}</LoadingStatus>
            )}
            {summary && !complete && (
              <div className="backup-summary">
                <h4>{tr("Xem trước bản sao lưu")}</h4>
                <dl className="backup-metadata">
                  <div>
                    <dt>{tr("Ngày xuất")}</dt>
                    <dd>
                      {new Date(summary.exportedAt).toLocaleString(
                        numberLocale,
                        {
                          timeZone: "Asia/Ho_Chi_Minh",
                        },
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>{tr("Thời gian dữ liệu")}</dt>
                    <dd>
                      {period(summary.from)} → {period(summary.to)}
                    </dd>
                  </div>
                </dl>
                <dl className="backup-counts">
                  {Object.entries(summary.counts).map(([key, v]) => (
                    <div key={key}>
                      <dt>{v.label}</dt>
                      <dd>
                        {v.rows.toLocaleString(numberLocale)} {tr("bản ghi")}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="settings-hint">
                  {tr("Số bản ghi bao gồm cả dữ liệu và lịch sử.")}
                </p>
                <label className="backup-profile-option">
                  <input
                    type="checkbox"
                    checked={restoreProfile}
                    disabled={!!busy}
                    onChange={(e) => setRestoreProfile(e.target.checked)}
                  />
                  <span>
                    {tr("Khôi phục họ tên, ngày sinh và giới tính từ file")}
                    <small>
                      {tr(
                        "Email và thông tin đăng nhập hiện tại được giữ nguyên.",
                      )}
                    </small>
                  </span>
                </label>
                <button
                  aria-busy={busy === "import"}
                  className="expense-primary"
                  disabled={!!busy || !summary.canImport}
                  onClick={() => void restore()}
                >
                  {busy === "import" ? (
                    <LoadingSpinner />
                  ) : (
                    <Upload size={17} aria-hidden="true" />
                  )}
                  {busy === "import"
                    ? tr("Đang khôi phục…")
                    : tr("Xác nhận nhập bản sao lưu")}
                </button>
              </div>
            )}
            {importError && summary && (
              <div
                className="settings-feedback settings-feedback-error"
                id="import-error"
              >
                <p role="alert">{tr(importError)}</p>
              </div>
            )}
            {importNotice && (
              <div
                ref={result}
                tabIndex={-1}
                className="settings-feedback settings-import-result"
              >
                <p role="status">
                  <Check size={18} aria-hidden="true" />
                  {tr(importNotice)}
                </p>
                {complete && (
                  <Link className="back-link" href="/overview">
                    {tr("Mở Tổng quan")}
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                )}
              </div>
            )}
            {profilePending && (
              <div className="settings-actions">
                <button
                  aria-busy={busy === "profile"}
                  className="expense-secondary"
                  disabled={!!busy}
                  onClick={() => void retryProfile()}
                >
                  {busy === "profile" && <LoadingSpinner />}
                  {tr("Thử khôi phục hồ sơ")}
                </button>
                <Link href="/profile">{tr("Thông tin cá nhân")}</Link>
              </div>
            )}
          </section>
        </div>
      </section>
      <section className="panel settings-appearance">
        <LanguagePicker />
        <ThemePicker />
      </section>
      <details className="panel settings-install">
        <summary>
          <Smartphone size={22} aria-hidden="true" />
          <span>
            {tr("Cài lên màn hình chính")}
            <small>
              {tr("Mở ứng dụng nhanh hơn trên điện thoại hoặc máy tính.")}
            </small>
          </span>
        </summary>
        <InstallGuide />
      </details>
    </div>
  );
}
