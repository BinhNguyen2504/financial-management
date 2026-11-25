"use client";
import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/modal";
import { LoadingSpinner } from "@/components/loading";
import { useI18n } from "@/i18n/provider";
import { parseBackup, backupTables } from "@/domain/backup/format";
import { restoreBlockers, type RestoreBlocker } from "@/domain/backup/status";
import { moduleLabels } from "@/domain/backup/format";
import {
  addedResetModules,
  isFullReset,
  resetConfirmationFor,
  resetModuleSchema,
  resetModules,
  resolveResetModules,
  type ResetModule,
} from "@/domain/backup/reset-modules";
import { publishFinancialReset } from "@/lib/financial-reset-events";
import { DataRequestError, dataRequest, type DataStatus } from "./api";

type PreparedReset = {
  operationId: string;
  expiresAt: string;
  url: string;
  name: string;
  blockers: RestoreBlocker[];
  /** Scope fixed by the server when the backup was prepared. */
  modules: ResetModule[];
};
type Scope = "all" | "pages";

/** Reads the scope the server resolved; a missing header means the whole account (older servers). */
function preparedModules(header: string | null): ResetModule[] {
  if (!header) return [...resetModules];
  const parsed = header
    .split(",")
    .map((item) => resetModuleSchema.safeParse(item.trim()))
    .flatMap((item) => (item.success ? [item.data] : []));
  return parsed.length ? resolveResetModules(parsed) : [...resetModules];
}
const sameModules = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((item, index) => item === b[index]);
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
    [done, setDone] = useState<ResetModule[] | null>(null),
    [uncertain, setUncertain] = useState(false);
  const [scope, setScope] = useState<Scope>("all"),
    [pages, setPages] = useState<ResetModule[]>([]);
  const requestId = useRef("");
  // The scope shown now; once a backup is prepared the server's scope is authoritative.
  const chosen: ResetModule[] = scope === "all" ? [...resetModules] : pages;
  const effective = prepared?.modules ?? resolveResetModules(chosen);
  const added = addedResetModules(chosen);
  const full = isFullReset(effective);
  const phrase = resetConfirmationFor(effective);
  const countOf = (module: ResetModule) =>
    (prepared?.blockers ?? status?.blockers)?.find(
      (item) => item.key === module,
    )?.count ?? 0;
  const modulesReady = status?.resetModulesReady !== false;
  function changeScope(nextScope: Scope, nextPages: ResetModule[]) {
    if (busyRef.current || uncertain) return;
    setScope(nextScope);
    setPages(nextPages);
    // A backup prepared for another scope must not be confirmed for this one.
    setPrepared(null);
    setSaved(false);
    setConfirmation("");
    setError("");
  }
  const active = useRef(true),
    cancel = useRef<HTMLButtonElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const confirmationHeading = useRef<HTMLHeadingElement>(null);
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
  useEffect(() => {
    if (!prepared) return;
    confirmationHeading.current?.focus({ preventScroll: true });
    confirmationHeading.current?.scrollIntoView({
      block: "start",
      behavior: "instant",
    });
  }, [prepared]);
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
        // A whole-account reset keeps the original empty body, so it also works before the module migration.
        body: scope === "all" ? "{}" : JSON.stringify({ modules: pages }),
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
        modules: preparedModules(response.headers.get("X-Reset-Modules")),
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
      confirmation !== phrase ||
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
          modules: prepared.modules,
          confirmation,
        }),
      });
      const result = await response.json();
      // `empty` only describes the whole account; a partial reset is checked by its scope instead.
      const confirmedScope = isFullReset(prepared.modules)
        ? result?.empty === true
        : Array.isArray(result?.modules) &&
          sameModules(result.modules, prepared.modules);
      if (
        !confirmedScope ||
        result.operationId !== prepared.operationId ||
        !Number.isInteger(result.dataGeneration)
      )
        throw new Error("INVALID_RESPONSE");
      if (!active.current) return;
      setUncertain(false);
      setOpen(false);
      setPrepared(null);
      setDone(prepared.modules);
      // A local notification carries no financial contents; stale remote requests are also server-guarded.
      publishFinancialReset(status.ownerId);
      await onReset();
    } catch (e) {
      if (!active.current) return;
      const unknown =
        !(e instanceof DataRequestError) ||
        e.status === undefined ||
        (e.status >= 500 &&
          ![
            "RESET_NOT_READY",
            "RESET_MODULES_NOT_READY",
            "RESET_PERMISSION_REQUIRED",
          ].includes(e.code ?? ""));
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
        [
          "RESET_DATA_CHANGED",
          "RESET_EXPIRED",
          "RESET_NOT_FOUND",
          "RESET_SCOPE_CHANGED",
        ].includes(e.code ?? "")
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
          "Xóa toàn bộ dữ liệu tài chính, hoặc chỉ một số trang, để bắt đầu lại hoặc nhập bản sao lưu vào tài khoản hiện tại. Bạn phải lưu bản sao lưu trước khi xóa.",
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
          setDone(null);
        }}
      >
        {tr("Làm trống dữ liệu tài chính")}
      </button>
      {done && isFullReset(done) && (
        <div className="settings-feedback action-message">
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
      {done && !isFullReset(done) && (
        <div className="settings-feedback action-message">
          <p role="status">
            {tr("Đã làm trống:")}{" "}
            {done.map((module) => tr(moduleLabels[module])).join(", ")}
            {". "}
            {tr(
              "Các trang khác được giữ nguyên. Khôi phục chỉ dùng được cho tài khoản trống hoàn toàn.",
            )}
          </p>
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
            <>
              <button
                ref={cancel}
                className="expense-secondary"
                disabled={busy || uncertain}
                onClick={close}
              >
                {tr("Hủy")}
              </button>
              {!prepared ? (
                <button
                  className="expense-primary"
                  disabled={busy || uncertain || chosen.length === 0}
                  aria-busy={busy}
                  onClick={() => void prepare()}
                >
                  {busy && <LoadingSpinner />}
                  {tr("Tải bản sao lưu trước khi xóa")}
                </button>
              ) : (
                <button
                  className="expense-primary expense-danger"
                  aria-busy={busy}
                  disabled={
                    busy || !prepared || !saved || confirmation !== phrase
                  }
                  onClick={() => void reset()}
                >
                  {busy && <LoadingSpinner />}
                  {tr(
                    uncertain
                      ? "Kiểm tra kết quả làm trống"
                      : full
                        ? "Xóa toàn bộ dữ liệu tài chính"
                        : "Xóa dữ liệu các trang đã chọn",
                  )}
                </button>
              )}
            </>
          }
        >
          <div className="settings-reset-body">
            <ol
              className="settings-reset-progress"
              aria-label={tr("Các bước làm trống dữ liệu")}
            >
              <li
                aria-current={!prepared ? "step" : undefined}
                data-complete={!!prepared}
              >
                <span className="settings-reset-step-number" aria-hidden="true">
                  1
                </span>
                <span>
                  {tr("Tạo bản sao lưu")}
                  <small>
                    {tr(prepared ? "Đã tạo file" : "Bước hiện tại")}
                  </small>
                </span>
              </li>
              <li aria-current={prepared ? "step" : undefined}>
                <span className="settings-reset-step-number" aria-hidden="true">
                  2
                </span>
                <span>
                  {tr("Kiểm tra và xác nhận")}
                  <small>
                    {tr(prepared ? "Bước hiện tại" : "Sau khi tạo bản sao lưu")}
                  </small>
                </span>
              </li>
            </ol>
            <div className="settings-reset-account">
              <p>{tr("Tài khoản sẽ được làm trống")}</p>
              <strong>{account}</strong>
            </div>
            <fieldset
              className="settings-reset-section settings-reset-picker"
              disabled={busy || uncertain}
            >
              <legend>{tr("Phạm vi làm trống")}</legend>
              <label className="settings-reset-choice">
                <input
                  type="radio"
                  name="reset-scope"
                  checked={scope === "all"}
                  onChange={() => changeScope("all", pages)}
                />
                <span>{tr("Toàn bộ tài khoản")}</span>
              </label>
              <label className="settings-reset-choice">
                <input
                  type="radio"
                  name="reset-scope"
                  checked={scope === "pages"}
                  disabled={!modulesReady}
                  onChange={() => changeScope("pages", pages)}
                />
                <span>{tr("Chỉ một số trang")}</span>
              </label>
              {!modulesReady && (
                <p className="settings-reset-note">
                  {tr(
                    "Làm trống theo từng trang chưa được bật trên hệ thống này. Bạn vẫn có thể làm trống toàn bộ tài khoản.",
                  )}
                </p>
              )}
              {scope === "pages" && (
                <div className="settings-reset-pages">
                  {resetModules.map((module) => {
                    const implied = added.includes(module);
                    return (
                      <label className="settings-reset-choice" key={module}>
                        <input
                          type="checkbox"
                          checked={effective.includes(module)}
                          disabled={implied || countOf(module) === 0}
                          onChange={(e) =>
                            changeScope(
                              "pages",
                              e.target.checked
                                ? [...pages, module]
                                : pages.filter((item) => item !== module),
                            )
                          }
                        />
                        <span>
                          {tr(moduleLabels[module])}
                          <small>
                            {implied
                              ? tr("Đi kèm vì Mục tiêu liên kết với trang này")
                              : `${countOf(module).toLocaleString(numberLocale)} ${tr("bản ghi")}`}
                          </small>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
              {scope === "pages" && added.length > 0 && (
                <p className="settings-reset-note" role="status">
                  {tr(
                    "Mục tiêu được làm trống cùng Tiết kiệm, Đầu tư hoặc Quỹ an toàn vì chúng liên kết với nhau.",
                  )}
                </p>
              )}
            </fieldset>
            <section
              className="settings-reset-section"
              aria-labelledby="reset-scope-heading"
            >
              <h3 id="reset-scope-heading">{tr("Dữ liệu sẽ xóa")}</h3>
              <p>
                {tr(
                  full
                    ? "Xóa toàn bộ năm, sổ, danh mục, cấu hình, giao dịch, lịch sử và kỳ đã chốt của tất cả phân hệ, gồm cả Mục tiêu."
                    : "Xóa toàn bộ năm, sổ, danh mục, cấu hình, giao dịch, lịch sử và kỳ đã chốt của các trang đã chọn. Các trang khác được giữ nguyên.",
                )}
              </p>
              <dl className="settings-reset-counts">
                {(prepared?.blockers ?? status?.blockers)
                  ?.filter((item) =>
                    effective.some((module) => module === item.key),
                  )
                  .map((item) => (
                    <div key={item.key}>
                      <dt>{tr(item.label)}</dt>
                      <dd>
                        {item.count.toLocaleString(numberLocale)}{" "}
                        {tr("bản ghi")}
                      </dd>
                    </div>
                  ))}
              </dl>
              <p className="settings-reset-note">
                {tr("Gồm sổ, cấu hình và lịch sử; không phải số giao dịch.")}
              </p>
              <p className="settings-reset-warning">
                {tr(
                  "Không thể hoàn tác trực tiếp. Muốn lấy lại dữ liệu, bạn cần nhập bản sao lưu.",
                )}
              </p>
            </section>
            <section
              className="settings-reset-section"
              aria-labelledby="reset-retained-heading"
            >
              <h3 id="reset-retained-heading">
                {tr("Thông tin được giữ lại")}
              </h3>
              <p>
                {tr(
                  "Tài khoản đăng nhập, hồ sơ cá nhân, bố cục Tổng quan và tùy chọn giao diện được giữ lại.",
                )}
              </p>
              {!full && (
                <p>
                  {tr(
                    "Dữ liệu của các trang không được chọn cũng được giữ nguyên.",
                  )}
                </p>
              )}
            </section>
            <section
              className="settings-reset-section"
              aria-labelledby="reset-backup-heading"
            >
              <h3 id="reset-backup-heading">
                {tr("1. Tạo bản sao lưu hiện tại")}
              </h3>
              <p>
                {tr("Tải file JSON đầy đủ trước khi tiếp tục xác nhận xóa.")}
                {!full && (
                  <>
                    {" "}
                    {tr(
                      "File sao lưu luôn gồm toàn bộ tài khoản, không chỉ các trang đã chọn.",
                    )}
                  </>
                )}
              </p>
              {prepared && (
                <button
                  className="expense-secondary"
                  disabled={busy || uncertain}
                  onClick={() => void prepare()}
                >
                  {tr("Tạo bản sao lưu mới")}
                </button>
              )}
            </section>
            {prepared && (
              <section
                className="settings-reset-section settings-reset-verification"
                aria-labelledby="reset-confirm-heading"
              >
                <h3
                  id="reset-confirm-heading"
                  ref={confirmationHeading}
                  tabIndex={-1}
                >
                  {tr("2. Kiểm tra và xác nhận xóa")}
                </h3>
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
                <label className="settings-reset-confirm">
                  {tr(
                    full
                      ? "Nhập XÓA TOÀN BỘ để xác nhận"
                      : "Nhập XÓA DỮ LIỆU để xác nhận",
                  )}
                  <input
                    value={confirmation}
                    disabled={busy || uncertain}
                    autoComplete="off"
                    onChange={(e) => setConfirmation(e.target.value)}
                  />
                </label>
              </section>
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
