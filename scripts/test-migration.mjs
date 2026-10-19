import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const root = "prisma/migrations";
const migrations = readdirSync(root, { withFileTypes: true })
  .filter((item) => item.isDirectory())
  .map((item) => item.name)
  .sort();
const db = new PGlite();
try {
  for (const migration of migrations.slice(0, -1)) {
    await db.exec(readFileSync(join(root, migration, "migration.sql"), "utf8"));
  }
  await db.exec(`
    INSERT INTO uncleinvoice."User" (id,email,name,"updatedAt")
      VALUES ('legacy-user','legacy@example.test','Legacy',CURRENT_TIMESTAMP);
    INSERT INTO uncleinvoice."Workspace" (id,name,email,"createdById","updatedAt")
      VALUES ('legacy-workspace','Customer','customer@example.test','legacy-user',CURRENT_TIMESTAMP);
    INSERT INTO uncleinvoice."Contractor" (id,"workspaceId",name,"updatedAt")
      VALUES ('legacy-contractor','legacy-workspace','Contractor',CURRENT_TIMESTAMP);
    INSERT INTO uncleinvoice."Invoice" (id,"workspaceId","contractorId",number,status,"issueDate","updatedAt")
      VALUES ('legacy-invoice','legacy-workspace','legacy-contractor','INV-OLD','sent',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
  `);
  await db.exec(readFileSync(join(root, migrations.at(-1), "migration.sql"), "utf8"));

  const legacy = await db.query(
    'SELECT "collectionMode", "onlinePaymentEnabled" FROM uncleinvoice."Invoice" WHERE id = $1',
    ["legacy-invoice"],
  );
  assert.deepEqual(legacy.rows[0], { collectionMode: "documentation", onlinePaymentEnabled: false });

  const tables = await db.query(
    "SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE rowsecurity)::int AS protected FROM pg_tables WHERE schemaname = $1",
    ["uncleinvoice"],
  );
  assert.ok(tables.rows[0].total > 0);
  assert.equal(tables.rows[0].protected, tables.rows[0].total);

  await db.exec(`
    CREATE ROLE invoice_reader;
    GRANT USAGE ON SCHEMA uncleinvoice TO invoice_reader;
    GRANT SELECT ON ALL TABLES IN SCHEMA uncleinvoice TO invoice_reader;
    SET ROLE invoice_reader;
  `);
  const isolated = await db.query('SELECT COUNT(*)::int AS count FROM uncleinvoice."Invoice"');
  assert.equal(isolated.rows[0].count, 0);
  process.stdout.write(`Migration check passed: ${migrations.length} migrations, ${tables.rows[0].total} RLS tables, legacy invoice safe.\n`);
} finally {
  await db.close();
}
