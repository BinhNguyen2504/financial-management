const FRESH_FOR_MS = 60_000;
const RETRY_AFTER_MS = 5_000;

function vietnamDay(time: number) {
  return new Date(time + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Per-mounted-view timing only. Financial data stays in the component's state. */
export function createRefreshController<T>(load: () => Promise<T>) {
  let pending = 0;
  let sequence = 0;
  let lastAttempt = -Infinity;
  let lastSuccess: number | null = null;
  let lastDay: string | null = null;

  // Explicit reads (initial load, retry, mutation, midnight) always reach the server.
  async function reload() {
    const id = ++sequence;
    const startedAt = Date.now();
    lastAttempt = startedAt;
    pending++;
    try {
      const result = await load();
      if (id === sequence) {
        lastSuccess = Date.now();
        lastDay = vietnamDay(startedAt);
      }
      return result;
    } catch (error) {
      if (id === sequence) lastSuccess = null;
      throw error;
    } finally {
      pending--;
    }
  }

  function refreshIfNeeded(reason: "return" | "online") {
    const now = Date.now();
    if (pending || now - lastAttempt < RETRY_AFTER_MS) return;
    if (
      reason !== "online" &&
      lastSuccess !== null &&
      now - lastSuccess < FRESH_FOR_MS &&
      lastDay === vietnamDay(now)
    )
      return;
    return reload();
  }

  return { reload, refreshIfNeeded };
}

export function subscribeToForegroundRefresh(
  controller: Pick<
    ReturnType<typeof createRefreshController>,
    "refreshIfNeeded"
  >,
) {
  let reconnected = false;
  const foreground = (event: Event) => {
    if (event.type === "online") reconnected = true;
    if (document.visibilityState !== "visible" || !navigator.onLine) return;
    const reason = reconnected ? "online" : "return";
    reconnected = false;
    // The owning workspace displays errors and retains its last usable view.
    void controller.refreshIfNeeded(reason)?.catch(() => {});
  };
  window.addEventListener("focus", foreground);
  window.addEventListener("online", foreground);
  document.addEventListener("visibilitychange", foreground);
  return () => {
    window.removeEventListener("focus", foreground);
    window.removeEventListener("online", foreground);
    document.removeEventListener("visibilitychange", foreground);
  };
}
