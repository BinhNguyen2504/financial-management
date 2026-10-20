// Run maintenance scripts against the same domain code as the application.
import { register } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const entry = process.argv[2];
if (!entry) throw new Error("Provide a TypeScript maintenance script.");
register(new URL("./lib/typescript-loader.mjs", import.meta.url));
process.argv.splice(1, 1);
await import(pathToFileURL(resolve(entry)).href);
