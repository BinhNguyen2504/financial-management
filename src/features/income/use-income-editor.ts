"use client";
import { buildIncomeAction } from "./editor-action";

import { useI18n } from "@/i18n/provider";
import type { CommandResult } from "@/application/income";

import { focusFirstInvalid } from "@/components/form-feedback";

import { useMoney, useMoneyHidden } from "@/components/privacy";
import { useToast } from "@/components/toast";
import { ruleAt } from "@/domain/income/engine";
import {
  incomeActionSchema,
  type IncomeAction,
  type IncomeCommand,
} from "@/domain/income/schema";

import { fieldErrorsFromIssues } from "@/lib/field-errors";
import { normalizeInteger } from "@/lib/form-values";

import { useId, useRef, useState, type FormEvent } from "react";
import { ZodError } from "zod";
import { IncomeAPIError, incomeJSON } from "./api";
import { type EditorMode, titles } from "./editor-config";
export function useIncomeEditor({
  mode,
  month,
  today,
  version,
  dataGeneration = 0,
  onClose,
  onSaved,
  onReload,
}: {
  mode: EditorMode;
  month: string;
  today: string;
  version: number;
  dataGeneration?: number;
  onClose(): void;
  onSaved(): Promise<void>;
  onReload(): Promise<unknown>;
}) {
  const generation = useRef(dataGeneration).current;
  const { t: tr, locale, config: localize } = useI18n("income");
  const localizedTitles = localize(titles);
  const toast = useToast();
  const money = useMoney();
  const hidden = useMoneyHidden();
  const initialRow = "row" in mode ? mode.row : undefined;
  const initialMonth =
    initialRow?.month ??
    ("category" in mode && month < mode.category.start
      ? mode.category.start
      : month);
  const config =
    "category" in mode
      ? (ruleAt(mode.category, initialMonth) ?? mode.category.rules.at(-1))
      : undefined;
  const [name, setName] = useState(initialRow?.name ?? config?.name ?? "");
  const [description, setDescription] = useState(
    initialRow?.description ?? config?.description ?? "",
  );
  const [period, setPeriod] = useState(initialMonth);
  const [amount, setAmount] = useState(initialRow?.amount ?? "");
  const [note, setNote] = useState(initialRow?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [conflict, setConflict] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [preview, setPreview] = useState<{
    result: CommandResult;
    command: IncomeCommand;
  } | null>(null);
  const pending = useRef<IncomeCommand | null>(null);
  const id = useRef(crypto.randomUUID());
  const errorRef = useRef<HTMLDivElement>(null);
  const needsPreview = mode.type === "configure" || mode.type === "stop";
  const deleting = ["clear", "deleteCategory", "deleteOneOff"].includes(
    mode.type,
  );
  const hasName = ["create", "configure", "oneoff"].includes(mode.type);
  const hasAmount = mode.type === "monthly" || mode.type === "oneoff";
  function action(): IncomeAction {
    return buildIncomeAction({
      mode,
      id: id.current,
      period,
      name,
      description,
      amount,
      note,
    });
  }
  const targetRule =
    "category" in mode ? ruleAt(mode.category, period) : undefined;
  const unchanged =
    mode.type === "configure"
      ? !!targetRule &&
        name.trim() === targetRule.name &&
        description.trim() === targetRule.description
      : mode.type === "monthly" && initialRow?.amount !== null
        ? normalizeInteger(amount) === initialRow?.amount &&
          note.trim() === (initialRow?.note ?? "")
        : mode.type === "oneoff" && !!initialRow
          ? name.trim() === initialRow.name &&
            description.trim() === initialRow.description &&
            period === initialRow.month &&
            normalizeInteger(amount) === initialRow.amount
          : mode.type === "stop"
            ? !targetRule?.active
            : false;
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (unchanged || (hasAmount && hidden)) return;
    setBusy(true);
    setError("");
    setFieldErrors({});
    let writing = false;
    try {
      const parsed = incomeActionSchema.parse(action());
      const previous = pending.current;
      const command =
        previous && JSON.stringify(previous.action) === JSON.stringify(parsed)
          ? previous
          : {
              id: crypto.randomUUID(),
              expectedVersion: version,
              action: parsed,
            };
      pending.current = command;
      if (needsPreview && (!preview || preview.command.id !== command.id)) {
        setPreview({
          result: await incomeJSON<CommandResult>(
            "/preview",
            command,
            generation,
          ),
          command,
        });
      } else {
        writing = true;
        await incomeJSON("/commands", command, generation);
        toast("success", tr("Đã lưu thay đổi."));
        await onSaved();
      }
    } catch (e) {
      const unknownWrite =
        writing &&
        (!(e instanceof IncomeAPIError) ||
          ![400, 401, 403, 409, 415, 422].includes(e.status));
      if (unknownWrite) setUncertain(true);
      if (e instanceof ZodError) {
        setFieldErrors(fieldErrorsFromIssues(e.issues));
        setError(tr("Kiểm tra các trường được đánh dấu bên dưới."));
      } else if (e instanceof IncomeAPIError && e.fieldErrors) {
        setFieldErrors(e.fieldErrors);
        setError(tr("Kiểm tra các trường được đánh dấu bên dưới."));
      } else
        setError(
          e instanceof Error
            ? e.message
            : tr("Không thể lưu. Kiểm tra kết nối và thử lại."),
        );
      if (e instanceof IncomeAPIError && e.code === "VERSION_CONFLICT") {
        setConflict(true);
        setPreview(null);
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
  function changed(event: React.FormEvent<HTMLFormElement>) {
    setPreview(null);
    setError("");
    const target = event.target as HTMLInputElement;
    const key = target.id?.replace("income-field-", "");
    setFieldErrors((previous) => {
      const next = { ...previous };
      delete next[key];
      return next;
    });
  }
  const formId = useId();
  const reloadAfterConflict = async () => {
    setBusy(true);
    try {
      await onReload();
      setConflict(false);
      setPreview(null);
      pending.current = null;
      setError(tr("Đã tải dữ liệu mới. Kiểm tra nội dung trước khi lưu lại."));
    } catch {
      setError(tr("Chưa tải lại được dữ liệu. Hãy thử lại."));
    } finally {
      setBusy(false);
    }
  };
  return {
    fieldErrors,
    tr,
    localizedTitles,
    mode,
    onClose,
    busy,
    uncertain,
    deleting,
    formId,
    conflict,
    unchanged,
    hasAmount,
    hidden,
    needsPreview,
    preview,
    submit,
    changed,
    error,
    errorRef,
    setBusy,
    onReload,
    setConflict,
    setPreview,
    setError,
    initialRow,
    locale,
    config,
    money,
    hasName,
    name,
    setName,
    description,
    setDescription,
    today,
    period,
    setPeriod,
    amount,
    setAmount,
    note,
    setNote,
    reloadAfterConflict,
  };
}
