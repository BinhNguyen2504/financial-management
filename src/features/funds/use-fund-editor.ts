"use client";
import { generationOf } from "@/lib/data-generation";
import { buildFundAction } from "./editor-action";
import { focusInvalidNumber } from "@/components/localized-input";

import { useI18n } from "@/i18n/provider";
import type { FundCommandResult } from "@/application/funds";
import { focusFirstInvalid } from "@/components/form-feedback";

import { useMoney, useMoneyHidden } from "@/components/privacy";
import { useToast } from "@/components/toast";
import { useVisualTheme } from "@/components/ui-preferences";
import { visualThemes } from "@/components/visual-theme";
import { selectLiving } from "@/domain/funds/engine";
import {
  fundIds,
  multipliersSchema,
  type FundAction,
  type FundCommand,
  type FundId,
} from "@/domain/funds/schema";

import { fieldErrorsFromIssues } from "@/lib/field-errors";
import { comparable, normalizeInteger } from "@/lib/form-values";

import { useId, useRef, useState } from "react";
import { z } from "zod";
import { FundAPIError, fundsJSON } from "./api";
import { fundNames, localDateTime } from "./content";
import { type Props } from "./editor-config";
export function useFundEditor({
  mode,
  view: initial,
  refresh,
  onSaved,
  onClose,
  onAuthLost,
}: Props) {
  const { t: tr, locale, config: localize } = useI18n("funds");
  const toast = useToast();
  const generation = useRef(generationOf(initial)).current;
  const [view, setView] = useState(initial),
    config = initial.book?.configurations.at(-1),
    old = "transaction" in mode ? mode.transaction : null;
  const location =
    mode.type === "location"
      ? initial.book?.locations.find((l) => l.id === mode.id)
      : null;
  const entity = useRef(old?.id ?? location?.id ?? crypto.randomUUID()),
    hidden = useMoneyHidden(),
    money = useMoney(),
    id = useId();
  const [f, setF] = useState({
    name: location?.name ?? "",
    active: location?.active ?? true,
    kind:
      old?.kind ??
      (mode.type === "transaction" ? mode.kind : undefined) ??
      "deposit",
    fundId:
      old?.fundId ??
      (mode.type === "transaction" ? mode.fundId : undefined) ??
      "emergency",
    locationId:
      old?.locationId ??
      initial.book?.locations.find((l) => l.active)?.id ??
      "",
    toFundId: old?.kind === "transfer" ? old.toFundId : "rainy_day",
    toLocationId:
      old?.kind === "transfer"
        ? old.toLocationId
        : (initial.book?.locations.find((l) => l.active)?.id ?? ""),
    amount: old?.amount ?? "",
    occurredAt: localDateTime(old?.occurredAt ?? initial.now),
    note: old?.note ?? "",
    reason: "",
  });
  const [jarIds, setJarIds] = useState(
      config?.living.items.map((i) => i.jarId) ?? [],
    ),
    [multipliers, setMultipliers] = useState(
      config?.multipliers ?? { emergency: "", rainy_day: "", sinking: "" },
    ),
    [priority, setPriority] = useState<FundId[]>(
      config?.priority ?? [...fundIds],
    ),
    [applyLiving, setApplyLiving] = useState(!config || initial.sourceChanged),
    [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [fieldErrors, setFieldErrors] = useState<Record<string, string>>({}),
    [conflict, setConflict] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [preview, setPreview] = useState<{
      command: FundCommand;
      result: FundCommandResult;
    } | null>(null);
  const pending = useRef<FundCommand | null>(null),
    errorRef = useRef<HTMLDivElement>(null);
  const draft = comparable({
    ...f,
    amount: normalizeInteger(f.amount),
    reason: undefined,
    jarIds: [...jarIds].sort(),
    multipliers,
    priority,
    applyLiving,
  });
  const [originalDraft] = useState(draft);
  const unchanged =
    ((mode.type === "location" && !!location) ||
      mode.type === "revise" ||
      (mode.type === "configure" && !!config && !initial.sourceChanged)) &&
    draft === originalDraft;
  const theme = useVisualTheme();
  const title =
    mode.type === "configure"
      ? config
        ? tr("Điều chỉnh Quỹ an toàn")
        : localize(visualThemes)[theme].copy.configureFunds
      : mode.type === "location"
        ? location
          ? tr("Sửa nơi giữ tiền")
          : tr("Thêm nơi giữ tiền")
        : mode.type === "cancel"
          ? tr("Hủy giao dịch")
          : mode.type === "revise"
            ? tr("Sửa giao dịch")
            : tr("Ghi giao dịch");
  function invalidate() {
    setPreview(null);
    pending.current = null;
    setError("");
    setFieldErrors({});
    setConflict(false);
  }
  function set<K extends keyof typeof f>(key: K, value: (typeof f)[K]) {
    setF((s) => ({ ...s, [key]: value }));
    invalidate();
  }
  function report(e: unknown) {
    if (e instanceof z.ZodError) {
      setFieldErrors(fieldErrorsFromIssues(e.issues, true));
      setError(tr("Kiểm tra các trường được đánh dấu."));
    } else if (e instanceof FundAPIError && e.fieldErrors) {
      setFieldErrors(e.fieldErrors);
      setError(tr("Kiểm tra các trường được đánh dấu."));
    } else
      setError(
        e instanceof Error ? e.message : tr("Chưa hoàn tất. Hãy thử lại."),
      );
    focusFirstInvalid(
      document.querySelector(".expense-dialog[open]:not([inert]) .dialog-body"),
      errorRef.current,
    );
    toast(
      "error",
      e instanceof Error ? e.message : tr("Chưa hoàn tất. Hãy thử lại."),
    );
  }
  function action(): FundAction {
    return buildFundAction({
      mode,
      entity: entity.current,
      jarIds,
      multipliers,
      priority,
      applyLiving,
      view,
      fields: f,
      tr,
      old,
    });
  }
  async function submit() {
    if (focusInvalidNumber(document.getElementById(`${id}-fields`))) return;
    if (hidden) return;
    setBusy(true);
    setError("");
    let writing = false;
    try {
      const command = pending.current ?? {
        id: crypto.randomUUID(),
        expectedVersion: view.book?.version ?? 0,
        action: action(),
      };
      pending.current = command;
      if (!preview)
        setPreview({
          command,
          result: await fundsJSON<FundCommandResult>(
            "/preview",
            command,
            generation,
          ),
        });
      else {
        writing = true;
        await fundsJSON("/commands", command, generation);
        toast("success", tr("Đã lưu thay đổi."));
        onSaved();
      }
    } catch (e) {
      if (e instanceof FundAPIError && e.status === 401) {
        onAuthLost();
        return;
      }
      const unknownWrite =
        writing &&
        (!(e instanceof FundAPIError) ||
          ![400, 401, 403, 409, 415, 422].includes(e.status));
      if (unknownWrite)
        toast(
          "warning",
          tr("Chưa xác nhận được kết quả lưu. Bấm lưu lại để kiểm tra."),
        );
      else report(e);
      setConflict(
        e instanceof FundAPIError &&
          ["VERSION_CONFLICT", "EXPENSE_VERSION_CONFLICT"].includes(e.code),
      );
      if (unknownWrite) setUncertain(true);
    } finally {
      setBusy(false);
    }
  }
  function next() {
    if (focusInvalidNumber(document.getElementById(`${id}-fields`))) return;
    try {
      if (step === 0) {
        if (applyLiving || !config) selectLiving(view.source, jarIds);
        else if (!jarIds.length) throw new Error(tr("Chọn hũ sinh hoạt."));
      }
      if (step === 1)
        z.object({ multipliers: multipliersSchema }).parse({ multipliers });
      setStep((s) => s + 1);
      setError("");
      setFieldErrors({});
    } catch (e) {
      report(e);
    }
  }
  const fieldId = (key: string) => `${id}-${key.replaceAll(".", "-")}`;
  let livingTotal = config?.living.total ?? "0";
  if (applyLiving) {
    try {
      livingTotal = selectLiving(view.source, jarIds).total;
    } catch {
      livingTotal = "0";
    }
  }
  const options = [
    ...view.source.items,
    ...(config?.living.items.filter(
      (i) => !view.source.items.some((j) => j.jarId === i.jarId),
    ) ?? []),
  ];
  const changedFundRows = preview
    ? preview.result.after.funds.flatMap((after) => {
        const before = preview.result.before.funds.find(
          (item) => item.id === after.id,
        );
        if (!before) return [];
        return [
          {
            label: tr("{0} · Số dư", { 0: fundNames[after.id] }),
            before: before.balance,
            after: after.balance,
          },
          {
            label: tr("{0} · Mục tiêu", { 0: fundNames[after.id] }),
            before: before.target,
            after: after.target,
          },
        ].filter((row) => row.before !== row.after);
      })
    : [];
  const changedLocationRows = preview
    ? Object.keys({
        ...preview.result.before.balances,
        ...preview.result.after.balances,
      }).flatMap((key) => {
        const before = preview.result.before.balances[key] ?? "0";
        const after = preview.result.after.balances[key] ?? "0";
        if (before === after) return [];
        const [fund, locationId] = key.split(":");
        return [
          {
            label: `${fundNames[fund as FundId]} · ${view.book?.locations.find((item) => item.id === locationId)?.name ?? tr("Nơi giữ tiền")}`,
            before,
            after,
          },
        ];
      })
    : [];
  const reloadAfterConflict = async () => {
    setBusy(true);
    try {
      setView(await refresh());
      invalidate();
    } catch (e) {
      if (e instanceof FundAPIError && e.status === 401) onAuthLost();
      else report(e);
    } finally {
      setBusy(false);
    }
  };
  return {
    fieldErrors,
    fieldId,
    f,
    tr,
    set,
    hidden,
    view,
    title,
    onClose,
    busy,
    uncertain,
    mode,
    step,
    preview,
    setStep,
    next,
    conflict,
    unchanged,
    submit,
    error,
    errorRef,
    setBusy,
    setView,
    refresh,
    invalidate,
    onAuthLost,
    report,
    id,
    config,
    applyLiving,
    setApplyLiving,
    setJarIds,
    options,
    jarIds,
    money,
    livingTotal,
    multipliers,
    setMultipliers,
    priority,
    setPriority,
    location,
    localize,
    old,
    locale,
    changedFundRows,
    changedLocationRows,
    reloadAfterConflict,
  };
}
