import type {
  ReportInput,
  ReportQuery,
  SourceId,
} from "../domain/reports/model";
import type { Clock } from "../domain/shared/types";
import { reportSources } from "../domain/reports/model";
import {
  buildReport,
  detailSources,
  reportDetails,
  type ReportBuildOptions,
} from "../domain/reports/build";

export interface ReportRepository {
  read(
    owner: string,
    sources: SourceId[],
    options?: { fullSources: SourceId[] },
  ): Promise<ReportInput>;
}
export async function readReport(
  repository: ReportRepository,
  owner: string,
  query: ReportQuery,
  clock: Clock,
  options: ReportBuildOptions = {},
) {
  return buildReport(
    await repository.read(owner, reportSources(query.tab)),
    query,
    clock,
    options,
  );
}

/** Keep the full version vector, but read ledgers only for the requested metric.
 * Degraded reports retain canonical rebuilding so error recovery is detected. */
export async function readReportDetails(
  repository: ReportRepository,
  owner: string,
  query: ReportQuery,
  clock: Clock,
  metric: string,
  versions: string,
  page: number,
) {
  const fullSources = detailSources(query, metric);
  let degraded = true;
  try {
    const value = JSON.parse(versions) as { sources?: Record<string, unknown> };
    degraded =
      !value.sources ||
      Object.values(value.sources).some(
        (v) => !Array.isArray(v) || v[0] !== "ready",
      );
  } catch {
    /* reportDetails rejects malformed or stale version vectors below. */
  }
  const input = await repository.read(
    owner,
    reportSources(query.tab),
    degraded ? undefined : { fullSources },
  );
  const result = buildReport(
    input,
    query,
    clock,
    degraded ? undefined : { metric },
  );
  return reportDetails(result, metric, versions, page);
}
