import { PrismaClient } from "@prisma/client";

const email = "test@bookkeepingconroe.com";
const databaseUrl = process.env.DATABASE_URL ?? "";
let host;
try {
  host = new URL(databaseUrl).hostname;
} catch {
  throw new Error("Set DATABASE_URL to the local demo database first.");
}
if (!["localhost", "127.0.0.1", "::1", "db", "postgres"].includes(host)) {
  throw new Error("Refusing to prepare a demo login on a remote database.");
}

const db = new PrismaClient();
try {
  const workspace = await db.workspace.findUnique({ where: { id: "demo-sunrise" } });
  if (!workspace) throw new Error("Seed the local demo database first.");
  const user = await db.user.upsert({
    where: { email },
    create: {
      email,
      name: "Local Demo Bookkeeper",
      workspaceKind: "bookkeeper",
      bookkeeperOnboardedAt: new Date(),
      admin: false,
    },
    update: {
      name: "Local Demo Bookkeeper",
      workspaceKind: "bookkeeper",
      bookkeeperOnboardedAt: new Date(),
      admin: false,
      archivedAt: null,
      passwordHash: null,
    },
  });
  await db.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
    create: { workspaceId: workspace.id, userId: user.id, role: "bookkeeper" },
    update: { role: "bookkeeper" },
  });
  console.log(`Prepared local demo access for ${email}.`);
} finally {
  await db.$disconnect();
}
