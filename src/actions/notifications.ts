"use server";

import { revalidatePath } from "next/cache";
import { getRealSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { NOTIFICATION_EVENT_TYPES, TIME_ZONES } from "@/lib/notification-policy";

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

export async function updateNotificationPreferencesAction(formData: FormData) {
  const user = await getRealSessionUser();
  if (!user) return;
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
}

export async function updateTimeZoneAction(formData: FormData) {
  const user = await getRealSessionUser();
  if (!user) return;
  const timeZone = String(formData.get("timeZone") ?? "");
  if (!TIME_ZONES.some((allowed) => allowed === timeZone)) return;
  await db.user.update({ where: { id: user.id }, data: { timeZone } });
  revalidatePath("/app/notifications/settings");
}
