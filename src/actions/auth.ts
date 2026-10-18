"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  createSession,
  destroySession,
  hashPassword,
  safeNext,
  verifyPassword,
} from "@/lib/auth";
import { createToken, hashToken } from "@/lib/crypto";
import { sendEmail } from "@/lib/mail";
import { ACCOUNT_TYPES } from "@/lib/account-type";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

const signupSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  intent: z.enum(["password", "magic"]).default("password"),
  accountType: z.enum(ACCOUNT_TYPES).default("other"),
});

export type ActionState = { error?: string; ok?: boolean; message?: string } | null;

/**
 * What every sign-in route says to an archived account.
 *
 * Deliberately the same wording the wrong-password path uses, so the form
 * cannot be used to work out which accounts an admin has archived.
 */
const ARCHIVED_MESSAGE = "That email and password do not match.";

function isArchived(user: { archivedAt: Date | null } | null) {
  return Boolean(user?.archivedAt);
}

export async function signupAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password") || undefined,
    intent: formData.get("intent") || "password",
    accountType: formData.get("accountType") || "other",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    // Same answer for an archived account as a live one. Signing up is not a
    // way to find out that an address was archived, nor to resurrect it.
    return { error: "An account with that email already exists. Sign in instead." };
  }

  if (parsed.data.intent === "magic") {
    const user = await db.user.create({
      data: { email, name: parsed.data.name, accountType: parsed.data.accountType },
    });
    const link = await sendLoginLink(user.email, user.id);
    return {
      ok: true,
      message: process.env.RESEND_API_KEY
        ? "Check your email for a sign-in link."
        : `No email provider is configured, so here is your sign-in link: ${link}`,
    };
  }

  if (!parsed.data.password) {
    return { error: "Choose a password, or use a sign-in link instead." };
  }

  const user = await db.user.create({
    data: {
      email,
      name: parsed.data.name,
      accountType: parsed.data.accountType,
      passwordHash: await hashPassword(parsed.data.password),
    },
  });
  await createSession(user.id);
  redirect(parsed.data.accountType === "bookkeeper" ? "/app/plans?welcome=bookkeeper" : "/app");
}

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const intent = String(formData.get("intent") ?? "password");

  if (!email) return { error: "Email is required." };

  const user = await db.user.findUnique({ where: { email } });

  if (intent === "magic") {
    if (user && !isArchived(user)) {
      const link = await sendLoginLink(user.email, user.id);
      if (!process.env.RESEND_API_KEY) {
        return { ok: true, message: `No email provider is configured, so here is your sign-in link: ${link}` };
      }
    }
    return {
      ok: true,
      message: "If that email is on file, a sign-in link is on the way.",
    };
  }

  if (!user?.passwordHash || isArchived(user)) {
    return { error: ARCHIVED_MESSAGE };
  }
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return { error: "That email and password do not match." };
  }
  await createSession(user.id);
  redirect(safeNext(String(formData.get("next") ?? "")));
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

export async function requestMagicLinkAction(email: string, userId?: string) {
  await sendLoginLink(email, userId);
}

async function sendLoginLink(email: string, userId?: string) {
  const token = createToken();
  await db.magicLink.create({
    data: {
      tokenHash: hashToken(token),
      purpose: "login",
      email,
      userId,
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
    },
  });
  const link = `${APP_URL}/auth/verify/${token}`;
  await sendEmail({
    to: email,
    subject: "Your Uncle Invoice sign-in link",
    link,
    text: `Sign in to Uncle Invoice:\n\n${link}\n\nThis link expires in 2 hours.`,
  });
  return link;
}

export async function consumeLoginToken(token: string) {
  const record = await db.magicLink.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!record || record.purpose !== "login" || record.usedAt || record.expiresAt < new Date()) {
    return { error: "This sign-in link is invalid or has expired." };
  }

  let user = record.userId
    ? await db.user.findUnique({ where: { id: record.userId } })
    : await db.user.findUnique({ where: { email: record.email } });

  // A link mailed out before the account was archived is dead on arrival.
  if (isArchived(user)) {
    await db.magicLink.update({ where: { id: record.id }, data: { usedAt: new Date() } });
    return { error: "This sign-in link is invalid or has expired." };
  }

  if (!user) {
    user = await db.user.create({
      data: { email: record.email, name: record.email.split("@")[0] ?? "User" },
    });
  }

  await db.magicLink.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });
  await createSession(user.id);
  // Returns the destination rather than redirecting. The caller is the
  // /auth/verify route handler, which builds its own clean redirect: a
  // relative redirect from here would keep the request's query string, and
  // that query string contains the sign-in token.
  return { to: safeNext("") };
}

export async function setPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || password.length < 8) {
    return { error: "Use a real email and a password of at least 8 characters." };
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    if (isArchived(existing)) {
      // Claiming an archived address must not hand the account back.
      return { error: "This email cannot be used. Ask whoever set it up." };
    }
    if (existing.passwordHash) {
      return { error: "This email already has a password. Sign in instead." };
    }
    await db.user.update({
      where: { id: existing.id },
      data: {
        passwordHash: await hashPassword(password),
        name: name || existing.name,
      },
    });
    await db.contractor.updateMany({
      where: { email, userId: null },
      data: { userId: existing.id },
    });
    await createSession(existing.id);
    redirect("/app");
  }

  const user = await db.user.create({
    data: {
      email,
      name: name || email.split("@")[0] || "Contractor",
      accountType: "contractor",
      passwordHash: await hashPassword(password),
    },
  });
  await db.contractor.updateMany({
    where: { email, userId: null },
    data: { userId: user.id },
  });
  await createSession(user.id);
  redirect("/app");
}

/**
 * "I forgot my password."
 *
 * Deliberately separate from the magic sign-in link above. That one signs you
 * in and leaves you on /app still not knowing your password; this one ends on
 * a form that sets a new one. The two use the same MagicLink table, told apart
 * by `purpose`, so a sign-in link cannot be replayed against the reset form or
 * the other way round.
 *
 * The reply never says whether the address is on file. Anything that answers
 * that question turns this form into a way to test which of your clients has
 * an account here.
 */
export async function requestPasswordResetAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email) return { error: "Email is required." };

  const neutral: ActionState = {
    ok: true,
    message: "If that email is on file, a link to choose a new password is on the way.",
  };

  const user = await db.user.findUnique({ where: { email } });
  if (!user || isArchived(user)) return neutral;

  const token = createToken();
  await db.magicLink.create({
    data: {
      tokenHash: hashToken(token),
      purpose: "reset",
      email: user.email,
      userId: user.id,
      // An hour, against the sign-in link's two. A reset link is worth more:
      // it does not just open the account, it changes the lock.
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  const link = `${APP_URL}/auth/reset/${token}`;
  await sendEmail({
    to: user.email,
    subject: "Choose a new Uncle Invoice password",
    link,
    text:
      `Someone asked to reset the password for this Uncle Invoice account.\n\n${link}\n\n` +
      "This link expires in 1 hour and can only be used once. " +
      "If it was not you, ignore this email — nothing has changed.",
  });

  if (!process.env.RESEND_API_KEY) {
    return { ok: true, message: `No email provider is configured, so here is your reset link: ${link}` };
  }
  return neutral;
}

/**
 * Look a reset token up without spending it, so the page behind the link can
 * decide between showing the form and saying the link is no good.
 */
export async function findResetToken(token: string) {
  if (!token) return null;
  // MagicLink carries userId but has no `user` relation in the schema, so the
  // account is looked up separately rather than included.
  const record = await db.magicLink.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (
    !record ||
    record.purpose !== "reset" ||
    record.usedAt ||
    record.expiresAt < new Date() ||
    !record.userId
  ) {
    return null;
  }
  const user = await db.user.findUnique({
    where: { id: record.userId },
    select: { email: true, archivedAt: true },
  });
  if (!user || user.archivedAt) return null;
  return { email: user.email };
}

export async function resetPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  // Re-checked here rather than trusted from the page that rendered the form.
  // The form is a POST endpoint like any other and can be called directly.
  const record = token
    ? await db.magicLink.findUnique({ where: { tokenHash: hashToken(token) } })
    : null;
  if (
    !record ||
    record.purpose !== "reset" ||
    record.usedAt ||
    record.expiresAt < new Date() ||
    !record.userId
  ) {
    return { error: "This reset link is invalid or has expired. Ask for a new one." };
  }
  // Archived between the link being sent and the form being submitted.
  const owner = await db.user.findUnique({
    where: { id: record.userId },
    select: { archivedAt: true },
  });
  if (isArchived(owner)) {
    await db.magicLink.update({ where: { id: record.id }, data: { usedAt: new Date() } });
    return { error: "This reset link is invalid or has expired. Ask for a new one." };
  }

  await db.$transaction([
    db.user.update({
      where: { id: record.userId },
      data: { passwordHash: await hashPassword(password), mustSetPassword: false },
    }),
    // Whoever held the old password is signed out everywhere. A reset that
    // leaves their session alive has not actually taken the account back.
    db.session.deleteMany({ where: { userId: record.userId } }),
    db.magicLink.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    // Any other reset link still outstanding for this account is spent too,
    // so an older email sitting in an inbox cannot undo this one.
    db.magicLink.updateMany({
      where: { userId: record.userId, purpose: "reset", usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);

  await createSession(record.userId);
  redirect("/app");
}
