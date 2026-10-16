import { spawnSync, spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, readdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import net from "node:net";
import postgres from "postgres";

// This runner owns an isolated local cluster; it never uses DATABASE_URL or cloud data.
await mkdir("artifacts", { recursive: true });
const directory = await mkdtemp(resolve("artifacts/expense-postgres-"));
const pgBin =
  process.env.PG_BIN ??
  spawnSync("pg_config", ["--bindir"], { encoding: "utf8" }).stdout?.trim();
if (!pgBin)
  throw new Error("Set PG_BIN to the directory containing initdb and pg_ctl.");
const port = await new Promise((resolvePort) => {
  const server = net.createServer();
  server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    server.close(() => resolvePort(address.port));
  });
});
function pg(name, args) {
  const result = spawnSync(join(pgBin, name), args, { encoding: "utf8" });
  if (result.status !== 0)
    throw new Error(`${name} failed: ${result.stderr || result.stdout}`);
}
let running = false;
let admin;
try {
  pg("initdb", [
    "-D",
    join(directory, "data"),
    "-A",
    "trust",
    "--no-locale",
    "-E",
    "UTF8",
    "-U",
    "postgres",
  ]);
  pg("pg_ctl", [
    "-D",
    join(directory, "data"),
    "-l",
    join(directory, "postgres.log"),
    "-o",
    `-p ${port} -h 127.0.0.1 -k /tmp`,
    "-w",
    "start",
  ]);
  running = true;
  const adminURL = `postgresql://postgres@127.0.0.1:${port}/postgres`;
  admin = postgres(adminURL, { max: 1 });
  await admin.unsafe(`create role authenticated nologin; create role anon nologin;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select (current_setting('request.jwt.claims',true)::jsonb->>'sub')::uuid $$;`);
  for (const migration of (await readdir("supabase/migrations")).filter(name => name.endsWith(".sql")).sort()) {
    await admin.unsafe(await readFile(join("supabase/migrations", migration), "utf8"));
  }
  await admin.unsafe("alter role expense_api login");
  const testEnv = {
    ...process.env,
    TEST_DATABASE_URL: `postgresql://expense_api@127.0.0.1:${port}/postgres`,
    TEST_DATABASE_ADMIN_URL: adminURL,
  };
  const browser = process.argv.includes("--browser");
  const child = spawn(
    process.execPath,
    browser
      ? ["scripts/test-browser.mjs"]
      : [
          "node_modules/vitest/vitest.mjs",
          "run",
          "--config",
          "vitest.postgres.config.mts",
        ],
    { env: testEnv, stdio: "inherit" },
  );
  const code = await new Promise((resolveCode) =>
    child.once("exit", resolveCode),
  );
  process.exitCode = typeof code === "number" ? code : 1;
} finally {
  await admin?.end();
  if (running)
    pg("pg_ctl", ["-D", join(directory, "data"), "-m", "fast", "-w", "stop"]);
}
