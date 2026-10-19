export const NOTIFICATION_EVENT_TYPES = [
  "invoice_viewed",
  "payment_received",
  "payment_failed",
  "payment_refunded",
  "payment_disputed",
  "invoice_overdue",
] as const;

export const TIME_ZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
] as const;

export function notificationChannels(
  eventType: string,
  preference?: { inApp: boolean; push: boolean; email: boolean } | null,
) {
  return {
    inApp: preference?.inApp ?? eventType !== "invoice_overdue",
    push: preference?.push ?? false,
    email: preference?.email ?? false,
  };
}
