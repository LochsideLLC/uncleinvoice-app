import { redirect } from "next/navigation";
import { getRealSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { updateNotificationPreferencesAction, updateTimeZoneAction } from "@/actions/notifications";
import { NOTIFICATION_EVENT_TYPES, TIME_ZONES } from "@/lib/notification-policy";
import { PushNotificationControls } from "@/components/push-notification-controls";
import { pushEnabled } from "@/lib/push";

const LABELS: Record<(typeof NOTIFICATION_EVENT_TYPES)[number], string> = {
  invoice_viewed: "Invoice opened",
  payment_received: "Payment received",
  payment_failed: "Payment failed",
  payment_refunded: "Payment refunded",
  payment_disputed: "Payment disputed",
  invoice_overdue: "Invoice overdue",
};

export const metadata = { title: "Notification settings — Uncle Invoice" };

export default async function NotificationSettingsPage() {
  const user = await getRealSessionUser();
  if (!user) redirect("/login?next=/app/notifications/settings");
  const saved = await db.notificationPreference.findMany({ where: { userId: user.id } });
  const preferences = new Map(saved.map((item) => [item.eventType, item]));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="text-sm uppercase tracking-widest text-muted">Account</p>
        <h1 className="mt-1 text-3xl">Notification settings</h1>
      </div>
      <form action={updateNotificationPreferencesAction} className="paper overflow-hidden rounded-3xl">
        <div className="grid grid-cols-[1fr_repeat(3,auto)] gap-x-4 border-b border-line px-5 py-3 text-sm font-semibold text-muted">
          <span>Event</span><span>In app</span><span>Push</span><span>Email</span>
        </div>
        {NOTIFICATION_EVENT_TYPES.map((eventType) => {
          const item = preferences.get(eventType);
          const defaultInApp = eventType !== "invoice_overdue";
          return (
            <div key={eventType} className="grid grid-cols-[1fr_repeat(3,auto)] items-center gap-x-8 border-b border-line px-5 py-4 last:border-b-0">
              <span>{LABELS[eventType]}</span>
              <input aria-label={`${LABELS[eventType]} in app`} type="checkbox" name={`${eventType}:inApp`} defaultChecked={item?.inApp ?? defaultInApp} />
              <input aria-label={`${LABELS[eventType]} push`} type="checkbox" name={`${eventType}:push`} defaultChecked={item?.push ?? false} />
              <input aria-label={`${LABELS[eventType]} email`} type="checkbox" name={`${eventType}:email`} defaultChecked={item?.email ?? false} />
            </div>
          );
        })}
        <div className="space-y-3 p-5">
          <p className="text-sm text-muted">Push and email choices are saved now. Delivery stays off until their safety switches are enabled.</p>
          <button className="btn btn-primary" type="submit">Save settings</button>
        </div>
      </form>
      <section className="paper rounded-3xl p-5">
        <h2 className="mb-3 text-2xl">Browser alerts</h2>
        <PushNotificationControls
          enabled={pushEnabled()}
          publicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""}
        />
      </section>
      <form action={updateTimeZoneAction} className="paper flex flex-wrap items-end gap-3 rounded-3xl p-5">
        <label className="flex-1 text-sm">Your time zone
          <select name="timeZone" defaultValue={user.timeZone} className="mt-1 block w-full rounded-xl border border-line bg-paper px-3 py-2">
            {TIME_ZONES.map((zone) => <option key={zone} value={zone}>{zone.replaceAll("_", " ")}</option>)}
          </select>
        </label>
        <button className="btn btn-secondary" type="submit">Save time zone</button>
      </form>
    </div>
  );
}
