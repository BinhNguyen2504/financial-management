import http from "node:http";
import net from "node:net";
import { randomUUID, createHmac, createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { readFile, cp, mkdtemp, symlink, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import postgres from "postgres";
import { buildReviewData, buildReviewSQL } from "./lib/review-data.mjs";
import {
  addSavingsReviewData,
  buildSavingsReviewSQL,
} from "./lib/savings-review-data.mjs";

// A local Auth contract double. No test identity or bypass is compiled into production code.
const db = postgres(process.env.TEST_DATABASE_ADMIN_URL, { max: 1 });
const identities = new Map();
const sessions = new Map();
const authOutages = new Set();
const challenges = new Map();
const confirmationCodes = new Map();
const signingKey = randomUUID();
let authURL;
function session(user) {
  const encode = (v) => Buffer.from(JSON.stringify(v)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const payload = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: user.id, email: user.email, role: "authenticated", aud: "authenticated", iss: `${authURL}/auth/v1`, iat: now, exp: now + 3600 })}`;
  const access_token = `${payload}.${createHmac("sha256", signingKey).update(payload).digest("base64url")}`;
  const value = {
    access_token,
    refresh_token: randomUUID(),
    token_type: "bearer",
    expires_in: 3600,
    expires_at: now + 3600,
    user,
  };
  sessions.set(access_token, value);
  sessions.set(value.refresh_token, value);
  return value;
}
const auth = http.createServer(async (request, response) => {
  response.setHeader(
    "Access-Control-Allow-Origin",
    request.headers.origin ?? "*",
  );
  response.setHeader(
    "Access-Control-Allow-Headers",
    "authorization, apikey, content-type, x-client-info, x-supabase-api-version",
  );
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
  response.setHeader("Content-Type", "application/json");
  const send = (status, value) => {
    response.statusCode = status;
    response.end(JSON.stringify(value));
  };
  if (request.method === "OPTIONS") return send(200, {});
  try {
    let text = "";
    for await (const chunk of request) text += chunk;
    const body = text ? JSON.parse(text) : {};
    const path = request.url.split("?")[0];
    // Controls belong exclusively to this isolated local test server.
    if (path === "/__test__/auth-state") {
      if (body.unavailable) authOutages.add(body.email);
      else authOutages.delete(body.email);
      if (body.revoke) for (const [key, value] of sessions) {
        if (value.user.email === body.email) sessions.delete(key);
      }
      const code = randomUUID();
      confirmationCodes.set(code, body.email);
      return send(200, { code });
    }
    if (path === "/auth/v1/otp") {
      if (body.code_challenge) challenges.set(body.email, body.code_challenge);
      if (!body.email?.endsWith("@example.test"))
        return send(400, { message: "Test emails only" });
      if (!identities.has(body.email)) {
        const user = {
          id: randomUUID(),
          email: body.email,
          aud: "authenticated",
          role: "authenticated",
          app_metadata: {},
          user_metadata: {},
          created_at: new Date().toISOString(),
        };
        identities.set(body.email, user);
        await db`insert into auth.users(id) values(${user.id})`;
      }
      return send(200, {});
    }
    if (path === "/auth/v1/verify") {
      const user = identities.get(body.email);
      return user && body.token === "123456"
        ? send(200, session(user))
        : send(401, { message: "Invalid OTP" });
    }
    if (path === "/auth/v1/user") {
      const value = sessions.get(
        request.headers.authorization?.replace(/^Bearer /i, ""),
      );
      if (!value || value.expires_at <= Date.now() / 1000)
        return send(401, { message: "Invalid token" });
      if (authOutages.has(value.user.email)) return send(503, { message: "Local Auth outage" });
      if (request.method === "PUT") {
        value.user.user_metadata = {
          ...value.user.user_metadata,
          ...body.data,
        };
      }
      return send(200, value.user);
    }
    if (path === "/auth/v1/token") {
      if (body.auth_code) {
        const email = confirmationCodes.get(body.auth_code);
        const user = identities.get(email);
        const challenge = createHash("sha256").update(body.code_verifier ?? "").digest("base64url");
        if (!user || challenges.get(email) !== challenge) return send(400, { message: "Invalid PKCE code" });
        confirmationCodes.delete(body.auth_code);
        return send(200, session(user));
      }
      const old = sessions.get(body.refresh_token);
      return old
        ? send(200, session(old.user))
        : send(401, { message: "Invalid refresh" });
    }
    if (path === "/auth/v1/logout") {
      const token = request.headers.authorization?.replace(/^Bearer /i, "");
      const old = sessions.get(token);
      sessions.delete(token);
      if (old) sessions.delete(old.refresh_token);
      return send(200, {});
    }
    send(404, { message: "Unknown Auth test endpoint" });
  } catch {
    send(500, { message: "Auth test server error" });
  }
});
await new Promise((resolve) => auth.listen(0, "127.0.0.1", resolve));
authURL = `http://127.0.0.1:${auth.address().port}`;
const reviewPreview = process.env.TEST_REVIEW_PREVIEW === "1";
if (reviewPreview) {
  const user = {
    id: randomUUID(),
    email: "review@example.test",
    aud: "authenticated",
    role: "authenticated",
    app_metadata: {},
    user_metadata: { full_name: "Review UI/UX" },
    created_at: new Date().toISOString(),
  };
  identities.set(user.email, user);
  await db`insert into auth.users(id) values(${user.id})`;
  const sample = addSavingsReviewData(buildReviewData({ ownerId: user.id }));
  await db.unsafe(buildReviewSQL(sample).seed);
  await db.unsafe(buildSavingsReviewSQL(sample).seed);
}
const port = await new Promise((resolve) => {
  const socket = net.createServer();
  socket.listen(0, "127.0.0.1", () => {
    const p = socket.address().port;
    socket.close(() => resolve(p));
  });
});
const baseURL = `http://127.0.0.1:${port}`;
const environment = {
  ...process.env,
  DATABASE_URL: process.env.TEST_DATABASE_URL,
  DATABASE_SSL: "disable",
  APP_ORIGIN: baseURL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.TEST_AUTH_UNCONFIGURED === "1" ? "" : authURL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.TEST_AUTH_UNCONFIGURED === "1" ? "" : "sb_publishable_local_test",
  TEST_BASE_URL: baseURL,
};
const log = createWriteStream("artifacts/browser-next.log");
// Give tests their own Next app/build/lock; preserve any developer server and its Auth.
const testApp = await mkdtemp(resolve("artifacts/browser-app-"));
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
  await cp(resolve(name), join(testApp, name), { recursive: true });
}
await symlink(resolve("node_modules"), join(testApp, "node_modules"), "dir");
let web;
try {
  const interactive = process.env.TEST_BROWSER_MCP === "1";
  if (!interactive) {
    // Production has no Fast Refresh: compiling another route must not reload a draft.
    const build = spawn(
      process.execPath,
      ["node_modules/next/dist/bin/next", "build", testApp, "--webpack"],
      { env: environment, stdio: ["ignore", "pipe", "pipe"] },
    );
    build.stdout.pipe(log, { end: false });
    build.stderr.pipe(log, { end: false });
    const code = await new Promise((resolve, reject) => {
      build.once("error", reject);
      build.once("exit", resolve);
    });
    if (code !== 0)
      throw new Error(
        "Next test production build failed; see artifacts/browser-next.log",
      );
  }
  web = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      interactive ? "dev" : "start",
      testApp,
      ...(interactive ? ["--webpack"] : []),
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    { env: environment, detached: true, stdio: ["ignore", "pipe", "pipe"] },
  );
  web.stdout.pipe(log, { end: false });
  web.stderr.pipe(log, { end: false });
  let ready = false;
  for (let i = 0; i < 120; i++) {
    if (web.exitCode !== null)
      throw new Error(
        "Next test server exited before becoming ready; see artifacts/browser-next.log",
      );
    try {
      const response = await fetch(`${baseURL}/login`);
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {
      /* Wait for Next. */
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!ready) throw new Error("Next test server did not become ready");
  if (process.env.TEST_BROWSER_MCP === "1" || reviewPreview) {
    if (reviewPreview) {
      const info = {
        url: `${baseURL}/login?next=/savings`,
        email: "review@example.test",
        otp: "123456",
        scope: "Isolated local UI review only; no cloud writes",
      };
      await writeFile(
        "artifacts/review-preview.json",
        JSON.stringify(info, null, 2) + "\n",
        { mode: 0o600 },
      );
      console.log(
        `REVIEW READY: ${info.url}\nEmail: ${info.email} · OTP: ${info.otp}\nDữ liệu mẫu ở PostgreSQL local riêng; dữ liệu cloud không thay đổi. Ctrl+C để dừng.`,
      );
    } else
      console.log(
        `MCP test app ready: ${baseURL} (Auth: ${authURL}). Use any @example.test email and OTP 123456.`,
      );
    await new Promise((resolve) => {
      process.once("SIGTERM", resolve);
      process.once("SIGINT", resolve);
    });
  } else {
    const tests = spawn(
      process.execPath,
      [
        "node_modules/@playwright/test/cli.js",
        "test",
        ...process.argv.slice(2),
      ],
      { env: environment, stdio: "inherit" },
    );
    process.exitCode = await new Promise((resolve) =>
      tests.on("exit", (code) => resolve(code ?? 1)),
    );
    if (process.exitCode)
      console.error(
        (await readFile("artifacts/browser-next.log", "utf8")).slice(-5000),
      );
  }
} finally {
  try {
    if (web?.pid) process.kill(-web.pid, "SIGTERM");
  } catch {
    /* Already stopped. */
  }
  await new Promise((resolve) => auth.close(resolve));
  await db.end();
  log.end();
}
