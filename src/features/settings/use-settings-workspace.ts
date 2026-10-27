"use client";

import { useI18n } from "@/i18n/provider";

import { useToast } from "@/components/toast";

import {
  BackupError,
  parseBackup,
  type FullBackup,
  type summarizeBackup,
} from "@/domain/backup/format";

import { profileSchema } from "@/features/profile/fields";
import { useUser } from "@/features/profile/user-provider";
import { browserAuth } from "@/lib/supabase/browser";

import { useEffect, useRef, useState } from "react";
import { dataRequest, DataRequestError, type DataStatus } from "./api";

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
export function useSettingsWorkspace() {
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset files, drafts and pending requests when account identity changes.
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
      // eslint-disable-next-line react-hooks/exhaustive-deps -- Invalidate the latest request sequence on cleanup, including requests started after mount.
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
  return {
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
  };
}
