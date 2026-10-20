"use client";

import { useEffect, useMemo } from "react";
import {
  createRefreshController,
  subscribeToForegroundRefresh,
} from "@/lib/foreground-refresh";

export function useForegroundRefresh<T>(
  load: () => Promise<T>,
  enabled: boolean,
) {
  // A new loader (e.g. another income year) gets independent timing/in-flight state.
  const controller = useMemo(() => createRefreshController(load), [load]);
  useEffect(() => {
    if (enabled) return subscribeToForegroundRefresh(controller);
  }, [controller, enabled]);
  return controller.reload;
}
