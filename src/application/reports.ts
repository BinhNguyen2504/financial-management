import type {
  ReportInput,
  ReportQuery,
  SourceId,
} from "../domain/reports/model";
import type { Clock } from "../domain/shared/types";
import { reportSources } from "../domain/reports/model";
import { buildReport } from "../domain/reports/build";

export interface ReportRepository {
  read(owner: string, sources: SourceId[]): Promise<ReportInput>;
}
export async function readReport(
  repository: ReportRepository,
  owner: string,
  query: ReportQuery,
  clock: Clock,
) {
  return buildReport(
    await repository.read(owner, reportSources(query.tab)),
    query,
    clock,
  );
}
