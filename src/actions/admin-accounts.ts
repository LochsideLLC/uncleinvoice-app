"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { archiveBlocker, deleteBlocker, requireAdminActor } from "@/lib/admin-accounts";
import { hashPassword } from "@/lib/auth";
import { PLANS, PLAN_LABEL, asPlan } from "@/lib/plan";
import { randomBytes } from "node:crypto";

export type ActionState = { error?: string; ok?: boolean; message?: string } | null;

/**
 * Archiving and deleting accounts, for site admins.
 *
 * Every export of this module is a public POST endpoint, so each action
 * re-checks the *real* signed-in account — never the one being previewed
 * through "view as" — and re-reads the target from the database rather than
 * trusting anything the form said about it. Rendering a disabled button is
 * not a check. Nothing that returns a list of accounts belongs in this file;
 * that lives in @/lib/admin-accounts.
 */
function refresh() {
  revalidatePath("/admin/accounts");
  revalidatePath("/admin/view-as");
}

export async function archiveAccountAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireAdminActor();
  if (!actor) return { error: "Only a site admin can do this." };

  const userId = String(formData.get("userId") ?? "");
  const blocker = await archiveBlocker(actor.id, userId);
  if (blocker) return { error: blocker };

  const [user] = await db.$transaction([
    db.user.update({ where: { id: userId }, data: { archivedAt: new Date() } }),
    // Being archived has to take hold now, not whenever their session runs
    // out, and any link already mailed to them has to stop working.
    db.session.deleteMany({ where: { userId } }),
    db.magicLink.updateMany({ where: { userId, usedAt: null }, data: { usedAt: new Date() } }),
  ]);

  refresh();
  return { ok: true, message: `${user.email} archived. They can no longer sign in.` };
}

export async function restoreAccountAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireAdminActor();
  if (!actor) return { error: "Only a site admin can do this." };

  const userId = String(formData.get("userId") ?? "");
  const target = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, archivedAt: true },
  });
  if (!target) return { error: "That account no longer exists." };
  if (!target.archivedAt) return { error: "That account is not archived." };

  await db.user.update({ where: { id: userId }, data: { archivedAt: null } });
  refresh();
  return {
    ok: true,
    message: `${target.email} restored. Their old password still works; sign-in links sent before archiving do not.`,
  };
}

export async function deleteAccountAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireAdminActor();
  if (!actor) return { error: "Only a site admin can do this." };

  const userId = String(formData.get("userId") ?? "");
  const typed = String(formData.get("confirmEmail") ?? "")
    .trim()
    .toLowerCase();

  const target = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });
  if (!target) return { error: "That account no longer exists." };
  if (typed !== target.email.toLowerCase()) {
    return { error: `Type ${target.email} exactly to confirm.` };
  }

  const blocker = await deleteBlocker(actor.id, userId);
  if (blocker) return { error: blocker };

  await db.$transaction([
    db.magicLink.deleteMany({ where: { userId } }),
    // Contractor.userId has no foreign key, so it would otherwise point at a
    // row that is gone.
    db.contractor.updateMany({ where: { userId }, data: { userId: null } }),
    db.user.delete({ where: { id: userId } }),
  ]);

  refresh();
  return { ok: true, message: `${target.email} deleted for good.` };
}

/**
 * Create a login on someone else's behalf.
 *
 * The temporary password is shown to the admin once and never again — only
 * its hash is stored — and `mustSetPassword` makes the new account replace it
 * before it can do anything else, so a password a third party knows has a
 * short life.
 */
export async function createAccountAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireAdminActor();
  if (!actor) return { error: "Only a site admin can do this." };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const plan = asPlan(String(formData.get("plan") ?? "free"));
  const typed = String(formData.get("password") ?? "");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid email." };
  }
  if (!name) return { error: "Give the account a name." };
  if (typed && typed.length < 8) {
    return { error: "A temporary password must be at least 8 characters." };
  }

  const existing = await db.user.findUnique({ where: { email }, select: { archivedAt: true } });
  if (existing) {
    return {
      error: existing.archivedAt
        ? "An archived account already uses that email. Restore it instead."
        : "An account with that email already exists.",
    };
  }

  // Random unless the admin typed one, so the common path never invents a
  // password a human would guess.
  const password = typed || randomBytes(9).toString("base64url");
  const user = await db.user.create({
    data: {
      email,
      name,
      plan,
      planSetAt: plan === "free" ? null : new Date(),
      passwordHash: await hashPassword(password),
      mustSetPassword: true,
    },
    select: { email: true },
  });

  refresh();
  return {
    ok: true,
    message: `${user.email} created on the ${PLAN_LABEL[plan]} plan. Temporary password: ${password} — copy it now, it is not shown again. They must change it at first sign-in.`,
  };
}

/** Set someone's tier by hand, while there is no checkout. */
export async function setPlanAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireAdminActor();
  if (!actor) return { error: "Only a site admin can do this." };

  const userId = String(formData.get("userId") ?? "");
  const raw = String(formData.get("plan") ?? "");
  if (!(PLANS as readonly string[]).includes(raw)) return { error: "Unknown plan." };
  const plan = asPlan(raw);

  const target = await db.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!target) return { error: "That account no longer exists." };

  await db.user.update({
    where: { id: userId },
    data: { plan, planSetAt: plan === "free" ? null : new Date() },
  });
  refresh();
  return { ok: true, message: `${target.email} is now on the ${PLAN_LABEL[plan]} plan.` };
}
