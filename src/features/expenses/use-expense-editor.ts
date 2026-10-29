"use client";
import { generationOf, generationHeaders } from "@/lib/data-generation";
import { buildExpenseAction } from "./editor-action";

import { useI18n } from "@/i18n/provider";
import type { CommandResult } from "@/application/expenses";

import { focusFirstInvalid, nativeErrors } from "@/components/form-feedback";

import { useMoney, useMoneyHidden } from "@/components/privacy";
import { useToast } from "@/components/toast";
import { type JarEmoji } from "@/domain/expenses/emoji";
import { ruleAt } from "@/domain/expenses/engine";

import type { ExpenseAction, ExpenseCommand } from "@/domain/expenses/schema";
import { expenseActionSchema } from "@/domain/expenses/schema";
import type { ExpenseView } from "@/domain/expenses/types";

import { fieldErrorsFromIssues } from "@/lib/field-errors";
import { comparable, normalizeInteger } from "@/lib/form-values";

import { useId, useRef, useState, type FormEvent } from "react";
import { ZodError } from "zod";
import { apiJSON, RequestError } from "./api";

import { type EditorMode, titles } from "./editor-config";
export function useExpenseEditor({
  editor,
  view,
  month,
  onClose,
  onSaved,
  onReload,
}: {
  editor: EditorMode;
  view: ExpenseView;
  month: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
  onReload: () => Promise<ExpenseView>;
}) {
  const { t: tr, locale, config: localize } = useI18n("expenses");
  const localizedTitles = localize(titles);
  const toast = useToast();
  const money = useMoney();
  const hidden = useMoneyHidden();
  const moneyForm = ["create", "configure", "month", "spend"].includes(
    editor.mode,
  );
  const row = "row" in editor ? editor.row : undefined;
  const input = view.book?.inputs.find(
    (i) => i.jarId === row?.jarId && i.month === row?.month,
  );
  const jar = view.book?.jars.find((j) => j.id === row?.jarId);
  const rule = jar ? ruleAt(jar.rules, row?.month ?? month) : undefined;
  const spend = "spend" in editor ? editor.spend : undefined;
  const label = "label" in editor ? editor.label : undefined;
  const [selectionView, setSelectionView] = useState(view);
  const [classifying, setClassifying] = useState(false);
  const [version, setVersion] = useState(view.book?.version ?? 0);
  const [generation] = useState(generationOf(view));
  const [name, setName] = useState(label?.name ?? row?.name ?? "");
  const [emoji, setEmoji] = useState<JarEmoji | null>(row?.emoji ?? null);
  const [description, setDescription] = useState(row?.description ?? "");
  const [kind, setKind] = useState<"monthly" | "accumulation">("monthly");
  const [labelKind, setLabelKind] = useState<"method" | "group">(
    label?.kind ?? "method",
  );
  const [method, setMethod] = useState(row?.method ?? "");
  const [group, setGroup] = useState(row?.group ?? "");
  const [period, setPeriod] = useState(
    row?.month ??
      (editor.mode === "initialize" ? view.today.slice(0, 7) : month),
  );
  const [amount, setAmount] = useState(spend?.amount ?? rule?.amount ?? "");
  const [opening, setOpening] = useState("0");
  const [target, setTarget] = useState(input?.target ?? "");
  const [funding, setFunding] = useState(input?.funding ?? "");
  const [extra, setExtra] = useState(input?.extra ?? "0");
  const [closing, setClosing] = useState(input?.closing ?? "");
  const [date, setDate] = useState(spend?.date ?? view.today);
  const [note, setNote] = useState(spend?.note ?? "");
  const [preview, setPreview] = useState<CommandResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [brandKey, setBrandKey] = useState(label?.brandKey ?? "");
  const [iconKey, setIconKey] = useState(label?.iconKey ?? "");
  const [conflict, setConflict] = useState(false);
  const command = useRef<ExpenseCommand | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const future = (row?.month ?? month) > view.today.slice(0, 7);
  function makeAction(): ExpenseAction {
    return buildExpenseAction({
      name,
      description,
      method,
      group,
      amount,
      editor,
      period,
      kind,
      opening,
      emoji,
      target,
      funding,
      extra,
      closing,
      date,
      note,
      labelKind,
      brandKey,
      iconKey,
      newId: () => crypto.randomUUID(),
    });
  }
  const draft = comparable({
    name,
    emoji,
    description,
    kind,
    labelKind,
    method,
    group,
    period,
    amount: normalizeInteger(amount),
    opening: normalizeInteger(opening),
    target: normalizeInteger(target),
    funding: normalizeInteger(funding),
    extra: normalizeInteger(extra),
    closing: normalizeInteger(closing),
    date,
    note,
    brandKey,
    iconKey,
  });
  const [initialDraft] = useState(draft);
  const editing =
    ["configure", "month", "emoji"].includes(editor.mode) ||
    (editor.mode === "spend" && !!spend) ||
    (editor.mode === "label" && !!label);
  const unchanged = editing && draft === initialDraft;
  async function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (unchanged || (moneyForm && hidden)) return;
    const formElement = event.currentTarget;
    const invalid = nativeErrors(formElement, locale);
    setFieldErrors(invalid);
    if (Object.keys(invalid).length) {
      toast("error", tr("Kiểm tra các ô được đánh dấu."));
      focusFirstInvalid(
        formElement,
        formElement.querySelector<HTMLElement>(".form-error-summary"),
      );
      return;
    }
    setBusy(true);
    setError("");
    setConflict(false);
    try {
      const next = {
        id: crypto.randomUUID(),
        expectedVersion: version,
        action: expenseActionSchema.parse(makeAction()),
      };
      const result = await apiJSON<CommandResult>("/preview", {
        method: "POST",
        headers: generationHeaders(generation),
        body: JSON.stringify(next),
      });
      command.current = next;
      setPreview(result);
    } catch (e) {
      reportError(e);
    } finally {
      setBusy(false);
    }
  }
  function reportError(e: unknown) {
    if (e instanceof ZodError) setFieldErrors(fieldErrorsFromIssues(e.issues));
    else if (e instanceof RequestError && e.fieldErrors)
      setFieldErrors(e.fieldErrors);
    setError(
      e instanceof ZodError
        ? tr("Kiểm tra các trường được đánh dấu.")
        : e instanceof Error
          ? e.message
          : tr("Không thể lưu. Vui lòng thử lại."),
    );
    setConflict(e instanceof RequestError && e.code === "VERSION_CONFLICT");
    toast(
      "error",
      e instanceof Error ? e.message : tr("Chưa hoàn tất. Hãy thử lại."),
    );
    focusFirstInvalid(
      document.querySelector(".expense-dialog[open]:not([inert]) .dialog-body"),
      errorRef.current,
    );
  }
  async function commit() {
    if (!command.current) return;
    setBusy(true);
    setError("");
    try {
      await apiJSON<CommandResult>("/commands", {
        method: "POST",
        headers: generationHeaders(generation),
        body: JSON.stringify(command.current),
      });
      toast("success", tr("Đã lưu thay đổi."));
      await onSaved();
    } catch (e) {
      const unknownWrite =
        !(e instanceof RequestError) ||
        e.status === undefined ||
        e.status === 0 ||
        e.status >= 500 ||
        e.code === "INVALID_RESPONSE";
      if (unknownWrite) {
        setUncertain(true);
        setError(
          tr(
            "Chưa xác nhận kết quả lưu. Nội dung của bạn được giữ; bấm xác nhận lại để kiểm tra.",
          ),
        );
        toast(
          "warning",
          tr("Chưa xác nhận được kết quả lưu. Bấm lưu lại để kiểm tra."),
        );
      } else reportError(e);
    } finally {
      setBusy(false);
    }
  }
  async function updateVersion() {
    setBusy(true);
    try {
      const next = await onReload();
      setVersion(next.book?.version ?? 0);
      setPreview(null);
      command.current = null;
      setConflict(false);
      setError("");
    } catch (e) {
      reportError(e);
    } finally {
      setBusy(false);
    }
  }
  const formId = useId();
  const changeForm = (
    event: import("react").ChangeEvent<HTMLFormElement, Element>,
  ) => {
    const target = event.target as unknown as HTMLInputElement;
    const key = target.name || target.id.replace("expense-field-", "");
    setFieldErrors((previous) => {
      const next = { ...previous };
      delete next[key];
      return next;
    });
    setPreview(null);
    command.current = null;
  };
  const classificationSaved = async () => {
    let next: ExpenseView;
    try {
      next = await onReload();
    } catch {
      toast("warning", tr("Đã lưu phân loại nhưng chưa tải lại được dữ liệu."));
      setClassifying(false);
      return;
    }
    const added = next.book?.labels.find(
      (item) =>
        !selectionView.book?.labels.some((previous) => previous.id === item.id),
    );
    setSelectionView(next);
    setVersion(next.book?.version ?? version);
    setClassifying(false);
    setPreview(null);
    command.current = null;
    if (added?.kind === "method") setMethod(added.name);
    if (added?.kind === "group") setGroup(added.name);
  };
  const changeEmoji = (value: JarEmoji | null) => {
    setEmoji(value);
    setPreview(null);
    command.current = null;
  };
  return {
    localizedTitles,
    editor,
    onClose,
    busy,
    uncertain,
    preview,
    formId,
    tr,
    conflict,
    unchanged,
    moneyForm,
    hidden,
    commit,
    fieldErrors,
    prepare,
    setFieldErrors,
    setPreview,
    row,
    locale,
    period,
    jar,
    view,
    setPeriod,
    emoji,
    setEmoji,
    name,
    kind,
    setName,
    description,
    setDescription,
    setKind,
    method,
    setMethod,
    selectionView,
    group,
    setGroup,
    setClassifying,
    amount,
    setAmount,
    opening,
    setOpening,
    money,
    rule,
    target,
    setTarget,
    future,
    funding,
    setFunding,
    extra,
    setExtra,
    closing,
    setClosing,
    date,
    setDate,
    note,
    setNote,
    label,
    labelKind,
    setLabelKind,
    brandKey,
    setBrandKey,
    setIconKey,
    iconKey,
    localize,
    errorRef,
    error,
    updateVersion,
    classifying,
    month,
    onReload,
    toast,
    setSelectionView,
    setVersion,
    version,
    changeForm,
    classificationSaved,
    changeEmoji,
  };
}
