"use server";

import { revalidatePath } from "next/cache";
import { getRealSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { NOTIFICATION_EVENT_TYPES, TIME_ZONES } from "@/lib/notification-policy";
import type { ActionState } from "@/actions/auth";

export async function markNotificationReadAction(formData: FormData) {
  const user = await getRealSessionUser();
  if (!user) return;
  const id = String(formData.get("id") ?? "");
  await db.notification.updateMany({ where: { id, userId: user.id, inAppVisible: true }, data: { readAt: new Date() } });
  revalidatePath("/app/notifications");
}

export async function markAllNotificationsReadAction() {
  const user = await getRealSessionUser();
  if (!user) return;
  await db.notification.updateMany({ where: { userId: user.id, inAppVisible: true, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/app/notifications");
}

export async function updateNotificationPreferencesAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getRealSessionUser();
  if (!user) return { error: "Please sign in again." };
  await db.$transaction(
    NOTIFICATION_EVENT_TYPES.map((eventType) =>
      db.notificationPreference.upsert({
        where: { userId_eventType: { userId: user.id, eventType } },
        update: {
          inApp: formData.get(`${eventType}:inApp`) === "on",
          push: formData.get(`${eventType}:push`) === "on",
          email: formData.get(`${eventType}:email`) === "on",
        },
        create: {
          userId: user.id,
          eventType,
          inApp: formData.get(`${eventType}:inApp`) === "on",
          push: formData.get(`${eventType}:push`) === "on",
          email: formData.get(`${eventType}:email`) === "on",
        },
      }),
    ),
  );
  revalidatePath("/app/notifications/settings");
  return { ok: true };
}

export async function updateTimeZoneAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getRealSessionUser();
  if (!user) return { error: "Please sign in again." };
  const timeZone = String(formData.get("timeZone") ?? "");
  if (!TIME_ZONES.some((allowed) => allowed === timeZone)) return { error: "Choose a valid time zone." };
  await db.user.update({ where: { id: user.id }, data: { timeZone } });
  revalidatePath("/app/notifications/settings");
  return { ok: true };
}
