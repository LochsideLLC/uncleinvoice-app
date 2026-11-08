import "server-only";

import { hashToken } from "@/lib/crypto";
import { cappedInteger, consumeDailyLimit } from "@/lib/usage-limits";

/**
 * Text messages through Twilio's REST API (no SDK).
 *
 * Needs TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and one sender:
 * TWILIO_MESSAGING_SERVICE_SID (preferred; carries the A2P 10DLC campaign) or
 * TWILIO_FROM_NUMBER. Like email, real sending also needs an explicit
 * OUTBOUND_SMS_ENABLED=true so a stray key cannot start texting people.
 */
const E164 = /^\+[1-9]\d{7,14}$/;

export function smsConfigured() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      (process.env.TWILIO_MESSAGING_SERVICE_SID || process.env.TWILIO_FROM_NUMBER) &&
      process.env.OUTBOUND_SMS_ENABLED?.toLowerCase() === "true",
  );
}

export async function sendSms(input: { to: string; body: string }) {
  if (!E164.test(input.to)) throw new Error("That phone number is not valid.");
  if (!smsConfigured()) throw new Error("Text messages are not turned on yet.");

  const globalAllowed = await consumeDailyLimit({
    operation: "sms_send",
    scope: "global",
    scopeKey: "all",
    limit: cappedInteger(process.env.SMS_GLOBAL_DAILY_LIMIT, 200, 500),
  });
  const recipientAllowed =
    globalAllowed &&
    (await consumeDailyLimit({
      operation: "sms_send",
      scope: "user",
      scopeKey: hashToken(input.to),
      limit: cappedInteger(process.env.SMS_RECIPIENT_DAILY_LIMIT, 3, 5),
    }));
  if (!recipientAllowed) throw new Error("Text sending limit reached. Try again tomorrow.");

  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const form = new URLSearchParams({ To: input.to, Body: input.body });
  if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
    form.set("MessagingServiceSid", process.env.TWILIO_MESSAGING_SERVICE_SID);
  } else {
    form.set("From", process.env.TWILIO_FROM_NUMBER!);
  }
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
  });
  if (!res.ok) {
    // Twilio's error body can echo request details; keep the user-facing text generic.
    console.error("SMS send failed", res.status, await res.text());
    throw new Error("The text message could not be sent.");
  }
}
