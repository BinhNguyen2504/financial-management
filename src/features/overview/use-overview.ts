"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  defaultLayout,
  type SavedLayout,
  type OverviewLayout,
} from "@/domain/overview/layout";
import type { OverviewSummary, SourceId } from "@/domain/overview/summary";
import { useForegroundRefresh } from "@/components/use-foreground-refresh";
import { overviewRequest, OverviewRequestError } from "./api";

export function useOverview(configured: boolean) {
  const [saved, setSaved] = useState<SavedLayout>(defaultLayout);
  const [customizing, setCustomizing] = useState(false);
  const [draft, setDraft] = useState<OverviewLayout | null>(null);
  const [summary, setSummary] = useState<OverviewSummary | null>(null);
  const [loading, setLoading] = useState(configured);
  const [error, setError] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  const [layoutError, setLayoutError] = useState("");
  const [layoutReady, setLayoutReady] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [saving, setSaving] = useState(false);
  const savedRef = useRef(saved),
    draftRef = useRef(draft),
    sequence = useRef(0);
  const revisionRef = useRef(0);
  const abort = useRef<AbortController | null>(null);
  function edit(next: OverviewLayout | null) {
    draftRef.current = next;
    setDraft(next);
  }
  const reload = useForegroundRefresh(
    useCallback(async () => {
      const id = ++sequence.current;
      abort.current?.abort();
      const controller = new AbortController();
      abort.current = controller;
      setLoading(true);
      try {
        let layout: OverviewLayout = draftRef.current ?? savedRef.current;
        if (!draftRef.current) {
          try {
            const next = await overviewRequest<SavedLayout>("/layout", {
              signal: controller.signal,
            });
            if (id !== sequence.current) return;
            // Editing can start while the account layout is refreshing.
            if (!draftRef.current) {
              savedRef.current = next;
              setSaved(next);
              layout = next;
            } else layout = draftRef.current;
            setLayoutReady(true);
            setLayoutError("");
          } catch (e) {
            if (id !== sequence.current) return;
            if (e instanceof OverviewRequestError && e.status === 401) throw e;
            setLayoutError(
              e instanceof Error
                ? e.message
                : "Chưa tải được bố cục. Hãy thử lại.",
            );
            setLayoutReady(false);
          }
        }
        const widgets = [
          ...new Set([
            ...layout.widgets,
            ...(draftRef.current ? ["jars"] : []),
          ]),
        ];
        const next = await overviewRequest<OverviewSummary>(
          `?widgets=${widgets.join(",")}`,
          { signal: controller.signal },
        );
        if (id !== sequence.current) return;
        setSummary(next);
        setError("");
        setNeedsLogin(false);
      } catch (e) {
        if (id !== sequence.current) return;
        const expired = e instanceof OverviewRequestError && e.status === 401;
        setNeedsLogin(expired);
        if (expired) setSummary(null);
        setError(
          e instanceof Error
            ? e.message
            : "Chưa tải được Tổng quan. Hãy thử lại.",
        );
        throw e;
      } finally {
        if (id === sequence.current) setLoading(false);
      }
    }, []),
    configured,
  );
  const layout = draft ?? saved;
  // Order/selected jars only change presentation; new widget sources trigger loading.
  const requestKey = [
    ...new Set([...layout.widgets, ...(draft ? ["jars"] : [])]),
  ]
    .sort()
    .join(",");
  useEffect(() => {
    if (configured) void reload().catch(() => {});
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps -- Invalidate requests started after effect setup as well.
      sequence.current++;
      abort.current?.abort();
    };
  }, [configured, reload, requestKey]);
  useEffect(() => {
    if (!summary) return;
    const timeout = Math.max(
      1000,
      Math.min(
        86400000,
        Date.parse(`${summary.today}T00:00:00+07:00`) +
          86400000 -
          Date.now() +
          100,
      ),
    );
    const timer = setTimeout(() => void reload().catch(() => {}), timeout);
    return () => clearTimeout(timer);
  }, [summary, reload]);
  function open() {
    setCustomizing(true);
    if (draftRef.current) return;
    revisionRef.current = savedRef.current.revision;
    setSaveError("");
    setConflict(false);
    edit({
      ...savedRef.current,
      widgets: [...savedRef.current.widgets],
      jarIds: [...savedRef.current.jarIds],
    });
  }
  async function save() {
    if (!draftRef.current) return;
    setSaving(true);
    setSaveError("");
    try {
      const { schemaVersion, widgets, jarIds } = draftRef.current;
      const next = await overviewRequest<SavedLayout>("/layout", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schemaVersion,
          widgets,
          jarIds,
          expectedRevision: revisionRef.current,
        }),
      });
      savedRef.current = next;
      setSaved(next);
      edit(null);
      setCustomizing(false);
      setConflict(false);
    } catch (e) {
      setConflict(
        e instanceof OverviewRequestError && e.code === "LAYOUT_CONFLICT",
      );
      setSaveError(
        e instanceof Error ? e.message : "Chưa lưu được bố cục. Hãy thử lại.",
      );
    } finally {
      setSaving(false);
    }
  }
  async function loadLatest() {
    setSaving(true);
    try {
      const next = await overviewRequest<SavedLayout>("/layout");
      savedRef.current = next;
      setSaved(next);
      revisionRef.current = next.revision;
      edit(next);
      setSaveError("");
      setConflict(false);
    } catch (e) {
      setSaveError(
        e instanceof Error ? e.message : "Chưa tải được bố cục. Hãy thử lại.",
      );
    } finally {
      setSaving(false);
    }
  }
  const [retained, setRetained] = useState<OverviewSummary["sources"]>({});
  // Preserve values only within this account-mounted workspace; failed sources stay labelled.
  useEffect(() => {
    if (!summary) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Retain successful source snapshots for a failed background refresh.
    setRetained((previous) => ({
      ...previous,
      ...Object.fromEntries(
        Object.entries(summary.sources).filter(
          ([, v]) => v?.status === "ready",
        ),
      ),
    }));
  }, [summary]);
  const staleSources = new Set<SourceId>();
  const sources = { ...summary?.sources };
  for (const key of Object.keys(sources) as SourceId[]) {
    if (sources[key]?.status === "error" && retained[key]?.status === "ready") {
      staleSources.add(key);
      Object.assign(sources, { [key]: retained[key] });
    }
  }
  return {
    customizing,
    setCustomizing,
    layout,
    draft,
    edit,
    open,
    save,
    loadLatest,
    summary,
    sources,
    staleSources,
    loading,
    error,
    needsLogin,
    layoutError,
    layoutReady,
    saveError,
    conflict,
    saving,
    reload,
  };
}
