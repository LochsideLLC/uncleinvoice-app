import { build } from "esbuild";
import { createServer } from "node:http";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

// Isolated visual fixture, not an application route. All identities and records are synthetic.
const result = await build({ entryPoints: ["tests/fixtures/upgrade-browser.tsx"], bundle: true, write: false, platform: "browser", format: "esm", jsx: "automatic", define: { "process.env.NODE_ENV": '"development"' }, plugins: [{
  name: "isolated-browser",
  setup(build) {
    build.onResolve({ filter: /^@\/lib\/auth$/ }, () => ({ path: resolve("tests/fixtures/upgrade-auth.ts") }));
    build.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: resolve("tests/fixtures/upgrade-navigation.ts") }));
    build.onResolve({ filter: /^next\/link$/ }, () => ({ path: "link", namespace: "stub" }));
    build.onResolve({ filter: /^@\/actions\// }, () => ({ path: "actions", namespace: "stub" }));
    build.onLoad({ filter: /.*/, namespace: "stub" }, ({ path }) => ({ contents: path === "link" ? 'import {createElement} from "react"; export default function Link(props) {return createElement("a", props)}' : 'export async function logoutAction() {throw new Error("No actions in visual fixture")}', resolveDir: process.cwd() }));
    build.onResolve({ filter: /^@\/lib\/db$/ }, () => { throw new Error("Database dependency forbidden in browser fixture"); });
  },
}] });
const files = await readdir(".next/static/chunks");
const css = (await Promise.all(files.filter((file) => file.endsWith(".css")).map((file) => readFile(`.next/static/chunks/${file}`, "utf8")))).join("\n");
const server = createServer(async (request, response) => {
  if (request.url === "/fixture.js") { response.setHeader("Content-Type", "text/javascript"); response.end(result.outputFiles[0].text); }
  else if (request.url === "/fixture.css") { response.setHeader("Content-Type", "text/css"); response.end(css); }
  else if (/^\/media\/[a-zA-Z0-9._-]+\.woff2$/.test(request.url ?? "")) {
    try { response.setHeader("Content-Type", "font/woff2"); response.end(await readFile(`.next/static${request.url}`)); }
    catch { response.statusCode = 404; response.end(); }
  }
  else { response.setHeader("Content-Type", "text/html"); response.end('<!doctype html><html lang="en" style="--font-display:Fraunces;--font-ui:Source Sans 3"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"><title>Isolated upgrade review</title></head><body><div id="root"></div><script type="module" src="/fixture.js"></script></body></html>'); }
});
server.listen(3317, "127.0.0.1", () => console.log("Synthetic upgrade preview: http://127.0.0.1:3317"));
