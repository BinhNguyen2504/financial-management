import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { cp, mkdir, mkdtemp, symlink } from "node:fs/promises";
import net from "node:net";
import { resolve, join } from "node:path";

// Isolated production builds: no .env files, account data, DB or Auth service.
await mkdir("artifacts", { recursive: true });
const origin = "https://financial-manager.example.com";
const cases = [
  {
    name: "disabled",
    origin: "",
    flag: "false",
    vercel: "production",
    indexable: false,
  },
  {
    name: "enabled",
    origin,
    flag: "true",
    vercel: "production",
    indexable: true,
  },
  {
    name: "preview",
    origin,
    flag: "true",
    vercel: "preview",
    indexable: false,
  },
];

function run(args, env, log) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(process.execPath, args, {
      env,
      stdio: log ? ["ignore", "pipe", "pipe"] : "inherit",
    });
    if (log) {
      child.stdout.pipe(log, { end: false });
      child.stderr.pipe(log, { end: false });
    }
    child.once("error", reject);
    child.once("exit", (code) =>
      code === 0
        ? resolveRun()
        : reject(new Error(`Command exited ${code}: ${args.join(" ")}`)),
    );
  });
}

// Resume selected configurations after an interruption, e.g. enabled preview.
const selected = process.argv.slice(2);
if (selected.some((name) => !cases.some((entry) => entry.name === name))) {
  throw new Error("SEO cases: disabled enabled preview");
}
for (const entry of cases.filter(
  (entry) => selected.length === 0 || selected.includes(entry.name),
)) {
  const app = await mkdtemp(resolve(`artifacts/seo-${entry.name}-app-`));
  for (const name of [
    "src",
    "public",
    "package.json",
    "package-lock.json",
    "next.config.ts",
    "tsconfig.json",
    "next-env.d.ts",
    "postcss.config.mjs",
    "AGENTS.md",
  ]) {
    await cp(resolve(name), join(app, name), { recursive: true });
  }
  await symlink(resolve("node_modules"), join(app, "node_modules"), "dir");
  const port = await new Promise((resolvePort) => {
    const socket = net.createServer();
    socket.listen(0, "127.0.0.1", () => {
      const { port } = socket.address();
      socket.close(() => resolvePort(port));
    });
  });
  const env = {
    ...process.env,
    NODE_ENV: "production",
    APP_ORIGIN: entry.origin,
    SEO_INDEXABLE: entry.flag,
    VERCEL_ENV: entry.vercel,
    DATABASE_URL: "",
    NEXT_PUBLIC_SUPABASE_URL: "",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
    TEST_BASE_URL: `http://127.0.0.1:${port}`,
    TEST_SEO_ORIGIN: entry.origin,
    TEST_SEO_INDEXABLE: String(entry.indexable),
    TEST_FIREFOX: "1",
    TEST_WEBKIT: "1",
  };
  const logPath = `artifacts/seo-${entry.name}-next.log`;
  const log = createWriteStream(logPath);
  let web;
  try {
    console.log(
      `SEO ${entry.name}: building isolated production app (log: ${logPath})`,
    );
    await run(
      ["node_modules/next/dist/bin/next", "build", app, "--webpack"],
      env,
      log,
    );
    web = spawn(
      process.execPath,
      [
        "node_modules/next/dist/bin/next",
        "start",
        app,
        "--hostname",
        "127.0.0.1",
        "--port",
        String(port),
      ],
      { env, detached: true, stdio: ["ignore", "pipe", "pipe"] },
    );
    web.stdout.pipe(log, { end: false });
    web.stderr.pipe(log, { end: false });
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      if (web.exitCode !== null)
        throw new Error(`SEO server exited; see ${logPath}`);
      try {
        if ((await fetch(`${env.TEST_BASE_URL}/robots.txt`)).ok) {
          ready = true;
          break;
        }
      } catch {
        /* Wait for the isolated server. */
      }
      await new Promise((resolveWait) => setTimeout(resolveWait, 500));
    }
    if (!ready) throw new Error(`SEO server did not start; see ${logPath}`);
    await run(
      [
        "node_modules/@playwright/test/cli.js",
        "test",
        "tests/browser/seo.spec.ts",
        ...(entry.name === "disabled" ? [] : ["--project=desktop"]),
        `--output=artifacts/seo-${entry.name}-browser`,
      ],
      env,
    );
  } finally {
    if (web?.pid) {
      try {
        process.kill(-web.pid, "SIGTERM");
      } catch {
        /* Already stopped. */
      }
      await new Promise((resolveExit) =>
        web.exitCode !== null ? resolveExit() : web.once("exit", resolveExit),
      );
    }
    log.end();
  }
}
