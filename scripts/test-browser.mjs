import http from "node:http";
import net from "node:net";
import { randomUUID, createHmac } from "node:crypto";
import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { readFile } from "node:fs/promises";
import postgres from "postgres";

// A local Auth contract double. No test identity or bypass is compiled into production code.
const db = postgres(process.env.TEST_DATABASE_ADMIN_URL, { max: 1 });
const identities = new Map();
const sessions = new Map();
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
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
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
    if (path === "/auth/v1/otp") {
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
      return value && value.expires_at > Date.now() / 1000
        ? send(200, value.user)
        : send(401, { message: "Invalid token" });
    }
    if (path === "/auth/v1/token") {
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
  NEXT_PUBLIC_SUPABASE_URL: authURL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_local_test",
  TEST_BASE_URL: baseURL,
};
const log = createWriteStream("artifacts/browser-next.log");
const web = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "dev",
    "--webpack",
    "--hostname",
    "127.0.0.1",
    "--port",
    String(port),
  ],
  { env: environment, detached: true, stdio: ["ignore", "pipe", "pipe"] },
);
web.stdout.pipe(log);
web.stderr.pipe(log);
try {
  let ready = false;
  for (let i = 0; i < 120; i++) {
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
  const tests = spawn(
    process.execPath,
    ["node_modules/@playwright/test/cli.js", "test"],
    { env: environment, stdio: "inherit" },
  );
  process.exitCode = await new Promise((resolve) =>
    tests.on("exit", (code) => resolve(code ?? 1)),
  );
  if (process.exitCode)
    console.error(
      (await readFile("artifacts/browser-next.log", "utf8")).slice(-5000),
    );
} finally {
  try {
    process.kill(-web.pid, "SIGTERM");
  } catch {
    /* Already stopped. */
  }
  await new Promise((resolve) => auth.close(resolve));
  await db.end();
  log.end();
}
