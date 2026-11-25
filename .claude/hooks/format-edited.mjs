#!/usr/bin/env node
// PostToolUse hook: keep edited source files Prettier-clean so `npm run format:check`
// (part of CI) does not fail on files Claude touched. Never blocks the session.
import { readFileSync, existsSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";

try {
  const input = JSON.parse(readFileSync(0, "utf8"));
  const root = resolve(process.env.CLAUDE_PROJECT_DIR ?? process.cwd());
  const target = input?.tool_input?.file_path;
  if (typeof target !== "string") process.exit(0);
  const file = resolve(root, target);
  const path = relative(root, file).split(sep).join("/");
  // Same scope as the `format:check` script: src, tests, scripts and root TS/MJS configs.
  const inScope =
    /^(src|tests|scripts)\//.test(path) || /^[^/]+\.(mjs|mts|ts)$/.test(path);
  if (
    !inScope ||
    !/\.(tsx?|mts|mjs)$/.test(path) ||
    path.startsWith("../") ||
    !existsSync(file)
  )
    process.exit(0);
  const prettier = resolve(root, "node_modules/.bin/prettier");
  if (!existsSync(prettier)) process.exit(0);
  spawnSync(prettier, ["--write", "--log-level", "silent", file], {
    cwd: root,
    stdio: "ignore",
  });
} catch {
  // Formatting is best-effort.
}
process.exit(0);
