"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getRealSessionUser, VIEW_AS_COOKIE } from "@/lib/auth";

/**
 * Lets a site admin look at the product as another account sees it.
 *
 * Both actions check the *real* signed-in account, never the previewed one,
 * so a preview can never be used to widen its own permissions.
 */
export async function startViewAsAction(formData: FormData) {
  const admin = await getRealSessionUser();
  if (!admin?.admin) redirect("/app");

  const userId = String(formData.get("userId") ?? "");
  const target = await db.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!target) redirect("/admin/view-as");

  const jar = await cookies();
  jar.set(VIEW_AS_COOKIE, target.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60,
  });
  redirect("/app");
}

export async function stopViewAsAction() {
  const admin = await getRealSessionUser();
  const jar = await cookies();
  jar.delete(VIEW_AS_COOKIE);
  redirect(admin?.admin ? "/admin/view-as" : "/app");
}
