"use client";
import { LanguagePicker } from "@/i18n/language-picker";
import { useI18n } from "@/i18n/provider";

import { LoadingSpinner, LoadingStatus } from "@/components/loading";
import { useToast } from "@/components/toast";
import { ThemePicker } from "@/components/ui-preferences";
import {
  BackupError,
  parseBackup,
  type FullBackup,
  type summarizeBackup,
} from "@/domain/backup/format";
import { HelpButton, HelpPageTitle } from "@/features/help/provider";
import { profileSchema } from "@/features/profile/fields";
import { useUser } from "@/features/profile/user-provider";
import { browserAuth } from "@/lib/supabase/browser";
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
import { useEffect, useRef, useState } from "react";
import { dataRequest, DataRequestError, type DataStatus } from "./api";
import { InstallGuide } from "./install-guide";
import "./settings.css";

type Summary = ReturnType<typeof summarizeBackup> & { canImport: boolean };
type PreparedFile = { url: string; name: string; size: number };
function message(e: unknown) {
  if (e instanceof SyntaxError)
    return "File JSON không đọc được. Hãy chọn bản sao lưu được xuất từ Cài đặt.";
  return e instanceof Error
    ? e.message
    : "Chưa hoàn tất. Kiểm tra kết nối và thử lại.";
}
function period(value: string | null) {
  if (!value) return "Chưa có dữ liệu";
  return value.split("-").reverse().join("/");
}
export function SettingsWorkspace() {
  const { t: tr, numberLocale } = useI18n("settings");

  const toast = useToast();
  const {
    user,
    loading: userLoading,
    error: userError,
    reload: reloadUser,
    update,
  } = useUser();
  const [status, setStatus] = useState<DataStatus | null>(null);
  const [checking, setChecking] = useState(true);
  const [statusError, setStatusError] = useState("");
  const [backup, setBackup] = useState<FullBackup | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [fileName, setFileName] = useState("");
  const [restoreProfile, setRestoreProfile] = useState(false);
  const [profilePending, setProfilePending] = useState(false);
  const [complete, setComplete] = useState(false);
  const [busy, setBusy] = useState("");
  const [exportError, setExportError] = useState("");
  const [importError, setImportError] = useState("");
  const [importNotice, setImportNotice] = useState("");
  const [prepared, setPrepared] = useState<PreparedFile | null>(null);
  const requestId = useRef("");
  const owner = useRef(user?.id);
  const inFlight = useRef(false);
  const statusRequest = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const result = useRef<HTMLDivElement>(null);

  async function reloadStatus() {
    const sequence = ++statusRequest.current,
      requestedOwner = owner.current;
    setChecking(true);
    setStatusError("");
    try {
      const next: DataStatus = await (await dataRequest("/status")).json();
      if (
        sequence === statusRequest.current &&
        owner.current === requestedOwner
      )
        setStatus(next);
    } catch (e) {
      if (
        sequence === statusRequest.current &&
        owner.current === requestedOwner
      ) {
        setStatus(null);
        setStatusError(message(e));
      }
    } finally {
      if (
        sequence === statusRequest.current &&
        owner.current === requestedOwner
      )
        setChecking(false);
    }
  }
  useEffect(() => {
    owner.current = user?.id;
    setStatus(null);
    setBackup(null);
    setSummary(null);
    setFileName("");
    setComplete(false);
    setProfilePending(false);
    setRestoreProfile(false);
    setExportError("");
    setImportError("");
    setImportNotice("");
    setPrepared(null);
    setBusy("");
    inFlight.current = false;
    requestId.current = "";
    if (fileInput.current) fileInput.current.value = "";
    if (user) void reloadStatus();
    return () => {
      statusRequest.current++;
    };
    // Each account owns its file, request id and readiness check.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);
  useEffect(
    () => () => {
      if (prepared) URL.revokeObjectURL(prepared.url);
    },
    [prepared],
  );
  useEffect(() => {
    if (complete && importNotice) result.current?.focus();
  }, [complete, importNotice]);

  async function download() {
    if (inFlight.current || !user) return;
    inFlight.current = true;
    setBusy("export");
    setExportError("");
    setPrepared(null);
    const downloadOwner = user.id;
    try {
      const response = await dataRequest("/backup"),
        blob = await response.blob();
      // A proxy/login page must never masquerade as a successful JSON download.
      parseBackup(JSON.parse(await blob.text()));
      if (owner.current !== downloadOwner) return;
      const url = URL.createObjectURL(blob);
      const name =
        response.headers
          .get("content-disposition")
          ?.match(/filename="([^"]+)"/)?.[1] ?? "financial-manager-backup.json";
      setPrepared({ url, name, size: blob.size });
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = name;
      document.body.appendChild(anchor);
      try {
        anchor.click();
      } finally {
        anchor.remove();
      }
      // Keep the URL alive for an explicit user-activated save link as well.
    } catch (e) {
      if (owner.current === downloadOwner)
        setExportError(
          e instanceof SyntaxError || e instanceof BackupError
            ? tr(
                "Chưa nhận được file JSON hợp lệ. Hãy tải lại trang và thử lại.",
              )
            : message(e),
        );
    } finally {
      if (owner.current === downloadOwner) {
        inFlight.current = false;
        setBusy("");
      }
    }
  }
  async function selectFile(file?: File) {
    if (!file || !status || inFlight.current) return;
    setBackup(null);
    setSummary(null);
    setComplete(false);
    setProfilePending(false);
    setRestoreProfile(false);
    setImportError("");
    setImportNotice("");
    setFileName(file.name);
    requestId.current = "";
    const selectedOwner = user?.id;
    inFlight.current = true;
    setBusy("preview");
    try {
      if (file.size > status.maxBytes)
        throw new Error(tr("File vượt giới hạn dung lượng hiện tại."));
      const parsed = parseBackup(JSON.parse(await file.text()));
      const preview: Summary = await (
        await dataRequest("/import/preview", {
          method: "POST",
          body: JSON.stringify(parsed),
        })
      ).json();
      if (owner.current !== selectedOwner) return;
      setBackup(parsed);
      setSummary(preview);
      requestId.current = crypto.randomUUID();
      if (!preview.canImport)
        setImportError(
          tr(
            "Chưa thể khôi phục vào tài khoản này. Kiểm tra trạng thái tài khoản rồi thử lại.",
          ),
        );
    } catch (e) {
      if (owner.current === selectedOwner) setImportError(message(e));
    } finally {
      if (owner.current === selectedOwner) {
        inFlight.current = false;
        setBusy("");
      }
    }
  }
  async function applyProfile() {
    if (
      !backup ||
      !user ||
      user.id !== status?.ownerId ||
      owner.current !== user.id
    )
      throw new Error(tr("Phiên đăng nhập đã thay đổi. Hãy tải lại trang."));
    const parsed = profileSchema.safeParse(backup.profile);
    if (!parsed.success)
      throw new Error(
        tr(
          "Dữ liệu tài chính đã khôi phục. Hồ sơ chưa đầy đủ; hãy cập nhật trong Thông tin cá nhân.",
        ),
      );
    const { data, error } = await browserAuth().auth.updateUser({
      data: parsed.data,
    });
    if (error || !data.user)
      throw new Error(
        tr(
          "Dữ liệu tài chính đã khôi phục. Chưa lưu được hồ sơ; hãy thử lại riêng bước hồ sơ.",
        ),
      );
    if (owner.current !== user.id) return;
    update(data.user);
    setProfilePending(false);
  }
  async function restore() {
    if (inFlight.current || !backup || !summary?.canImport) return;
    inFlight.current = true;
    setBusy("import");
    setImportError("");
    setImportNotice("");
    const destination = status?.ownerId;
    let imported = false;
    let writing = false;
    try {
      if (user?.id !== destination || owner.current !== destination)
        throw new Error(tr("Phiên đăng nhập đã thay đổi. Hãy tải lại trang."));
      writing = true;
      await dataRequest("/import", {
        method: "POST",
        body: JSON.stringify({
          requestId: requestId.current,
          targetOwnerId: destination,
          backup,
        }),
      });
      if (owner.current !== destination) return;
      imported = true;
      toast("success", tr("Đã khôi phục dữ liệu tài chính."));
      setComplete(true);
      setStatus((s) => (s ? { ...s, empty: false } : s));
      setImportNotice(
        tr(
          "Đã khôi phục toàn bộ dữ liệu tài chính. Bạn có thể mở các module để kiểm tra.",
        ),
      );
      if (restoreProfile) {
        setProfilePending(true);
        await applyProfile();
        if (owner.current === destination)
          setImportNotice(
            tr("Đã khôi phục dữ liệu tài chính và hồ sơ cá nhân."),
          );
      }
    } catch (e) {
      if (owner.current === destination) {
        const uncertain =
          writing &&
          !imported &&
          (!(e instanceof DataRequestError) ||
            e.status === undefined ||
            e.status >= 500);
        setImportError(
          uncertain
            ? tr(
                "Chưa xác nhận kết quả khôi phục. Giữ bản xem trước và thử lại cùng yêu cầu.",
              )
            : message(e),
        );
        toast(
          imported || uncertain ? "warning" : "error",
          imported
            ? tr("Dữ liệu tài chính đã khôi phục; hồ sơ cá nhân chưa lưu được.")
            : uncertain
              ? tr("Chưa xác nhận kết quả khôi phục. Thử lại cùng yêu cầu.")
              : message(e),
        );
      }
    } finally {
      if (owner.current === destination) {
        inFlight.current = false;
        setBusy("");
      }
    }
  }
  async function retryProfile() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy("profile");
    setImportError("");
    try {
      await applyProfile();
      setImportNotice(tr("Đã khôi phục dữ liệu tài chính và hồ sơ cá nhân."));
      toast("success", tr("Đã lưu hồ sơ cá nhân từ bản sao lưu."));
    } catch (e) {
      setImportError(message(e));
      toast("error", message(e));
    } finally {
      inFlight.current = false;
      setBusy("");
    }
  }
  function chooseFile() {
    if (fileInput.current) {
      fileInput.current.value = "";
      fileInput.current.click();
    }
  }
  function clearFile() {
    setBackup(null);
    setSummary(null);
    setFileName("");
    setImportError("");
    setRestoreProfile(false);
    requestId.current = "";
    if (fileInput.current) fileInput.current.value = "";
  }
  const canSelect =
    !!status?.empty && status.importReady !== false && !complete && !busy;
  const importUnavailable = status?.importReady === false;
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
                "Tải toàn bộ dữ liệu thành một file JSON, lưu ở nơi bạn có thể truy cập khi mất tài khoản.",
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
                  {tr("Lưu file JSON")}
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
                "Chọn file JSON đã xuất từ Cài đặt, kiểm tra nội dung rồi xác nhận. Chỉ khôi phục vào tài khoản chưa có dữ liệu.",
              )}
            </p>
            <input
              ref={fileInput}
              id="backup-file"
              className="settings-file-input"
              type="file"
              hidden
              accept=".json,application/json"
              aria-label={tr("Chọn file JSON sao lưu toàn tài khoản")}
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
                      {tr("File JSON toàn tài khoản · Tối đa")}{" "}
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
