"use client";
import { useI18n } from "@/i18n/provider";

import { useMoney } from "@/components/privacy";

import { useToast } from "@/components/toast";
import { useForegroundRefresh } from "@/components/use-foreground-refresh";
import type { FundId } from "@/domain/funds/schema";
import type { FundView } from "@/domain/funds/types";

import { useUser } from "@/features/profile/user-provider";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { FundAPIError, fundsJSON } from "./api";

import { type EditorMode } from "./editor-config";

export function useFundsWorkspace() {
  const { t: tr } = useI18n("funds");
  const toast = useToast();
  const { user } = useUser(),
    router = useRouter(),
    money = useMoney();
  const [view, setView] = useState<FundView | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [detail, setDetail] = useState<FundId | "locations" | null>(null),
    [editor, setEditor] = useState<EditorMode | null>(null),
    [celebration, setCelebration] = useState(0);
  const request = useRef(0),
    displayed = useRef(false),
    session = useRef(user?.id);
  const authLost = useCallback(() => {
    request.current++;
    setView(null);
    displayed.current = false;
    setEditor(null);
    setDetail(null);
    router.replace("/login?next=%2Ffunds");
  }, [router]);
  const load = useCallback(async () => {
    const ticket = ++request.current,
      owner = user?.id;
    if (!displayed.current) setLoading(true);
    try {
      const next = await fundsJSON<FundView>();
      if (ticket === request.current && session.current === owner) {
        setView(next);
        displayed.current = true;
        setError("");
      }
      return next;
    } catch (e) {
      if (ticket === request.current && session.current === owner) {
        if (e instanceof FundAPIError && e.status === 401) authLost();
        else
          setError(
            e instanceof Error ? e.message : tr("Không thể tải dữ liệu."),
          );
      }
      throw e;
    } finally {
      if (ticket === request.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Locale changes must not recreate the request controller or trigger a data reload.
  }, [user?.id, authLost]);
  const reload = useForegroundRefresh(load, Boolean(user));
  useEffect(() => {
    session.current = user?.id;
    request.current++;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Clear account-owned data before reloading for the next authenticated owner.
    setView(null);
    displayed.current = false;
    setEditor(null);
    setDetail(null);
    if (user) void reload().catch(() => {});
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps -- Invalidate the latest request sequence on cleanup, including requests started after mount.
      request.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Key account-owned state to user identity; metadata refreshes must preserve drafts.
  }, [user?.id, reload]);
  useEffect(() => {
    if (!user) return;
    const now = Date.now(),
      day = 86400000,
      next = day - ((now + 7 * 3600000) % day);
    const timer = setTimeout(() => void reload().catch(() => {}), next + 100);
    return () => clearTimeout(timer);
  }, [user, view?.now, reload]);
  const config = view?.book?.configurations.at(-1),
    next = config?.priority.find(
      (id) => BigInt(view!.state.funds.find((f) => f.id === id)!.missing) > 0n,
    );
  const saved = () => {
    setEditor(null);
    void reload()
      .then(() => setCelebration((n) => n + 1))
      .catch(() =>
        toast(
          "warning",
          tr("Đã lưu thay đổi nhưng chưa tải lại được dữ liệu."),
        ),
      );
  };
  return {
    tr,
    view,
    setDetail,
    setEditor,
    loading,
    error,
    reload,
    config,
    money,
    next,
    celebration,
    detail,
    editor,
    saved,
    authLost,
  };
}
