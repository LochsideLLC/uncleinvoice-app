import Link from "next/link";
import { redirect } from "next/navigation";
import { getRealSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/dates";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/actions/notifications";

export const metadata = { title: "Notifications — Uncle Invoice" };

export default async function NotificationsPage() {
  const user = await getRealSessionUser();
  if (!user) redirect("/login?next=/app/notifications");
  const notifications = await db.notification.findMany({
    where: { userId: user.id, inAppVisible: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const unread = notifications.filter((item) => !item.readAt).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-widest text-muted">Account</p>
          <h1 className="mt-1 text-3xl">Notifications</h1>
        </div>
        <Link href="/app/notifications/settings" className="btn btn-ghost">Settings</Link>
      </div>
      {unread ? (
        <form action={markAllNotificationsReadAction}>
          <button className="text-sm text-muted underline" type="submit">Mark all as read</button>
        </form>
      ) : null}
      {notifications.length ? (
        <ul className="paper overflow-hidden rounded-3xl">
          {notifications.map((item) => (
            <li key={item.id} className={`border-t border-line p-5 first:border-t-0 ${item.readAt ? "" : "bg-paper-2"}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="mt-1 text-sm text-muted">{item.body}</p>
                  <p className="mt-2 text-xs text-muted">{formatDateTime(item.createdAt, user.timeZone)}</p>
                </div>
                {!item.readAt ? (
                  <form action={markNotificationReadAction}>
                    <input type="hidden" name="id" value={item.id} />
                    <button className="text-sm underline" type="submit">Read</button>
                  </form>
                ) : null}
              </div>
              {item.invoiceId ? <Link href={`/invoices/view/${item.invoiceId}`} className="mt-3 inline-block text-sm underline">Open invoice</Link> : null}
            </li>
          ))}
        </ul>
      ) : (
        <div className="paper rounded-3xl p-8"><p>No notifications yet.</p></div>
      )}
    </div>
  );
}
