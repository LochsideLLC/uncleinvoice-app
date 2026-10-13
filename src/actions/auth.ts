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

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

const signupSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  intent: z.enum(["password", "magic"]).default("password"),
});

export type ActionState = { error?: string; ok?: boolean; message?: string } | null;

export async function signupAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password") || undefined,
    intent: formData.get("intent") || "password",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with that email already exists. Sign in instead." };
  }

  if (parsed.data.intent === "magic") {
    const user = await db.user.create({
      data: { email, name: parsed.data.name },
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
      passwordHash: await hashPassword(parsed.data.password),
    },
  });
  await createSession(user.id);
  redirect("/app");
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
    if (user) {
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

  if (!user?.passwordHash) {
    return { error: "That email and password do not match." };
  }
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return { error: "That email and password do not match." };
  }
  await createSession(user.id);
  redirect(safeNext(String(formData.get("next") ?? ""), user.admin));
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
  const link = `${APP_URL}/auth/verify?token=${token}`;
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
  return { to: safeNext("", user.admin) };
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
