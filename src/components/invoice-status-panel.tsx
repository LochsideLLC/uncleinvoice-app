import { randomUUID } from "node:crypto";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { markAsSentAction, markAsPaidAction } from "@/actions/invoices";

export function InvoiceStatusPanel({
  workspaceId,
  invoiceId,
  status,
  sentAt,
  createdAt,
  totalCents,
  amountPaid,
}: {
  workspaceId: string;
  invoiceId: string;
  status: string;
  sentAt: Date | null;
  createdAt: Date;
  totalCents: number;
  amountPaid: number;
}) {
  const isSent = status === "sent";
  const isPaid = totalCents > 0 && amountPaid >= totalCents;
  const dueCents = Math.max(0, totalCents - amountPaid);
  const todayIso = new Date().toISOString().slice(0, 10);
  const paymentNonce = randomUUID();

  const steps: { label: string; done: boolean; detail?: string }[] = [
    { label: "Created", done: true, detail: formatDate(createdAt) },
    {
      label: "Sent to client",
      done: isSent,
      detail: sentAt ? formatDate(sentAt) : undefined,
    },
    { label: "Paid", done: isPaid },
  ];

  return (
    <div className="paper space-y-5 rounded-3xl p-6">
      <h3 className="text-xl">Status</h3>

      <ol className="space-y-3">
        {steps.map((step, i) => (
          <li key={step.label} className="flex items-start gap-3">
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                step.done
                  ? "bg-olive text-white"
                  : "border-2 border-line text-muted"
              }`}
            >
              {step.done ? "✓" : i + 1}
            </span>
            <div>
              <p className={`text-sm font-semibold ${step.done ? "text-ink" : "text-muted"}`}>
                {step.label}
              </p>
              {step.detail ? (
                <p className="text-xs text-muted">{step.detail}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>

      {!isSent ? (
        <div className="border-t border-line pt-4 space-y-2">
          <p className="text-sm font-semibold">Have you sent this to your client?</p>
          <p className="text-xs text-muted">
            Mark it sent so you have a record — and to lock the invoice from accidental edits.
          </p>
          <form action={markAsSentAction} className="mt-3 space-y-3">
            <input type="hidden" name="workspaceId" value={workspaceId} />
            <input type="hidden" name="invoiceId" value={invoiceId} />
            <div className="field">
              <label htmlFor="sentDate">Date sent</label>
              <input
                type="date"
                id="sentDate"
                name="sentDate"
                defaultValue={todayIso}
                style={{ width: "auto" }}
              />
            </div>
            <button type="submit" className="btn btn-secondary">
              Mark as sent
            </button>
          </form>
        </div>
      ) : null}

      {isSent && !isPaid ? (
        <div className="border-t border-line pt-4 space-y-2">
          <p className="text-sm font-semibold">Has your client paid?</p>
          <p className="text-xs text-muted">{formatMoney(dueCents)} is still due.</p>
          <form action={markAsPaidAction} className="mt-3 space-y-3">
            <input type="hidden" name="workspaceId" value={workspaceId} />
            <input type="hidden" name="invoiceId" value={invoiceId} />
            <input type="hidden" name="paymentNonce" value={paymentNonce} />
            <input type="hidden" name="paidDate" value={todayIso} />
            <div className="field">
              <label htmlFor="paidNote">Note (optional)</label>
              <input
                type="text"
                id="paidNote"
                name="note"
                placeholder="e.g. Paid by check #1234"
              />
            </div>
            <button type="submit" className="btn btn-secondary">
              Mark as paid in full
            </button>
          </form>
        </div>
      ) : null}

      {isPaid ? (
        <div className="border-t border-line pt-4">
          <p className="text-sm font-semibold" style={{ color: "var(--olive)" }}>
            ✓ Paid in full
          </p>
        </div>
      ) : null}
    </div>
  );
}
