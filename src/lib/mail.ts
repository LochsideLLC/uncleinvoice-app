import { db } from "@/lib/db";
import { hashToken } from "@/lib/crypto";
import { cappedInteger, consumeDailyLimit, consumeMonthlyLimit } from "@/lib/usage-limits";

export function mailFromAddress() {
  return process.env.MAIL_FROM ?? "Uncle Invoice <noreply@uncleinvoice.com>";
}

type SendEmailInput = {
  to: string;
  cc?: string[];
  bcc?: string[];
  subject: string;
  text: string;
  html?: string;
  link?: string;
  replyTo?: string;
  attachments?: { filename: string; content: Uint8Array }[];
};

export async function sendEmail(input: SendEmailInput) {
  const record = await db.outboxEmail.create({
    data: {
      to: input.to,
      cc: input.cc?.length ? input.cc.join(", ") : null,
      bcc: input.bcc?.length ? input.bcc.join(", ") : null,
      subject: input.subject,
      bodyText: input.text,
      bodyHtml: input.html,
      link: input.link,
    },
  });

  const apiKey = process.env.RESEND_API_KEY;
  const outboundEnabled = process.env.OUTBOUND_EMAIL_ENABLED?.toLowerCase() === "true";
  if (apiKey && !outboundEnabled) throw new Error("Outbound email is paused");
  if (apiKey && outboundEnabled) {
    const recipients = [...new Set([input.to, ...(input.cc ?? []), ...(input.bcc ?? [])].map((email) => email.trim().toLowerCase()))];
    if (recipients.length > 10) throw new Error("Email recipient limit reached");
    const globalAllowed = await consumeDailyLimit({
      operation: "email_send",
      scope: "global",
      scopeKey: "all",
      limit: cappedInteger(process.env.EMAIL_GLOBAL_DAILY_LIMIT, 80, 100),
      increment: recipients.length,
    });
    const monthlyAllowed = globalAllowed && await consumeMonthlyLimit({
      operation: "email_send_monthly",
      scope: "global",
      scopeKey: "all",
      limit: cappedInteger(process.env.EMAIL_GLOBAL_MONTHLY_LIMIT, 2400, 2400),
      increment: recipients.length,
    });
    const recipientAllowed = monthlyAllowed
      ? (await Promise.all(recipients.map((recipient) => consumeDailyLimit({
          operation: "email_send",
          scope: "user",
          scopeKey: hashToken(recipient),
          limit: cappedInteger(process.env.EMAIL_RECIPIENT_DAILY_LIMIT, 10, 20),
        })))).every(Boolean)
      : false;
    if (!globalAllowed || !monthlyAllowed || !recipientAllowed) throw new Error("Email sending limit reached");
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: mailFromAddress(),
        to: [input.to],
        ...(input.cc?.length ? { cc: input.cc } : {}),
        ...(input.bcc?.length ? { bcc: input.bcc } : {}),
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
        subject: input.subject,
        text: input.text,
        html: input.html ?? `<pre>${escapeHtml(input.text)}</pre>`,
        ...(input.attachments?.length
          ? {
              attachments: input.attachments.map((file) => ({
                filename: file.filename,
                content: Buffer.from(file.content).toString("base64"),
              })),
            }
          : {}),
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Email send failed: ${detail}`);
    }
  }

  return record;
}

export async function recentOutbox(limit = 20) {
  return db.outboxEmail.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
