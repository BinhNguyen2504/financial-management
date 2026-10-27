import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { inspectArchitecture } from "../scripts/check-architecture.mjs";

const roots: string[] = [];
function fixture(files: Record<string, string>) {
  const root = mkdtempSync(join(tmpdir(), "fm-architecture-"));
  roots.push(root);
  for (const [name, content] of Object.entries({
    "tsconfig.json": JSON.stringify({
      compilerOptions: { paths: { "@/*": ["./src/*"] } },
    }),
    ...files,
  })) {
    mkdirSync(dirname(join(root, name)), { recursive: true });
    writeFileSync(join(root, name), content);
  }
  return root;
}
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

describe("architecture checks", () => {
  it("allows erased types and catches server access through alias re-exports and dynamic imports", () => {
    const root = fixture({
      "src/client.ts":
        '"use client"; import type { Owner } from "@/server/db"; export type Client = Owner;',
      "src/server/db.ts":
        'import "server-only"; export type Owner = string; export const read = () => 1;',
      "src/lib/bridge.ts": 'export { read } from "@/server/db";',
    });
    expect(inspectArchitecture(root).issues).toEqual([]);
    writeFileSync(
      join(root, "src/client.ts"),
      '"use client"; export const load = () => import("@/lib/bridge");',
    );
    expect(inspectArchitecture(root).issues).toEqual([
      expect.stringContaining("Client/server boundary:"),
    ]);
  });

  it("rejects runtime cycles and framework imports in domain", () => {
    const root = fixture({
      "src/domain/a.ts":
        'import { b } from "./b"; import { cache } from "react"; export const a = () => cache(b);',
      "src/domain/b.ts": 'import { a } from "./a"; export const b = () => a();',
    });
    expect(inspectArchitecture(root).issues).toEqual([
      expect.stringContaining("Domain dependency:"),
      expect.stringContaining("Runtime cycle:"),
    ]);
  });

  it("requires the shared awaited page guard on planned and implemented pages", () => {
    const root = fixture({
      "src/app/(app)/planned/page.tsx":
        "export default function Page() { return null; }",
      "src/app/(app)/income/page.tsx":
        'export default async function Page() { await pageAccess("/income"); return null; }',
      "src/app/(public)/page.tsx":
        "export default function Page() { return null; }",
    });
    expect(inspectArchitecture(root).issues).toEqual([
      "Missing awaited pageAccess: src/app/(app)/planned/page.tsx",
    ]);
  });
});
