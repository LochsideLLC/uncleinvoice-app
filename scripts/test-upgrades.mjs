import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";

// Bundle real actions and pages against an in-memory database. Never reads .env.
const dir = await mkdtemp(join(tmpdir(), "uncleinvoice-upgrade-tests-"));
try {
  const outfile = join(dir, "tests.cjs");
  await build({ entryPoints: ["tests/upgrades.test.tsx"], outfile, bundle: true, platform: "node", format: "cjs", jsx: "automatic", plugins: [{
    name: "isolated-data",
    setup(build) {
      const replacements = { "@/lib/db": "upgrade-data.ts", "@/lib/auth": "upgrade-auth.ts", "next/navigation": "upgrade-navigation.ts" };
      build.onResolve({ filter: /^(?:@\/lib\/(?:db|auth)|next\/navigation)$/ }, ({ path }) => ({ path: resolve("tests/fixtures", replacements[path]) }));
      build.onResolve({ filter: /^next\/link$/ }, () => ({ path: "link", namespace: "test" }));
      build.onResolve({ filter: /^server-only$/ }, () => ({ path: "server-only", namespace: "test" }));
      build.onResolve({ filter: /^next\/cache$/ }, () => ({ path: "cache", namespace: "test" }));
      build.onLoad({ filter: /.*/, namespace: "test" }, ({ path }) => ({
        contents: path === "server-only" ? "" : path === "cache" ? "export function revalidatePath() {}" : 'import { createElement } from "react"; export default function Link(props) { return createElement("a", props); }',
        resolveDir: process.cwd(),
      }));
    },
  }] });
  const result = spawnSync(process.execPath, ["--test", outfile], { stdio: "inherit" });
  process.exitCode = result.status ?? 1;
} finally { await rm(dir, { recursive: true, force: true }); }
