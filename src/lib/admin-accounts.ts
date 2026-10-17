import { db } from "@/lib/db";
import { getRealSessionUser } from "@/lib/auth";

/**
 * Reading and vetting accounts for the admin screen.
 *
 * Deliberately NOT in a "use server" module. Every export of such a module
 * becomes a callable POST endpoint, and this one returns every account's
 * email — so as a Server Action it would have been a public list of everyone
 * who has an account here. It lives in lib/ and is called during render.
 *
 * It also does its own admin check instead of taking the caller's word for
 * who is asking.
 */
export async function requireAdminActor() {
  const actor = await getRealSessionUser();
  if (!actor?.admin) return null;
  return actor;
}

/**
 * The checks an account has to pass before an admin may archive it.
 *
 * Kept separate from the action so the page can grey out a button for the
 * same reasons the action would refuse, and say which reason applies.
 */
export async function archiveBlocker(actorId: string, userId: string) {
  if (actorId === userId) return "You cannot archive your own account.";
  const target = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, admin: true, archivedAt: true },
  });
  if (!target) return "That account no longer exists.";
  if (target.archivedAt) return "That account is already archived.";
  if (target.admin) {
    // Archiving every admin would lock everyone out of the admin area, and
    // nothing in the product could undo it.
    const liveAdmins = await db.user.count({ where: { admin: true, archivedAt: null } });
    if (liveAdmins <= 1) return "That is the last active admin. Make someone else an admin first.";
  }
  return null;
}

/**
 * Why an account cannot be deleted, or null if it can.
 *
 * Deleting is only ever allowed for an account that owns nothing. The
 * database already refuses to delete a workspace's creator — Workspace
 * .createdById is ON DELETE RESTRICT — so without this the admin would get a
 * raw foreign-key error instead of a sentence explaining the problem.
 */
export async function deleteBlocker(actorId: string, userId: string) {
  if (actorId === userId) return "You cannot delete your own account.";
  const target = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      admin: true,
      createdWorkspaces: { select: { name: true } },
      _count: { select: { memberships: true, seededInvoices: true } },
    },
  });
  if (!target) return "That account no longer exists.";
  if (target.admin) return "Remove this account's admin rights before deleting it.";

  if (target.createdWorkspaces.length) {
    const names = target.createdWorkspaces.map((w) => w.name).join(", ");
    return `This account created ${names}, along with the invoices in it. Archive it instead.`;
  }
  if (target._count.memberships) {
    return "This account still belongs to a client. Remove it from that client first, or archive it.";
  }
  if (target._count.seededInvoices) {
    return "This account created invoices that still exist. Archive it instead.";
  }
  return null;
}

/** Everything the accounts page needs, including why a button is disabled. */
export async function listAccountsForAdmin() {
  const actor = await requireAdminActor();
  if (!actor) return null;

  const users = await db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      admin: true,
      archivedAt: true,
      createdAt: true,
      plan: true,
      mustSetPassword: true,
      _count: { select: { memberships: true } },
    },
    orderBy: [{ archivedAt: "asc" }, { admin: "desc" }, { email: "asc" }],
  });

  return Promise.all(
    users.map(async (user) => ({
      ...user,
      isSelf: user.id === actor.id,
      archiveBlocker: await archiveBlocker(actor.id, user.id),
      deleteBlocker: await deleteBlocker(actor.id, user.id),
    })),
  );
}
