import { readdirSync, readFileSync } from "node:fs";
import { resolve, relative, join } from "node:path";
import { fileURLToPath } from "node:url";
import { isBuiltin } from "node:module";
import ts from "typescript";

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = join(directory, entry.name);
    return entry.isDirectory()
      ? sourceFiles(file)
      : /\.tsx?$/.test(file)
        ? [file]
        : [];
  });
}

/** Resolve aliases/re-exports and inspect emitted imports, so type imports are
 * permitted across the browser boundary without hiding runtime dependencies. */
export function inspectArchitecture(root = process.cwd()) {
  const sourceRoot = resolve(root, "src");
  const configPath = ts.findConfigFile(
    root,
    ts.sys.fileExists,
    "tsconfig.json",
  );
  const config = configPath
    ? ts.readConfigFile(configPath, ts.sys.readFile).config
    : {};
  const options = ts.parseJsonConfigFileContent(config, ts.sys, root).options;
  const graph = new Map();
  const clients = [];
  const issues = new Set();
  const label = (file) => relative(root, file).replaceAll("\\", "/");

  for (const file of sourceFiles(sourceRoot).sort()) {
    const text = readFileSync(file, "utf8");
    const original = ts.createSourceFile(
      file,
      text,
      ts.ScriptTarget.Latest,
      true,
    );
    function checkDependency(name, target) {
      if (
        label(file).startsWith("src/domain/") &&
        ((target?.startsWith(sourceRoot + "/") &&
          !label(target).startsWith("src/domain/")) ||
          (!name.startsWith(".") && !name.startsWith("@/") && name !== "zod"))
      )
        issues.add(`Domain dependency: ${label(file)} -> ${name}`);
      if (
        label(file).startsWith("src/application/") &&
        target?.startsWith(sourceRoot + "/") &&
        !/^src\/(application|domain)\//.test(label(target))
      )
        issues.add(`Application dependency: ${label(file)} -> ${name}`);
    }
    function checkLayers(node) {
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        const name = node.moduleSpecifier.text;
        checkDependency(
          name,
          ts.resolveModuleName(name, file, options, ts.sys).resolvedModule
            ?.resolvedFileName,
        );
      }
      ts.forEachChild(node, checkLayers);
    }
    checkLayers(original);
    if (
      original.statements.some(
        (node) =>
          ts.isExpressionStatement(node) &&
          ts.isStringLiteral(node.expression) &&
          node.expression.text === "use client",
      )
    )
      clients.push(file);

    const emitted = ts.transpileModule(text, {
      fileName: file,
      compilerOptions: {
        ...options,
        module: ts.ModuleKind.ESNext,
        jsx: ts.JsxEmit.Preserve,
      },
    }).outputText;
    const runtime = ts.createSourceFile(
      file,
      emitted,
      ts.ScriptTarget.Latest,
      true,
    );
    const dependencies = [];
    function visit(node) {
      const specifier =
        ts.isImportDeclaration(node) || ts.isExportDeclaration(node)
          ? node.moduleSpecifier
          : ts.isCallExpression(node) &&
              (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
                (ts.isIdentifier(node.expression) &&
                  node.expression.text === "require"))
            ? node.arguments[0]
            : undefined;
      if (specifier && ts.isStringLiteral(specifier)) {
        const name = specifier.text;
        const target = ts.resolveModuleName(name, file, options, ts.sys)
          .resolvedModule?.resolvedFileName;
        dependencies.push({ name, target });
        checkDependency(name, target);
      }
      ts.forEachChild(node, visit);
    }
    visit(runtime);
    graph.set(file, dependencies);

    if (/^src\/app\/\(app\)\/.*page\.tsx$/.test(label(file))) {
      let guarded = false;
      function findGuard(node) {
        if (ts.isFunctionLike(node)) return;
        if (
          ts.isAwaitExpression(node) &&
          ts.isCallExpression(node.expression) &&
          node.expression.expression.getText(original) === "pageAccess"
        )
          guarded = true;
        ts.forEachChild(node, findGuard);
      }
      const page = original.statements.find(
        (node) =>
          ts.isFunctionDeclaration(node) &&
          node.modifiers?.some(
            (modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword,
          ),
      );
      if (page?.body) findGuard(page.body);
      if (!guarded) issues.add(`Missing awaited pageAccess: ${label(file)}`);
    }
  }

  const visited = new Set();
  const stack = [];
  function visitCycle(file) {
    if (stack.includes(file)) {
      issues.add(
        `Runtime cycle: ${[...stack.slice(stack.indexOf(file)), file].map(label).join(" -> ")}`,
      );
      return;
    }
    if (visited.has(file)) return;
    visited.add(file);
    stack.push(file);
    for (const { target } of graph.get(file) ?? [])
      if (target && graph.has(target)) visitCycle(target);
    stack.pop();
  }
  for (const file of graph.keys()) visitCycle(file);

  const browserVisited = new Set();
  function visitBrowser(file, chain) {
    if (browserVisited.has(file)) return;
    browserVisited.add(file);
    for (const { name, target } of graph.get(file) ?? []) {
      if (
        name === "server-only" ||
        isBuiltin(name) ||
        (target && /^src\/(server|application)\//.test(label(target)))
      )
        issues.add(
          `Client/server boundary: ${[...chain, label(file), name].join(" -> ")}`,
        );
      else if (target && graph.has(target))
        visitBrowser(target, [...chain, label(file)]);
    }
  }
  for (const file of clients) visitBrowser(file, []);
  return { files: graph.size, issues: [...issues].sort() };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const result = inspectArchitecture();
  for (const issue of result.issues) console.error(issue);
  console.log(
    `Architecture: ${result.files} source files, ${result.issues.length} violations.`,
  );
  process.exitCode = result.issues.length ? 1 : 0;
}
