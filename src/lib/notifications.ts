import "server-only";

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { dispatchPushNotification } from "@/lib/push";
import { sendEmail } from "@/lib/mail";
import { hashToken } from "@/lib/crypto";
import { notificationChannels } from "@/lib/notification-policy";

function notificationEmailEnabled() {
  return process.env.NOTIFICATION_EMAIL_ENABLED?.toLowerCase() === "true" &&
    process.env.EMAIL_COST_CAP_CONFIRMED?.toLowerCase() === "true" &&
    process.env.OUTBOUND_EMAIL_ENABLED?.toLowerCase() === "true" &&
    Boolean(process.env.RESEND_API_KEY);
}

async function dispatchNotificationEmail(notification: {
  id: string;
  userId: string;
  invoiceId: string | null;
  title: string;
  body: string;
}) {
  if (!notificationEmailEnabled()) return;
  const user = await db.user.findUnique({ where: { id: notification.userId }, select: { email: true } });
  if (!user) return;
  const destinationHash = hashToken(user.email.toLowerCase());
  let delivery;
  try {
    delivery = await db.notificationDelivery.create({
      data: { notificationId: notification.id, channel: "email", destinationHash, status: "attempting", attemptedAt: new Date() },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return;
    throw error;
  }
  const path = notification.invoiceId ? `/invoices/view/${notification.invoiceId}` : "/app/notifications";
  const link = new URL(path, process.env.APP_URL ?? "http://localhost:3000").toString();
  try {
    await sendEmail({
      to: user.email,
      subject: `Uncle Invoice: ${notification.title}`,
      text: `${notification.body}\n\nView details: ${link}\n\nChange alerts: ${new URL("/app/notifications/settings", process.env.APP_URL ?? "http://localhost:3000")}`,
      link,
    });
    await db.notificationDelivery.update({ where: { id: delivery.id }, data: { status: "delivered", deliveredAt: new Date() } });
  } catch (error) {
    await db.notificationDelivery.update({
      where: { id: delivery.id },
      data: { status: "failed", errorCode: error instanceof Error ? error.message.slice(0, 80) : "send_failed" },
    });
  }
}

export async function createEventNotification(args: {
  userId: string;
  invoiceId: string;
  eventType: string;
  dedupeKey: string;
  title: string;
  body: string;
}) {
  const preference = await db.notificationPreference.findUnique({
    where: { userId_eventType: { userId: args.userId, eventType: args.eventType } },
  });
  const { inApp, push, email } = notificationChannels(args.eventType, preference);
  if (!inApp && !push && !email) return;
  const notification = await db.notification.upsert({
    where: { dedupeKey: args.dedupeKey },
    update: {},
    create: { ...args, inAppVisible: inApp, expiresAt: new Date(Date.now() + 90 * 86400_000) },
  });
  const expired = await db.notification.findMany({
    where: { userId: args.userId, expiresAt: { lt: new Date() } },
    select: { id: true },
    take: 100,
  });
  if (expired.length) {
    await db.notification.deleteMany({ where: { id: { in: expired.map((item) => item.id) } } });
  }
  if (push) {
    try {
      await dispatchPushNotification(notification);
    } catch (error) {
      console.error("Push notification delivery paused", error);
    }
  }
  if (email) await dispatchNotificationEmail(notification);
  return notification;
}
