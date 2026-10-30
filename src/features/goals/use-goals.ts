"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/features/profile/user-provider";
import { useForegroundRefresh } from "@/components/use-foreground-refresh";
import { userFacingError } from "@/i18n/user-facing-errors";
import type { GoalView } from "@/domain/goals/engine";
import { GoalAPIError, goalsJSON } from "./api";

export function useGoals() {
  const { user } = useUser(),
    router = useRouter();
  const [view, setView] = useState<GoalView | null>(null),
    [error, setError] = useState("");
  const session = useRef(user?.id),
    ticket = useRef(0);
  const authLost = useCallback(() => {
    ticket.current++;
    setView(null);
    router.replace("/login?next=%2Fgoals");
  }, [router]);
  const load = useCallback(async () => {
    const sequence = ++ticket.current,
      owner = user?.id;
    try {
      const next = await goalsJSON<GoalView>();
      if (sequence === ticket.current && owner === session.current) {
        setView(next);
        setError("");
      }
      return next;
    } catch (e) {
      if (sequence === ticket.current && owner === session.current) {
        if (e instanceof GoalAPIError && e.status === 401) authLost();
        else
          setError(
            userFacingError(
              e instanceof Error ? e.message : "Không thể tải dữ liệu.",
              e instanceof GoalAPIError ? e.code : undefined,
            ),
          );
      }
      throw e;
    }
  }, [user?.id, authLost]);
  const reload = useForegroundRefresh(load, Boolean(user));
  useEffect(() => {
    session.current = user?.id;
    ticket.current++;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Clear account-owned data on an identity change.
    setView(null);
    if (user) void reload().catch(() => {});
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps -- Invalidate requests that may have started after mounting.
      ticket.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Account identity owns the workspace; metadata refreshes retain its drafts.
  }, [user?.id, reload]);
  return { view, error, reload, authLost, owner: user?.id };
}
