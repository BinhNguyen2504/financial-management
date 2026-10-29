"use client";
import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/modal";
import { LoadingSpinner } from "@/components/loading";
import { useI18n } from "@/i18n/provider";
import { parseBackup, backupTables } from "@/domain/backup/format";
import { restoreBlockers, type RestoreBlocker } from "@/domain/backup/status";
import { publishFinancialReset } from "@/lib/financial-reset-events";
import { DataRequestError, dataRequest, type DataStatus } from "./api";

type PreparedReset = {
  operationId: string;
  expiresAt: string;
  url: string;
  name: string;
  blockers: RestoreBlocker[];
};
export function ResetData({
  status,
  account,
  disabled,
  onBusy,
  onReset,
  onChoose,
}: {
  status: DataStatus | null;
  account: string;
  disabled: boolean;
  onBusy(value: string): void;
  onReset(): Promise<void>;
  onChoose(): void;
}) {
  const { t: tr, numberLocale } = useI18n("settings");
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false);
  const [prepared, setPrepared] = useState<PreparedReset | null>(null);
  const [saved, setSaved] = useState(false),
    [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState(""),
    [done, setDone] = useState(false),
    [uncertain, setUncertain] = useState(false);
  const requestId = useRef("");
  const active = useRef(true),
    cancel = useRef<HTMLButtonElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const busyRef = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  useEffect(
    () => () => {
      if (prepared) URL.revokeObjectURL(prepared.url);
    },
    [prepared],
  );
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  function close() {
    if (busyRef.current || uncertain) return;
    setOpen(false);
    setPrepared(null);
    setSaved(false);
    setConfirmation("");
    setError("");
  }
  async function prepare() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    onBusy("reset-backup");
    setError("");
    setPrepared(null);
    setSaved(false);
    setConfirmation("");
    try {
      const response = await dataRequest("/reset/prepare", {
        method: "POST",
        body: "{}",
      });
      const blob = await response.blob();
      const backup = parseBackup(JSON.parse(await blob.text()));
      const operationId = response.headers.get("X-Reset-Operation-Id"),
        expiresAt = response.headers.get("X-Reset-Expires-At");
      if (!operationId || !expiresAt)
        throw new Error(
          tr(
            "Chưa nhận được bản sao lưu hợp lệ. Hãy tải lại trang và thử lại.",
          ),
        );
      if (!active.current) return;
      const file = {
        operationId,
        expiresAt,
        url: URL.createObjectURL(blob),
        name: `financial-manager-before-reset-${operationId}.json`,
        blockers: restoreBlockers(
          Object.fromEntries(
            backupTables.map((table) => [table, backup.tables[table].length]),
          ),
        ),
      };
      requestId.current = crypto.randomUUID();
      setPrepared(file);
      const anchor = document.createElement("a");
      anchor.href = file.url;
      anchor.download = file.name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch (e) {
      if (active.current)
        setError(
          e instanceof Error
            ? e.message
            : tr("Chưa tạo được file. Bạn có thể thử tải lại."),
        );
    } finally {
      if (active.current) {
        busyRef.current = false;
        setBusy(false);
        onBusy("");
      }
    }
  }
  async function reset() {
    if (
      busyRef.current ||
      !prepared ||
      !saved ||
      confirmation !== "XÓA TOÀN BỘ" ||
      !status
    )
      return;
    busyRef.current = true;
    setBusy(true);
    onBusy("reset");
    setError("");
    try {
      const response = await dataRequest("/reset", {
        method: "POST",
        body: JSON.stringify({
          operationId: prepared.operationId,
          requestId: requestId.current,
          targetOwnerId: status.ownerId,
          backupSaved: saved,
          confirmation,
        }),
      });
      const result = await response.json();
      if (
        result?.empty !== true ||
        result.operationId !== prepared.operationId ||
        !Number.isInteger(result.dataGeneration)
      )
        throw new Error("INVALID_RESPONSE");
      if (!active.current) return;
      setUncertain(false);
      setOpen(false);
      setPrepared(null);
      setDone(true);
      // A local notification carries no financial contents; stale remote requests are also server-guarded.
      publishFinancialReset(status.ownerId);
      await onReset();
    } catch (e) {
      if (!active.current) return;
      const unknown =
        !(e instanceof DataRequestError) ||
        e.status === undefined ||
        (e.status >= 500 && e.code !== "RESET_NOT_READY");
      setUncertain(unknown);
      setError(
        unknown
          ? tr(
              "Chưa xác nhận được kết quả làm trống. Bấm lại để kiểm tra cùng yêu cầu; không tạo yêu cầu xóa mới.",
            )
          : e.message,
      );
      if (
        e instanceof DataRequestError &&
        ["RESET_DATA_CHANGED", "RESET_EXPIRED", "RESET_NOT_FOUND"].includes(
          e.code ?? "",
        )
      ) {
        setPrepared(null);
        setSaved(false);
        setConfirmation("");
      }
    } finally {
      if (active.current) {
        busyRef.current = false;
        setBusy(false);
        onBusy("");
      }
    }
  }
  return (
    <section
      className="panel settings-card settings-reset"
      id="reset-data"
      aria-labelledby="reset-heading"
    >
      <h3 id="reset-heading">{tr("Làm trống dữ liệu tài chính")}</h3>
      <p>
        {tr(
          "Xóa toàn bộ dữ liệu tài chính để bắt đầu lại hoặc nhập bản sao lưu vào tài khoản hiện tại. Bạn phải lưu bản sao lưu trước khi xóa.",
        )}
      </p>
      {status && !status.resetReady && (
        <p>
          {tr(
            "Làm trống dữ liệu chưa được bật trên hệ thống này. Bạn vẫn có thể tải bản sao lưu.",
          )}
        </p>
      )}
      <button
        className="expense-secondary"
        disabled={disabled || !status?.resetReady || status.empty || busy}
        onClick={() => {
          setOpen(true);
          setDone(false);
        }}
      >
        {tr("Làm trống dữ liệu tài chính")}
      </button>
      {done && (
        <div className="settings-feedback">
          <p role="status">
            {tr(
              "Đã làm trống toàn bộ dữ liệu tài chính. Bạn có thể bắt đầu lại hoặc chọn bản sao lưu để khôi phục.",
            )}
          </p>
          <button
            className="expense-secondary"
            disabled={disabled || !status?.empty || !status.importReady}
            onClick={onChoose}
          >
            {tr("Chọn bản sao lưu để khôi phục")}
          </button>
        </div>
      )}
      {open && (
        <Modal
          title={tr("Làm trống dữ liệu tài chính")}
          onClose={close}
          busy={busy || uncertain}
          size="detail"
          initialFocusRef={cancel}
          footer={
            <div className="expense-actions">
              <button
                ref={cancel}
                className="expense-secondary"
                disabled={busy || uncertain}
                onClick={close}
              >
                {tr("Hủy")}
              </button>
              <button
                className="expense-primary expense-danger"
                aria-busy={busy}
                disabled={
                  busy || !prepared || !saved || confirmation !== "XÓA TOÀN BỘ"
                }
                onClick={() => void reset()}
              >
                {busy && <LoadingSpinner />}
                {tr(
                  uncertain
                    ? "Kiểm tra kết quả làm trống"
                    : "Xóa toàn bộ dữ liệu tài chính",
                )}
              </button>
            </div>
          }
        >
          <div className="settings-reset-body">
            <p>
              <strong>{tr("Tài khoản sẽ được làm trống")}: </strong>
              {account}
            </p>
            <p>
              {tr(
                "Thao tác này xóa toàn bộ năm, sổ, danh mục, cấu hình, giao dịch, lịch sử và kỳ đã chốt của cả 5 phân hệ. Không thể hoàn tác trực tiếp; muốn lấy lại dữ liệu cần nhập bản sao lưu.",
              )}
            </p>
            <ul>
              {(prepared?.blockers ?? status?.blockers)?.map((item) => (
                <li key={item.key}>
                  {tr(item.label)}: {item.count.toLocaleString(numberLocale)}{" "}
                  {tr("bản ghi")}
                </li>
              ))}
            </ul>
            <p>
              {tr(
                "Tài khoản đăng nhập, hồ sơ cá nhân, bố cục Tổng quan và tùy chọn giao diện được giữ lại.",
              )}
            </p>
            <h4>{tr("1. Tạo và lưu bản sao lưu hiện tại")}</h4>
            <button
              className="expense-secondary"
              disabled={busy || uncertain}
              onClick={() => void prepare()}
            >
              {tr(
                prepared
                  ? "Tạo bản sao lưu mới"
                  : "Tải bản sao lưu trước khi xóa",
              )}
            </button>
            {prepared && (
              <>
                <p role="status">
                  {tr(
                    "Bản sao lưu đã sẵn sàng. Kiểm tra thư mục tải xuống trước khi xác nhận.",
                  )}
                </p>
                <a
                  className="expense-secondary"
                  href={prepared.url}
                  download={prepared.name}
                >
                  {tr("Lưu file JSON")}
                </a>
                <p>
                  {tr("Xác nhận có hiệu lực đến")}:{" "}
                  {new Date(prepared.expiresAt).toLocaleTimeString(
                    numberLocale,
                  )}
                </p>
                <label className="backup-profile-option">
                  <input
                    type="checkbox"
                    checked={saved}
                    disabled={busy || uncertain}
                    onChange={(e) => setSaved(e.target.checked)}
                  />
                  <span>{tr("Tôi đã lưu bản sao lưu và kiểm tra file.")}</span>
                </label>
                <h4>{tr("2. Xác nhận xóa toàn bộ dữ liệu tài chính")}</h4>
                <label className="settings-reset-confirm">
                  {tr("Nhập XÓA TOÀN BỘ để xác nhận")}
                  <input
                    value={confirmation}
                    disabled={busy || uncertain}
                    autoComplete="off"
                    onChange={(e) => setConfirmation(e.target.value)}
                  />
                </label>
              </>
            )}
            {error && (
              <p
                ref={errorRef}
                tabIndex={-1}
                role="alert"
                className="form-error"
              >
                {tr(error)}
              </p>
            )}
          </div>
        </Modal>
      )}
    </section>
  );
}
