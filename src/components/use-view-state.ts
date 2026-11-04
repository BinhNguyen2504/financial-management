"use client";

import {
  useCallback,
  useMemo,
  useSyncExternalStore,
  type SetStateAction,
} from "react";
import { useUser } from "@/features/profile/user-provider";
import { SessionViewStore, validViewValue } from "@/lib/view-state";

const store = new SessionViewStore(() => sessionStorage);
const listeners = new Set<() => void>();
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useViewState<T>(
  module: string,
  field: string,
  initial: T,
  validate?: (value: unknown) => boolean,
): [T, (next: SetStateAction<T>) => void] {
  const { user } = useUser();
  const encoded = JSON.stringify(initial);
  const fallback = useMemo(() => JSON.parse(encoded) as T, [encoded]);
  const key = user ? `fm-view:${user.id}:${module}:${field}` : null;
  const read = useCallback(
    () =>
      key
        ? store.read(
            key,
            fallback,
            validate ?? ((v) => validViewValue(v, fallback)),
          )
        : fallback,
    [key, fallback, validate],
  );
  const value = useSyncExternalStore(subscribe, read, () => fallback);
  const set = useCallback(
    (next: SetStateAction<T>) => {
      if (!key) return;
      store.write(
        key,
        typeof next === "function"
          ? (next as (previous: T) => T)(read())
          : next,
      );
      listeners.forEach((listener) => listener());
    },
    [key, read],
  );
  return [value, set];
}
