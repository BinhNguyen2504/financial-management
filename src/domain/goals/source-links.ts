import type { Goal, GoalSource, GoalSources } from "./schema";

type Link = Pick<Goal["links"][number], "kind" | "sourceId" | "scope">;
export const sourceKey = (link: { kind: string; sourceId: string }) =>
  `${link.kind}:${link.sourceId}`;

export function linkedSource(sources: GoalSources, link: Link) {
  const items = link.scope
    ? sources.items
    : [...(sources.legacyItems ?? []), ...sources.items];
  return items.find(
    (s) => sourceKey(s) === sourceKey(link) && s.scope === link.scope,
  );
}

/** A portfolio share also consumes the same share of every owned position. */
export function allocationKeys(link: Link, source?: GoalSource) {
  return link.scope === "portfolio" && source?.componentIds
    ? source.componentIds.map((id) => `investments:${id}`)
    : [sourceKey(link)];
}

export function availableShare(
  goals: Goal[],
  sources: GoalSources,
  source: GoalSource,
  excludingGoal: string,
) {
  const used = new Map<string, number>();
  for (const goal of goals.filter(
    (g) =>
      g.id !== excludingGoal &&
      g.mode === "linked" &&
      g.purpose === "spending" &&
      ["active", "paused"].includes(g.status),
  ))
    for (const link of goal.links)
      for (const key of allocationKeys(link, linkedSource(sources, link)))
        used.set(key, (used.get(key) ?? 0) + link.share);
  return Math.max(
    0,
    Math.min(
      ...allocationKeys(source, source).map(
        (key) => 10000 - (used.get(key) ?? 0),
      ),
    ),
  );
}
