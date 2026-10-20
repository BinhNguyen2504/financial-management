import { describe, expect, it } from "vitest";
import { articles } from "../src/features/help/content";
import { helpPageForPath, helpPages } from "../src/features/help/registry";
import { modules } from "../src/features/catalog";
import { guides } from "../src/features/funds/content";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import type { HelpPageId } from "../src/features/help/types";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HelpText } from "../src/features/help/text";

describe("page help content contract", () => {
  it("renders editorial emphasis, including formulas, without exposing markup or interpreting HTML", () => {
    const texts = Object.values(articles).flatMap((article) =>
      article.sections.flatMap((section) => [
        ...(section.paragraphs ?? []),
        ...(section.items ?? []).flatMap((item) => [
          ...item.paragraphs,
          ...(item.steps ?? []),
          item.result ?? "",
        ]),
      ]),
    );
    for (const text of texts) {
      const rendered = renderToStaticMarkup(createElement(HelpText, { text }));
      expect(rendered, text).not.toMatch(/\*\*|==/);
    }
    const formula = renderToStaticMarkup(
      createElement(HelpText, {
        text: "==Tiền có = dư + tiền thêm== và **<script>**",
      }),
    );
    expect(formula).toContain(
      '<strong class="help-emphasis">Tiền có = dư + tiền thêm</strong>',
    );
    expect(formula).toContain("<strong>&lt;script&gt;</strong>");
  });
  it("covers every catalog route plus profile with unique, addressable sections and complete tasks", () => {
    expect(Object.keys(articles).sort()).toEqual(
      [...modules.map((m) => m.slug), "profile"].sort(),
    );
    for (const page of helpPages) {
      expect(helpPageForPath(`/${page.id}`)).toEqual(page);
      const article = articles[page.id];
      expect(article.sections.map((s) => s.id)).toEqual([
        "purpose",
        "mindset",
        "terms",
        "tasks",
        "examples",
        "pitfalls",
      ]);
      const ids = article.sections.flatMap((s) => [
        s.id,
        ...(s.items ?? []).map((item) => item.id),
      ]);
      expect(new Set(ids).size, page.id).toBe(ids.length);
      for (const id of ids) expect(id).toMatch(/^[a-z0-9_-]+$/);
      for (const task of article.sections.find((s) => s.id === "tasks")!
        .items!) {
        expect(task.paragraphs.length).toBeGreaterThan(0);
        expect(task.steps!.length).toBeGreaterThan(0);
        expect(task.result).toMatch(/^Kết quả:/);
      }
    }
    for (const path of ["/", "/login", "/unknown", "/income/unknown"])
      expect(helpPageForPath(path)).toBeUndefined();
  });

  it("uses the existing fund definitions verbatim instead of maintaining competing explanations", () => {
    const terms = articles.funds.sections.find((s) => s.id === "terms")!.items!;
    for (const [id, guide] of Object.entries(guides)) {
      expect(terms.find((term) => term.id === id)?.paragraphs).toEqual([
        guide.concept,
        guide.principle,
      ]);
    }
  });

  it("resolves every contextual button target, including conditional editor targets", () => {
    function files(directory: string): string[] {
      return readdirSync(directory, { withFileTypes: true }).flatMap(
        (entry) => {
          const path = join(directory, entry.name);
          return entry.isDirectory()
            ? files(path)
            : path.endsWith(".tsx")
              ? [path]
              : [];
        },
      );
    }
    function values(node: ts.Node): string[] {
      if (ts.isStringLiteral(node)) return [node.text];
      if (ts.isJsxExpression(node) && node.expression)
        return values(node.expression);
      if (ts.isConditionalExpression(node))
        return [...values(node.whenTrue), ...values(node.whenFalse)];
      throw new Error(`Unsupported Help target: ${node.getText()}`);
    }
    let count = 0;
    for (const path of files("src/features")) {
      const source = ts.createSourceFile(
        path,
        readFileSync(path, "utf8"),
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      );
      function visit(node: ts.Node) {
        if (
          ts.isJsxSelfClosingElement(node) &&
          node.tagName.getText() === "HelpButton"
        ) {
          const attributes = node.attributes.properties.filter(
            ts.isJsxAttribute,
          );
          const page = attributes.find((a) => a.name.getText() === "pageId")!;
          const section = attributes.find(
            (a) => a.name.getText() === "sectionId",
          );
          const article = articles[values(page.initializer!)[0] as HelpPageId];
          expect(article, path).toBeDefined();
          const ids = article.sections.flatMap((s) => [
            s.id,
            ...(s.items ?? []).map((item) => item.id),
          ]);
          if (section)
            for (const id of values(section.initializer!))
              expect(ids, `${path}: ${id}`).toContain(id);
          count++;
        }
        ts.forEachChild(node, visit);
      }
      visit(source);
    }
    expect(count).toBeGreaterThan(0);
  });
});
