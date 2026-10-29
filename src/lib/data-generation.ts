/** Metadata belongs to the view that produced the draft, never a global cache. */
export function generationOf(view: unknown): number {
  return view &&
    typeof view === "object" &&
    "dataGeneration" in view &&
    typeof view.dataGeneration === "number"
    ? view.dataGeneration
    : 0;
}

export function generationHeaders(generation: number) {
  return { "X-Data-Generation": String(generation) };
}
