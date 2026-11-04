import { AsyncLocalStorage } from "node:async_hooks";

type Timing = { phases: Map<string, number>; statements: number };
const timings = new AsyncLocalStorage<Timing>();

export function recordDuration(name: string, started: number) {
  const timing = timings.getStore();
  if (timing)
    timing.phases.set(
      name,
      (timing.phases.get(name) ?? 0) + performance.now() - started,
    );
}

export function recordStatement() {
  const timing = timings.getStore();
  if (timing) timing.statements++;
}

export async function timePhase<T>(
  name: string,
  run: () => PromiseLike<T> | T,
): Promise<T> {
  const started = performance.now();
  try {
    return await run();
  } finally {
    recordDuration(name, started);
  }
}

/** Opt-in diagnostics contain durations/counts only, never owners, SQL or inputs. */
export async function withFinancialTiming(
  request: Request,
  run: () => Promise<Response>,
) {
  if (process.env.FINANCIAL_TIMING !== "1") return run();
  const timing: Timing = { phases: new Map(), statements: 0 };
  return timings.run(timing, async () => {
    const started = performance.now();
    const response = await run();
    recordDuration("total", started);
    response.headers.set(
      "Server-Timing",
      [...timing.phases]
        .map(([name, duration]) => `${name};dur=${duration.toFixed(2)}`)
        .join(", "),
    );
    response.headers.set("X-DB-Statements", String(timing.statements));
    const moduleName =
      new URL(request.url).pathname.match(
        /^\/api\/v1\/(expenses|income|savings|investments|funds|goals|overview|reports|data)(?:\/|$)/,
      )?.[1] ?? "other";
    console.info("Financial request timing", {
      module: moduleName,
      method: request.method,
      status: response.status,
      statements: timing.statements,
      milliseconds: Object.fromEntries(
        [...timing.phases].map(([k, v]) => [k, Number(v.toFixed(2))]),
      ),
    });
    return response;
  });
}
