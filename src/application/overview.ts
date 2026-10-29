import type { WidgetId } from "../domain/overview/layout";
import type {
  OverviewData,
  OverviewSummary,
  SourceId,
} from "../domain/overview/summary";
import type { Clock } from "../domain/shared/types";
import { overviewSources } from "../domain/overview/summary";
export async function readOverview(
  widgets: WidgetId[],
  loaders: { [K in SourceId]: () => Promise<OverviewData[K]> },
  clock: Clock,
): Promise<OverviewSummary> {
  const needed = overviewSources(widgets);
  const entries = await Promise.all(
    needed.map(async (key) => {
      try {
        return [key, { status: "ready", data: await loaders[key]() }] as const;
      } catch {
        return [key, { status: "error" }] as const;
      }
    }),
  );
  return {
    today: clock.today,
    fetchedAt: clock.now,
    sources: Object.fromEntries(entries),
  };
}
