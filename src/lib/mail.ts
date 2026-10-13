import { db } from "@/lib/db";

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
  if (apiKey) {
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
