"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SavedLayout, OverviewLayout } from "@/domain/overview/layout";
import {
  overviewSources,
  overviewRequirements,
  type OverviewResponse,
  type OverviewSummary,
  type SourceId,
} from "@/domain/overview/summary";
import { useForegroundRefresh } from "@/components/use-foreground-refresh";
import { overviewRequest, OverviewRequestError } from "./api";

export function useOverview(configured: boolean) {
  const [saved, setSaved] = useState<SavedLayout | null>(null);
  const [customizing, setCustomizing] = useState(false);
  const [draft, setDraft] = useState<OverviewLayout | null>(null);
  const [summary, setSummary] = useState<OverviewSummary | null>(null);
  const [loading, setLoading] = useState(configured);
  const [error, setError] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [saving, setSaving] = useState(false);
  const savedRef = useRef(saved),
    draftRef = useRef(draft),
    sequence = useRef(0);
  const revisionRef = useRef(0);
  const abort = useRef<AbortController | null>(null);
  const coverage = useRef(new Map<string, number>());
  const [retained, setRetained] = useState<OverviewSummary["sources"]>({});
  const day = useRef("");
  const sessionGeneration = useRef(0);
  const expire = useCallback((message: string) => {
    sessionGeneration.current++;
    sequence.current++;
    abort.current?.abort();
    savedRef.current = null;
    draftRef.current = null;
    setRetained({});
    coverage.current.clear();
    setSummary(null);
    setSaved(null);
    setDraft(null);
    setCustomizing(false);
    setNeedsLogin(true);
    setError(message);
    setLoading(false);
  }, []);
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
      const requested = draftRef.current;
      setLoading(true);
      try {
        const next = await overviewRequest<OverviewResponse>(
          requested ? `?widgets=${requested.widgets.join(",")}` : "",
          { signal: controller.signal },
        );
        if (id !== sequence.current) return;
        if (day.current !== next.today) {
          coverage.current.clear();
          day.current = next.today;
        }
        for (const key of overviewRequirements(
          (requested ?? next.layout).widgets,
        ))
          coverage.current.set(key, Date.now());
        const expenseData = next.sources.expenses;
        if (expenseData?.status === "ready") {
          if (!expenseData.data.jars) coverage.current.delete("jars");
          if (!expenseData.data.groups) coverage.current.delete("allocation");
        }
        const savingsData = next.sources.savings;
        if (savingsData?.status === "ready" && !savingsData.data.due)
          coverage.current.delete("maturities");
        setRetained((previous) => {
          const result = { ...previous };
          for (const key of Object.keys(next.sources) as SourceId[]) {
            const source = next.sources[key];
            if (source?.status === "ready") {
              Object.assign(result, {
                [key]: {
                  status: "ready",
                  data: source.data,
                },
              });
            }
          }
          return result;
        });
        if (
          !draftRef.current &&
          !requested &&
          next.layout.revision >= (savedRef.current?.revision ?? 0)
        ) {
          savedRef.current = next.layout;
          setSaved(next.layout);
        }
        setSummary((previous) => ({
          ...next,
          sources: { ...previous?.sources, ...next.sources },
        }));
        setError("");
        setNeedsLogin(false);
      } catch (e) {
        if (id !== sequence.current) return;
        if (e instanceof OverviewRequestError && e.status === 401)
          expire(e.message);
        setError(
          e instanceof Error
            ? e.message
            : "Chưa tải được Tổng quan. Hãy thử lại.",
        );
        throw e;
      } finally {
        if (id === sequence.current) setLoading(false);
      }
    }, [expire]),
    configured,
  );
  const layout = draft ?? saved;
  const requestKey = overviewRequirements(layout?.widgets ?? [])
    .sort()
    .join(",");
  useEffect(() => {
    if (configured) void reload().catch(() => {});
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps -- Invalidate all in-flight loads on workspace cleanup.
      sequence.current++;
      abort.current?.abort();
    };
  }, [configured, reload]);
  useEffect(() => {
    if (!configured || needsLogin || !layout) return;
    if (
      overviewRequirements(layout.widgets).some(
        (key) =>
          !coverage.current.has(key) ||
          Date.now() - coverage.current.get(key)! >= 60000,
      )
    ) {
      void reload().catch(() => {});
    }
    // Layout order/jar selection are presentation changes; only missing capabilities fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured, needsLogin, requestKey, reload, summary]);
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
    if (!savedRef.current) return;
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
    const generation = sessionGeneration.current;
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
      if (generation !== sessionGeneration.current) return;
      savedRef.current = next;
      setSaved(next);
      edit(null);
      setCustomizing(false);
      setConflict(false);
    } catch (e) {
      if (e instanceof OverviewRequestError && e.status === 401)
        expire(e.message);
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
    const generation = sessionGeneration.current;
    setSaving(true);
    try {
      const next = await overviewRequest<SavedLayout>("/layout");
      if (generation !== sessionGeneration.current) return;
      savedRef.current = next;
      setSaved(next);
      revisionRef.current = next.revision;
      edit(next);
      setSaveError("");
      setConflict(false);
    } catch (e) {
      if (e instanceof OverviewRequestError && e.status === 401)
        expire(e.message);
      setSaveError(
        e instanceof Error ? e.message : "Chưa tải được bố cục. Hãy thử lại.",
      );
    } finally {
      setSaving(false);
    }
  }
  const staleSources = new Set<SourceId>();
  const sources: OverviewSummary["sources"] = {};
  for (const key of overviewSources(layout?.widgets ?? [])) {
    const result = summary?.sources[key];
    const previous = retained[key];
    if (result?.status === "error" && previous?.status === "ready")
      staleSources.add(key);
    Object.assign(sources, {
      [key]: previous?.status === "ready" ? previous : result,
    });
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
    layoutReady: !!saved,
    saveError,
    conflict,
    saving,
    reload,
  };
}
