import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createToken, hashToken } from "@/lib/crypto";

const SESSION_COOKIE = "ir_session";
export const VIEW_AS_COOKIE = "ir_view_as";
const SESSION_DAYS = 30;

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string) {
  const token = createToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
    },
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  jar.delete(SESSION_COOKIE);
}

/**
 * The account actually signed in, ignoring any "view as" in effect.
 * Anything deciding whether an action is permitted must use this.
 */
export async function getRealSessionUser() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await db.session.delete({ where: { id: session.id } }).catch(() => undefined);
    }
    return null;
  }
  return session.user;
}

/**
 * The account whose data the page should show.
 *
 * For a site admin with "view as" switched on, this is the account being
 * previewed; for everyone else it is simply who is signed in. The cookie is
 * honoured only when the real session belongs to an admin, so setting it by
 * hand gets a non-admin nothing.
 */
export async function getSessionUser() {
  const real = await getRealSessionUser();
  if (!real) return null;
  if (!real.admin) return real;

  const jar = await cookies();
  const viewAs = jar.get(VIEW_AS_COOKIE)?.value;
  if (!viewAs || viewAs === real.id) return real;

  const target = await db.user.findUnique({ where: { id: viewAs } });
  return target ?? real;
}

/**
 * Who is being previewed, if anyone. Drives the banner.
 */
export async function getViewAs() {
  const real = await getRealSessionUser();
  if (!real?.admin) return null;
  const jar = await cookies();
  const viewAs = jar.get(VIEW_AS_COOKIE)?.value;
  if (!viewAs || viewAs === real.id) return null;
  const target = await db.user.findUnique({
    where: { id: viewAs },
    select: { id: true, name: true, email: true },
  });
  return target ? { admin: { id: real.id, name: real.name }, target } : null;
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  // Deliberately the real account: an admin previewing a contractor must not
  // lose the way back into the admin area.
  const user = await getRealSessionUser();
  if (!user) redirect("/login");
  if (!user.admin) redirect("/app");
  return user;
}

/**
 * Where to land after signing in.
 *
 * Everyone lands on /app. Site admins used to be sent to /admin, which is the
 * sponsor editor and has nothing to do with their own clients and invoices —
 * signing in dropped them somewhere they had not asked to go. /admin is still
 * one click away in the header for those who have it.
 */
export function safeNext(raw: string) {
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/app";
}

export { SESSION_COOKIE };
