import { spawn } from "node:child_process";
const child = spawn(
  process.execPath,
  ["scripts/test-postgres.mjs", "--browser"],
  { stdio: "inherit", env: { ...process.env, TEST_REVIEW_PREVIEW: "1" } },
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.once(signal, () => child.kill(signal));
child.once("exit", (code) => {
  process.exitCode = code ?? 1;
});
