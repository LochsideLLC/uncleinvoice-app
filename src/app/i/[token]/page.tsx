import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HostedInvoiceViewPing } from "@/components/hosted-invoice-view-ping";
import { InvoiceActions } from "@/components/invoice-actions";
import { InvoiceDocument, invoiceToDocument } from "@/components/invoice-document";
import { formatDate } from "@/lib/dates";
import { loadHostedInvoice } from "@/lib/hosted-invoices";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = {
  title: "Invoice — Uncle Invoice",
  robots: { index: false, follow: false, nocache: true },
};

export default async function HostedInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ payment?: string }>;
}) {
  const { token } = await params;
  const hosted = await loadHostedInvoice(token);
  if (!hosted) notFound();
  const { invoice, eligibility } = hosted;
  const payment = (await searchParams).payment;
  const recordedPayments = invoice.payments.filter((item) =>
    ["succeeded", "partially_refunded", "fully_refunded", "disputed"].includes(item.status));

  return (
    <div className="mx-auto min-h-full w-full max-w-6xl px-5 pb-8">
      <HostedInvoiceViewPing token={token} />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="text-sm text-muted">Secure hosted invoice</p>
        <InvoiceActions pdfHref={`/api/i/${token}/pdf`} />
      </div>

      {payment === "processing" ? (
        <div className="mb-5 rounded-2xl border border-line bg-paper-2 px-5 py-4 print:hidden">
          Payment is being checked. This page will show paid only after Stripe confirms it.
        </div>
      ) : null}

      <InvoiceDocument invoice={invoiceToDocument(invoice)} />

      <section className="paper mt-6 space-y-4 rounded-3xl p-6 print:hidden">
        <div>
          <h2 className="text-2xl">Payment</h2>
          <p className="mt-1 text-muted">
            Balance due: <span className="font-semibold text-ink">{formatMoney(eligibility.balance)}</span>
          </p>
        </div>
        {eligibility.eligible ? (
          <div>
            <form action={`/api/i/${token}/checkout`} method="post">
              <button className="btn btn-primary" type="submit">Pay invoice with Stripe</button>
            </form>
            <p className="mt-2 text-sm text-muted">Stripe may charge the business its normal processing fee. Uncle Invoice adds no fee.</p>
          </div>
        ) : (
          <p className="text-sm text-muted">
            {eligibility.balance <= 0 ? "This invoice is paid." : "Online payment is not available for this invoice."}
          </p>
        )}
        {recordedPayments.length ? (
          <div>
            <h3 className="text-lg">Payment history</h3>
            <ul className="mt-2 space-y-2 text-sm">
              {recordedPayments.map((item) => (
                <li key={item.id} className="flex flex-wrap justify-between gap-2 border-t border-line pt-2">
                  <span>{item.source === "stripe" ? "Stripe confirmed" : "Manually recorded"} · {item.status.replaceAll("_", " ")}</span>
                  <span>{formatMoney(item.amount - item.refundedAmount)} · {formatDate(item.succeededAt ?? item.createdAt)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </div>
  );
}
