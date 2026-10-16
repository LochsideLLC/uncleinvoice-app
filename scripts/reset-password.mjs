/**
 * Set a user's password from the command line.
 *
 * Seeded passwords are random and only the bcrypt hash is stored, so a
 * forgotten one cannot be read back — it can only be replaced.
 *
 * Usage: node --env-file=.env scripts/reset-password.mjs <email> <password>
 *
 * This writes to whatever DATABASE_URL points at, which is the live datastore.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.error("usage: node --env-file=.env scripts/reset-password.mjs <email> <password>");
  process.exit(1);
}

const db = new PrismaClient();
try {
  const user = await db.user.update({
    where: { email },
    data: { passwordHash: await bcrypt.hash(password, 12) },
    select: { email: true, admin: true },
  });
  console.log(`Password set for ${user.email}${user.admin ? " (admin)" : ""}.`);
} catch (error) {
  console.error(error.code === "P2025" ? `No user with email ${email}.` : error.message);
  process.exit(1);
} finally {
  await db.$disconnect();
}
