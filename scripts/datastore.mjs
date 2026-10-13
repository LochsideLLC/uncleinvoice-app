import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const PROJECT_REF = "pvolllgvujjvteijtnid";
const POOLER = `aws-1-us-east-1.pooler.supabase.com`;

function loadEnvFile() {
  const path = resolve(process.cwd(), ".env");
  let text = "";
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return;
  }
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function connectionCandidates(password) {
  if (password.startsWith("postgres")) return [["pasted-url", password]];
  const encoded = encodeURIComponent(password);
  return [
    [
      "session-pooler-aws-1",
      `postgresql://postgres.${PROJECT_REF}:${encoded}@${POOLER}:5432/postgres?sslmode=require`,
    ],
    [
      "transaction-pooler-aws-1",
      `postgresql://postgres.${PROJECT_REF}:${encoded}@${POOLER}:6543/postgres?sslmode=require`,
    ],
    [
      "session-pooler-aws-0",
      `postgresql://postgres.${PROJECT_REF}:${encoded}@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require`,
    ],
    [
      "direct",
      `postgresql://postgres:${encoded}@db.${PROJECT_REF}.supabase.co:5432/postgres?sslmode=require`,
    ],
  ];
}

function applyDatastorePassword() {
  const password = process.env.DATASTORE_DB_PASSWORD?.trim();
  if (!password) return false;
  const [, url] = connectionCandidates(password)[0];
  process.env.DATABASE_URL = url;
  process.env.DIRECT_URL = url;
  return true;
}

function redact(value) {
  return String(value).replace(/postgresql:\/\/[^@\s]+@/gi, "postgresql://***@");
}

function run(command, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "inherit", "inherit"],
      env: process.env,
      shell: true,
    });
    child.on("exit", (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`${command} exited ${code}`));
    });
  });
}

loadEnvFile();
const usingDatastore = applyDatastorePassword();
if (!usingDatastore) {
  console.error("DATASTORE_DB_PASSWORD is not set in .env");
  process.exit(1);
}

console.log("Using Lochside datastore (uncleinvoice schema). Password is not printed.");

const task = process.argv[2];
if (task === "test") {
  const { PrismaClient } = await import("@prisma/client");
  const password = process.env.DATASTORE_DB_PASSWORD.trim();
  const candidates = connectionCandidates(password);
  let ok = false;
  for (const [name, url] of candidates) {
    process.env.DATABASE_URL = url;
    process.env.DIRECT_URL = url;
    const db = new PrismaClient();
    try {
      const ping = await db.$queryRaw`select current_database() as db, current_user as usr`;
      const schemas = await db.$queryRaw`
        select schema_name
        from information_schema.schemata
        where schema_name not in ('pg_catalog', 'information_schema', 'pg_toast')
        order by schema_name
      `;
      const names = schemas.map((row) => row.schema_name);
      console.log(`Connection: ok (${name})`);
      console.log(`Database: ${ping[0].db}`);
      console.log(`User: ${ping[0].usr}`);
      console.log(`Schemas: ${names.join(", ")}`);
      console.log(
        names.includes("uncleinvoice")
          ? "uncleinvoice schema: present"
          : "uncleinvoice schema: not created yet (run datastore:deploy)",
      );
      ok = true;
      break;
    } catch (error) {
      console.log(`Connection: failed (${name})`);
      console.log(redact(error?.message ?? error).split("\n")[0]);
    } finally {
      await db.$disconnect();
    }
  }
  if (!ok) {
    console.error("None of the datastore connection shapes worked.");
    process.exitCode = 1;
  }
} else {
  const commands = {
    deploy: ["npx", ["prisma", "migrate", "deploy"]],
    "apply-init": [
      "npx",
      [
        "prisma",
        "db",
        "execute",
        "--schema",
        "prisma/schema.prisma",
        "--file",
        "prisma/migrations/20260817205118_init/migration.sql",
      ],
    ],
    "resolve-init": [
      "npx",
      ["prisma", "migrate", "resolve", "--applied", "20260817205118_init"],
    ],
    seed: ["npx", ["tsx", "prisma/seed.ts"]],
    generate: ["npx", ["prisma", "generate"]],
  };

  if (task === "env") {
    const password = process.env.DATASTORE_DB_PASSWORD.trim();
    const [, url] = connectionCandidates(password).find(([name]) => name === "session-pooler-aws-1") ??
      connectionCandidates(password)[0];
    const pairs = [
      ["DATABASE_URL", url],
      ["DIRECT_URL", url],
      ["SESSION_SECRET", process.env.SESSION_SECRET || "<generate one: openssl rand -hex 32>"],
      ["APP_URL", "https://uncleinvoice.com"],
      ["MAIL_FROM", process.env.MAIL_FROM || "Uncle Invoice <noreply@uncleinvoice.com>"],
    ];
    console.log("Production environment variables for the host. These contain the");
    console.log("database password, so treat this output as a secret.\n");
    for (const [name, value] of pairs) console.log(`${name}=${value}`);
    console.log("\nUse the session pooler host above. db.<ref>.supabase.co is IPv6-only");
    console.log("and no serverless function can reach it.");
  } else {

  if (!commands[task]) {
    console.error("Usage: node scripts/datastore.mjs <test|deploy|seed|generate>");
    process.exit(1);
  }

  const [cmd, args] = commands[task];
  await run(cmd, args);
  console.log(`datastore ${task} finished`);
  }
}
