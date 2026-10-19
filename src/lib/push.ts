import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { Prisma, type Notification } from "@prisma/client";
import webpush from "web-push";
import { db } from "@/lib/db";
import { cappedInteger, consumeDailyLimit } from "@/lib/usage-limits";

type BrowserSubscription = { endpoint: string; keys: { p256dh: string; auth: string } };

export function pushEnabled() {
  return process.env.PUSH_NOTIFICATIONS_ENABLED?.toLowerCase() === "true";
}

function encryptionKey() {
  const key = Buffer.from(process.env.PUSH_SUBSCRIPTION_ENCRYPTION_KEY ?? "", "base64");
  if (key.length !== 32) throw new Error("Push subscription encryption key is missing or invalid");
  return key;
}

function vapidDetails() {
  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!subject?.startsWith("mailto:") || !publicKey || !privateKey) {
    throw new Error("Push VAPID keys are not configured");
  }
  return { subject, publicKey, privateKey };
}

const PUSH_HOSTS = [
  "fcm.googleapis.com",
  "updates.push.services.mozilla.com",
  "web.push.apple.com",
  "push.apple.com",
  "notify.windows.com",
];

export function parseBrowserSubscription(raw: unknown): BrowserSubscription {
  if (!raw || typeof raw !== "object") throw new Error("Invalid push subscription");
  const value = raw as Partial<BrowserSubscription>;
  if (typeof value.endpoint !== "string" || value.endpoint.length > 2048) {
    throw new Error("Invalid push endpoint");
  }
  const endpoint = new URL(value.endpoint);
  const host = endpoint.hostname.toLowerCase();
  if (
    endpoint.protocol !== "https:" || endpoint.username || endpoint.password ||
    (endpoint.port && endpoint.port !== "443") ||
    !PUSH_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))
  ) {
    throw new Error("Push service is not supported");
  }
  if (
    typeof value.keys?.auth !== "string" ||
    typeof value.keys.p256dh !== "string" ||
    !/^[A-Za-z0-9_-]{10,300}$/.test(value.keys.auth) ||
    !/^[A-Za-z0-9_-]{40,300}$/.test(value.keys.p256dh)
  ) {
    throw new Error("Invalid push encryption keys");
  }
  return { endpoint: endpoint.toString(), keys: { auth: value.keys.auth, p256dh: value.keys.p256dh } };
}

function endpointHash(endpoint: string) {
  return createHash("sha256").update(endpoint).digest("hex");
}

function encryptSubscription(subscription: BrowserSubscription) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(subscription), "utf8"), cipher.final()]);
  return { subscriptionCiphertext: ciphertext, encryptionIv: iv, encryptionTag: cipher.getAuthTag() };
}

function decryptSubscription(record: {
  subscriptionCiphertext: Uint8Array;
  encryptionIv: Uint8Array;
  encryptionTag: Uint8Array;
}) {
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), record.encryptionIv);
  decipher.setAuthTag(Buffer.from(record.encryptionTag));
  const plain = Buffer.concat([
    decipher.update(record.subscriptionCiphertext),
    decipher.final(),
  ]).toString("utf8");
  return parseBrowserSubscription(JSON.parse(plain));
}

export async function savePushSubscription(userId: string, raw: unknown) {
  if (!pushEnabled()) throw new Error("Push notifications are paused");
  vapidDetails();
  encryptionKey();
  const subscription = parseBrowserSubscription(raw);
  const hash = endpointHash(subscription.endpoint);
  const existing = await db.pushSubscription.findUnique({ where: { endpointHash: hash } });
  if (existing && existing.userId !== userId) throw new Error("This device is linked to another account");
  if (!existing) {
    const count = await db.pushSubscription.count({ where: { userId, invalidAt: null } });
    if (count >= 5) throw new Error("Remove an old device before adding another");
  }
  const encrypted = encryptSubscription(subscription);
  await db.pushSubscription.upsert({
    where: { endpointHash: hash },
    update: { ...encrypted, invalidAt: null },
    create: { userId, endpointHash: hash, ...encrypted },
  });
}

export async function removePushSubscription(userId: string, raw: unknown) {
  const subscription = parseBrowserSubscription(raw);
  await db.pushSubscription.deleteMany({ where: { userId, endpointHash: endpointHash(subscription.endpoint) } });
}

export async function dispatchPushNotification(notification: Notification) {
  if (!pushEnabled()) return;
  const details = vapidDetails();
  encryptionKey();
  const subscriptions = await db.pushSubscription.findMany({
    where: { userId: notification.userId, invalidAt: null },
    take: 5,
  });
  for (const subscription of subscriptions) {
    let delivery;
    try {
      delivery = await db.notificationDelivery.create({
        data: {
          notificationId: notification.id,
          channel: "push",
          destinationHash: subscription.endpointHash,
          status: "attempting",
          attemptedAt: new Date(),
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue;
      throw error;
    }
    const globalAllowed = await consumeDailyLimit({
      operation: "push_send",
      scope: "global",
      scopeKey: "all",
      limit: cappedInteger(process.env.PUSH_GLOBAL_DAILY_LIMIT, 500, 500),
    });
    const userAllowed = globalAllowed && await consumeDailyLimit({
      operation: "push_send",
      scope: "user",
      scopeKey: notification.userId,
      limit: cappedInteger(process.env.PUSH_PER_USER_DAILY_LIMIT, 30, 30),
    });
    if (!userAllowed) {
      await db.notificationDelivery.update({ where: { id: delivery.id }, data: { status: "quota" } });
      continue;
    }
    try {
      await webpush.sendNotification(
        decryptSubscription(subscription),
        JSON.stringify({
          title: "Uncle Invoice",
          body: `${notification.title}: ${notification.body}`.slice(0, 220),
          url: notification.invoiceId ? `/invoices/view/${notification.invoiceId}` : "/app/notifications",
          tag: notification.dedupeKey,
        }),
        { vapidDetails: details, TTL: 3600, timeout: 5000 },
      );
      await db.notificationDelivery.update({
        where: { id: delivery.id },
        data: { status: "delivered", deliveredAt: new Date() },
      });
    } catch (error) {
      const statusCode = typeof error === "object" && error && "statusCode" in error
        ? Number(error.statusCode)
        : 0;
      await db.notificationDelivery.update({
        where: { id: delivery.id },
        data: { status: "failed", errorCode: statusCode ? String(statusCode) : "send_failed" },
      });
      if (statusCode === 404 || statusCode === 410) {
        await db.pushSubscription.delete({ where: { id: subscription.id } });
      }
    }
  }
}
