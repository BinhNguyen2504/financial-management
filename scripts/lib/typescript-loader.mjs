import { readFile, access } from "node:fs/promises";
import ts from "typescript";
export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context);
  } catch (error) {
    if (
      error.code !== "ERR_MODULE_NOT_FOUND" ||
      !specifier.startsWith(".") ||
      !context.parentURL?.startsWith("file:")
    )
      throw error;
    for (const suffix of [".ts", ".mts"]) {
      const candidate = new URL(specifier + suffix, context.parentURL);
      try {
        await access(candidate);
      } catch {
        continue;
      }
      return { url: candidate.href, shortCircuit: true };
    }
    throw error;
  }
}
export async function load(url, context, next) {
  if (!url.startsWith("file:") || !/\.(ts|mts)$/.test(url))
    return next(url, context);
  const source = await readFile(new URL(url), "utf8");
  return {
    format: "module",
    shortCircuit: true,
    source: ts.transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        verbatimModuleSyntax: true,
      },
    }).outputText,
  };
}
