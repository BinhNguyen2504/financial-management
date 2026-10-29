"use client";
import { generationOf } from "@/lib/data-generation";
import { buildSavingsAction } from "./editor-action";

import { useI18n } from "@/i18n/provider";
import type { CommandResult } from "@/application/savings";

import { focusFirstInvalid } from "@/components/form-feedback";

import { useMoney, useMoneyHidden } from "@/components/privacy";
import { useToast } from "@/components/toast";
import {
  nextMonth,
  quantity,
  quantityText,
  replay,
  ruleAt,
} from "@/domain/savings/engine";
import {
  actionSchema,
  type SavingsAction,
  type SavingsCommand,
  type SavingsTransaction,
} from "@/domain/savings/schema";
import type { SavingsCategory, SavingsView } from "@/domain/savings/types";

import { fieldErrorsFromIssues } from "@/lib/field-errors";
import { comparable, normalizedMoneyFields } from "@/lib/form-values";

import { useId, useRef, useState, type FormEvent } from "react";
import { ZodError } from "zod";
import { SavingsAPIError, savingsJSON } from "./api";
import {
  transactionNames,
  kindNames,
  type EditorMode,
  titles,
} from "./editor-config";
export function useSavingsEditor({
  mode,
  view,
  month,
  onClose,
  onSaved,
  onReload,
}: {
  mode: EditorMode;
  view: SavingsView;
  month: string;
  onClose(): void;
  onSaved(): Promise<void>;
  onReload(): Promise<unknown>;
}) {
  const generation = useRef(generationOf(view)).current;
  const { t: tr, locale, config: localize } = useI18n("savings");
  const localizedTitles = localize(titles);
  const localizedKindNames = localize(kindNames);
  const localizedTransactionNames = localize(transactionNames);
  const toast = useToast();
  const hidden = useMoneyHidden(),
    money = useMoney(),
    old = "transaction" in mode ? mode.transaction : undefined;
  const category = "category" in mode ? mode.category : undefined;
  const rule = category
    ? (ruleAt(category, month) ?? category.rules[0])
    : undefined;
  const first =
    view.book?.categories.find(
      (c) => c.kind === (mode.type === "price" ? "gold" : "cash"),
    ) ?? view.book?.categories[0];
  const [f, setF] = useState<Record<string, string>>(() => ({
    name: rule?.name ?? "",
    description: rule?.description ?? "",
    emoji: rule?.emoji ?? "🌱",
    month: mode.type === "archive" ? nextMonth(month) : month,
    kind: category?.kind ?? "cash",
    unit: category?.unit ?? "",
    transactionKind:
      old?.kind ??
      (mode.type === "transaction" ? mode.kind : undefined) ??
      (first?.kind === "gold"
        ? "buyGold"
        : first?.kind === "deposit"
          ? "openDeposit"
          : "deposit"),
    categoryId:
      old?.categoryId ??
      (mode.type === "transaction" ? mode.categoryId : undefined) ??
      (mode.type === "price" ? mode.categoryId : undefined) ??
      first?.id ??
      "",
    date:
      old?.date ??
      (month === view.today.slice(0, 7) ? view.today : `${month}-01`),
    amount: "",
    quantity: "",
    unitPrice: "",
    fee: "0",
    tax: "0",
    interest: "0",
    reinvestInterest: "0",
    cashCategoryId: "",
    contractId: "",
    maturity: view.today,
    term: "",
    note: "",
    reason: "",
    capitalize: "true",
    acceptStalePrices: "false",
    ...Object.fromEntries(
      Object.entries(old ?? {}).filter(([, v]) => typeof v === "string"),
    ),
    ...(old?.kind === "interest" ? { capitalize: String(old.capitalize) } : {}),
  }));
  const [allocations, setAllocations] = useState<Record<string, string>>(
    old?.kind === "sellGold"
      ? Object.fromEntries(old.allocations.map((a) => [a.lotId, a.quantity]))
      : {},
  );
  const transactionId = useRef(old?.id ?? crypto.randomUUID()),
    entityId = useRef(crypto.randomUUID());
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [fieldErrors, setFieldErrors] = useState<Record<string, string>>({}),
    [conflict, setConflict] = useState(false),
    [uncertain, setUncertain] = useState(false);
  const [preview, setPreview] = useState<{
    command: SavingsCommand;
    result: CommandResult;
  } | null>(null);
  const pending = useRef<SavingsCommand | null>(null),
    errorRef = useRef<HTMLDivElement>(null);
  const draft = comparable({
    ...normalizedMoneyFields(f),
    reason: undefined,
    allocations,
  });
  const [originalDraft] = useState(draft);
  const unchanged =
    (mode.type === "configure" || (mode.type === "transaction" && !!old)) &&
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
  const categories = view.book?.categories ?? [];
  const names = (c: SavingsCategory) =>
    (ruleAt(c, f.date.slice(0, 7)) ?? c.rules[0]).name;
  const txKind = f.transactionKind as SavingsTransaction["kind"];
  let inventory = view.state;
  if (view.book) {
    try {
      inventory = replay(
        {
          ...view.book,
          revisions: old
            ? view.book.revisions.filter((r) => r.rootId !== old.id)
            : view.book.revisions,
        },
        f.date <= view.today ? f.date : view.today,
      );
    } catch {
      /* Preview validates dependent transactions; keep the draft editable. */
    }
  }
  const [saleQuantity, setSaleQuantity] = useState("");
  const saleLots = inventory.lots
    .filter((l) => l.categoryId === f.categoryId)
    .sort((a, b) => a.date.localeCompare(b.date));
  function suggestLots() {
    try {
      let remaining = quantity(saleQuantity);
      if (remaining <= 0n)
        throw new Error(tr("Nhập lượng muốn bán lớn hơn 0."));
      const next: Record<string, string> = {};
      for (const lot of saleLots) {
        const q = quantity(lot.quantity),
          part = q < remaining ? q : remaining;
        if (part > 0n) {
          next[lot.id] = quantityText(part);
          remaining -= part;
        }
      }
      if (remaining > 0n)
        throw new Error(tr("Lượng muốn bán vượt lượng vàng còn giữ."));
      setAllocations(next);
      setPreview(null);
      setError("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : tr("Kiểm tra số lượng muốn bán."),
      );
    }
  }
  const txAsset = txKind.includes("Gold")
    ? "gold"
    : [
          "openingDeposit",
          "openDeposit",
          "withdrawDeposit",
          "interest",
          "rollover",
        ].includes(txKind)
      ? "deposit"
      : "cash";
  const selectedCategory = categories.find((c) => c.id === f.categoryId);
  const hasWallet = [
    "transfer",
    "openDeposit",
    "withdrawDeposit",
    "interest",
    "rollover",
    "buyGold",
    "sellGold",
  ].includes(txKind);
  const hasAmount = [
    "openingCash",
    "openingDeposit",
    "openingGold",
    "deposit",
    "withdraw",
    "transfer",
    "openDeposit",
    "withdrawDeposit",
    "interest",
    "fee",
  ].includes(txKind);
  const hasCharges = [
    "withdraw",
    "transfer",
    "withdrawDeposit",
    "rollover",
    "buyGold",
    "sellGold",
  ].includes(txKind);
  const hasContract = ["withdrawDeposit", "interest", "rollover"].includes(
    txKind,
  );
  const opensContract = ["openingDeposit", "openDeposit", "rollover"].includes(
    txKind,
  );

  function action(): SavingsAction {
    return buildSavingsAction({
      transactionId: transactionId.current,
      fields: f,
      txKind,
      allocations,
      mode,
      entityId: entityId.current,
      old,
    });
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (unchanged) return;
    setBusy(true);
    setError("");
    let writing = false;
    try {
      const a = actionSchema.parse(action());
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
          result: await savingsJSON<CommandResult>(
            "/preview",
            command,
            generation,
          ),
        });
      else {
        writing = true;
        await savingsJSON("/commands", command, generation);
        toast("success", tr("Đã lưu thay đổi."));
        await onSaved();
      }
    } catch (e) {
      const unknownWrite =
        writing &&
        (!(e instanceof SavingsAPIError) ||
          ![400, 401, 403, 409, 415, 422].includes(e.status));
      if (unknownWrite) setUncertain(true);
      if (e instanceof ZodError)
        setFieldErrors(fieldErrorsFromIssues(e.issues));
      else if (e instanceof SavingsAPIError && e.fieldErrors)
        setFieldErrors(e.fieldErrors);
      setError(
        e instanceof ZodError
          ? tr("Kiểm tra các trường được đánh dấu.")
          : e instanceof Error
            ? e.message
            : tr("Không thể lưu."),
      );
      if (e instanceof SavingsAPIError && e.code === "VERSION_CONFLICT") {
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
  const sensitive = mode.type === "transaction" || mode.type === "price";
  const formId = useId();
  const reloadAfterConflict = async () => {
    setBusy(true);
    try {
      await onReload();
      pending.current = null;
      setPreview(null);
      setConflict(false);
      setError(tr("Đã tải phiên bản mới. Kiểm tra rồi xem trước lại."));
    } catch (e) {
      setError(e instanceof Error ? e.message : tr("Chưa tải được dữ liệu."));
    } finally {
      setBusy(false);
    }
  };
  return {
    fieldErrors,
    hidden,
    f,
    busy,
    set,
    view,
    tr,
    categories,
    setAllocations,
    old,
    mode,
    localizedTitles,
    onClose,
    uncertain,
    formId,
    conflict,
    unchanged,
    sensitive,
    preview,
    submit,
    error,
    errorRef,
    setBusy,
    onReload,
    setPreview,
    setConflict,
    setError,
    localizedKindNames,
    names,
    selectedCategory,
    localizedTransactionNames,
    txAsset,
    txKind,
    hasAmount,
    hasContract,
    inventory,
    opensContract,
    hasWallet,
    hasCharges,
    saleQuantity,
    setSaleQuantity,
    suggestLots,
    saleLots,
    locale,
    allocations,
    money,
    reloadAfterConflict,
  };
}
