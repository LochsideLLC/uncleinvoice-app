import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const dir = await mkdtemp(join(tmpdir(), "uncleinvoice-phone-tests-"));
try {
  const outfile = join(dir, "tests.cjs");
  await build({
    entryPoints: ["tests/phone.test.ts"],
    outfile,
    bundle: true,
    platform: "node",
    format: "cjs",
  });
  const result = spawnSync(process.execPath, ["--test", outfile], {
    cwd: process.cwd(),
    stdio: "inherit",
  });
  process.exitCode = result.status ?? 1;
} finally {
  await rm(dir, { recursive: true, force: true });
}
