"use client";
import { buildInvestmentAction } from "./editor-action";

import { useI18n } from "@/i18n/provider";
import type { CommandResult } from "@/application/investments";

import { focusFirstInvalid } from "@/components/form-feedback";

import { useMoney, useMoneyHidden } from "@/components/privacy";
import { useToast } from "@/components/toast";
import {
  activeTransactions,
  replay,
  ruleAt,
} from "@/domain/investments/engine";
import {
  type InvestmentAction,
  type InvestmentCommand,
  type InvestmentTransaction,
} from "@/domain/investments/schema";
import type { InvestmentView } from "@/domain/investments/types";

import { fieldErrorsFromIssues } from "@/lib/field-errors";
import { comparable, normalizedMoneyFields } from "@/lib/form-values";

import { useId, useRef, useState } from "react";
import { InvestmentAPIError, investmentsJSON } from "./api";
import { transactionNames, type EditorMode } from "./editor-config";
export function useInvestmentEditor({
  mode,
  view: initial,
  refresh,
  onSaved,
  onClose,
}: {
  mode: EditorMode;
  view: InvestmentView;
  refresh: () => Promise<InvestmentView>;
  onSaved: () => void;
  onClose: () => void;
}) {
  const { t: tr, config: localize } = useI18n("investments");
  const localizedTransactionNames = localize(transactionNames);
  const toast = useToast();
  const [view, setView] = useState(initial),
    hidden = useMoneyHidden(),
    money = useMoney();
  const old = "transaction" in mode ? mode.transaction : null;
  const category = initial.book?.categories.find(
    (c) => c.id === mode.categoryId,
  );
  const originalId = useRef(old?.id ?? crypto.randomUUID()),
    entityId = useRef(crypto.randomUUID());
  const rule = category ? ruleAt(category, view.today) : null;
  const [f, setF] = useState<Record<string, string>>({
    date:
      old?.date ??
      ("kind" in mode && mode.kind?.startsWith("opening")
        ? category?.start
        : view.today) ??
      view.today,
    start: view.today,
    categoryId: old?.categoryId ?? mode.categoryId ?? "",
    cashCategoryId:
      "cashCategoryId" in (old ?? {})
        ? ((old as { cashCategoryId: string | null }).cashCategoryId ?? "")
        : "",
    transactionKind:
      old?.kind ?? ("kind" in mode ? mode.kind : undefined) ?? "buy",
    kind: category?.kind ?? "investment",
    name: rule?.name ?? "",
    emoji: rule?.emoji ?? "🌱",
    description: rule?.description ?? "",
    amount: "",
    fee: "0",
    tax: "0",
    cost: "",
    value: "",
    note: old?.note ?? "",
    counterparty: old?.counterparty ?? "",
    reason: "",
    ...(old
      ? Object.fromEntries(
          Object.entries(old).filter(([, v]) => typeof v === "string"),
        )
      : {}),
  });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [fieldErrors, setFieldErrors] = useState<Record<string, string>>({}),
    [conflict, setConflict] = useState(false),
    [uncertain, setUncertain] = useState(false);
  const [preview, setPreview] = useState<{
    command: InvestmentCommand;
    result: CommandResult;
  } | null>(null);
  const pending = useRef<InvestmentCommand | null>(null),
    errorRef = useRef<HTMLDivElement>(null);
  const draft = comparable({ ...normalizedMoneyFields(f), reason: undefined });
  const [originalDraft] = useState(draft);
  const unchanged =
    (mode.type === "configure" || mode.type === "revise") &&
    draft === originalDraft;
  const set = (key: string, value: string) => {
    setF((s) => ({ ...s, [key]: value }));
    setPreview(null);
    setError("");
    setFieldErrors((previous) => {
      const next = { ...previous };
      delete next[key];
      return next;
    });
  };
  const categories = view.book?.categories ?? [],
    kind = f.transactionKind as InvestmentTransaction["kind"];
  const financial = mode.type === "transaction" || mode.type === "revise";
  const title =
    mode.type === "create"
      ? tr("Thêm danh mục")
      : mode.type === "configure"
        ? tr("Sửa danh mục")
        : mode.type === "archive"
          ? tr("Xóa / lưu trữ danh mục")
          : mode.type === "restore"
            ? tr("Khôi phục danh mục")
            : mode.type === "cancel"
              ? tr("Hủy giao dịch")
              : tr("Ghi giao dịch");
  function close() {
    if (
      (draft === originalDraft && !f.reason) ||
      window.confirm(tr("Đóng cửa sổ và bỏ nội dung chưa lưu?"))
    )
      onClose();
  }
  const isCash = ["openingCash", "deposit", "withdraw", "transfer"].includes(
    kind,
  );
  const eligible = categories.filter(
    (c) =>
      c.kind === (isCash ? "cash" : "investment") &&
      !!ruleAt(c, f.date)?.active,
  );
  function action(): InvestmentAction {
    return buildInvestmentAction({
      mode,
      entityId: entityId.current,
      fields: f,
      old,
      originalId: originalId.current,
      kind,
    });
  }
  async function submit() {
    if (unchanged) return;
    if (hidden) {
      setError(tr("Hãy hiện tiền để kiểm tra trước khi lưu."));
      return;
    }
    setBusy(true);
    setError("");
    let writing = false;
    try {
      const a = action();
      const command =
        pending.current &&
        JSON.stringify(pending.current.action) === JSON.stringify(a)
          ? pending.current
          : {
              id: crypto.randomUUID(),
              expectedVersion: view.book?.version ?? 0,
              action: a,
            };
      pending.current = command;
      if (!preview || preview.command.id !== command.id)
        setPreview({
          command,
          result: await investmentsJSON<CommandResult>("/preview", command),
        });
      else {
        writing = true;
        await investmentsJSON("/commands", command);
        toast("success", tr("Đã lưu thay đổi."));
        onSaved();
      }
    } catch (e) {
      const unknownWrite =
        writing &&
        (!(e instanceof InvestmentAPIError) ||
          ![400, 401, 403, 409, 415, 422].includes(e.status));
      if (e && typeof e === "object" && "issues" in e) {
        setFieldErrors(
          fieldErrorsFromIssues(
            (e as { issues: { path: (string | number)[]; message: string }[] })
              .issues,
          ),
        );
        setError(tr("Kiểm tra các trường được đánh dấu."));
      } else {
        if (e instanceof InvestmentAPIError && e.fieldErrors)
          setFieldErrors(e.fieldErrors);
        setError(e instanceof Error ? e.message : tr("Không thể lưu."));
        setConflict(
          e instanceof InvestmentAPIError && e.code === "VERSION_CONFLICT",
        );
        if (unknownWrite) setUncertain(true);
      }
      focusFirstInvalid(
        document.querySelector(
          ".expense-dialog[open]:not([inert]) .dialog-body",
        ),
        errorRef.current,
      );
      toast(
        unknownWrite ? "warning" : "error",
        unknownWrite
          ? tr("Chưa xác nhận được kết quả lưu. Bấm lưu lại để kiểm tra.")
          : e instanceof Error
            ? e.message
            : tr("Chưa hoàn tất. Hãy thử lại."),
      );
    } finally {
      setBusy(false);
    }
  }
  function sellAll() {
    if (!view.book || !f.categoryId) return;
    try {
      const root = old?.id;
      const b = {
        ...view.book,
        revisions: root
          ? view.book.revisions.filter((r) => r.rootId !== root)
          : view.book.revisions,
      };
      // Exclude later transactions on the same date when revising an existing sale.
      const sequence = root
        ? activeTransactions(view.book).find((r) => r.transaction.id === root)!
            .sequence - 1
        : Infinity;
      const p = replay(b, f.date, sequence).positions.find(
        (p) => p.id === f.categoryId,
      );
      if (p) {
        set("cost", p.cost);
        set("value", "0");
      }
    } catch {
      setError(
        tr(
          "Không thể tính vốn tại ngày này. Hãy nhập giá vốn bán và xem trước để kiểm tra.",
        ),
      );
    }
  }
  const formId = useId();
  const reloadAfterConflict = async () => {
    setBusy(true);
    try {
      setView(await refresh());
      pending.current = null;
      setPreview(null);
      setConflict(false);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : tr("Chưa tải được dữ liệu."));
    } finally {
      setBusy(false);
    }
  };
  return {
    hidden,
    f,
    set,
    view,
    fieldErrors,
    tr,
    eligible,
    title,
    close,
    busy,
    uncertain,
    mode,
    formId,
    conflict,
    unchanged,
    preview,
    submit,
    kind,
    error,
    errorRef,
    financial,
    localizedTransactionNames,
    sellAll,
    categories,
    money,
    setBusy,
    setView,
    refresh,
    setPreview,
    setConflict,
    setError,
    reloadAfterConflict,
  };
}
