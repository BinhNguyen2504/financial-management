import { z } from "zod";

/** Reset scopes are the module prefixes of the backup tables (see `moduleLabels`). */
export const resetModules = [
  "expense",
  "income",
  "savings",
  "investments",
  "funds",
  "goals",
] as const;
export type ResetModule = (typeof resetModules)[number];
export const resetModuleSchema = z.enum(resetModules);

/** Goals reference these modules by foreign key, so they can only be cleared together with Goals. */
export const goalSources: readonly ResetModule[] = [
  "savings",
  "investments",
  "funds",
];

export const fullResetConfirmation = "XÓA TOÀN BỘ";
export const partialResetConfirmation = "XÓA DỮ LIỆU";

/** Adds the modules a selection depends on and returns the canonical, de-duplicated order. */
export function resolveResetModules(
  selected: readonly ResetModule[],
): ResetModule[] {
  const wanted = new Set(selected);
  if (goalSources.some((module) => wanted.has(module))) wanted.add("goals");
  return resetModules.filter((module) => wanted.has(module));
}

/** The modules that were added only because Goals depend on them. */
export function addedResetModules(
  selected: readonly ResetModule[],
): ResetModule[] {
  const chosen = new Set(selected);
  return resolveResetModules(selected).filter((module) => !chosen.has(module));
}

export const isFullReset = (modules: readonly ResetModule[]) =>
  resetModules.every((module) => modules.includes(module));

export const resetConfirmationFor = (modules: readonly ResetModule[]) =>
  isFullReset(modules) ? fullResetConfirmation : partialResetConfirmation;
