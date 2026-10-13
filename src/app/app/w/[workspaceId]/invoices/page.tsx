import Link from "next/link";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/workspace";
import { formatDate } from "@/lib/dates";
import { formatMoney, invoiceGrandTotal, paymentState } from "@/lib/money";
import { StatusBadge } from "@/components/status-badge";

export default async function InvoicesPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<{
    imported?: string;
    skipped?: string;
    contractor?: string;
    status?: string;
  }>;
}) {
  const { workspaceId } = await params;
  const query = await searchParams;
  await requireWorkspace(workspaceId);
  const imported = typeof query.imported === "string" ? query.imported : null;
  const skipped =
    typeof query.skipped === "string" && query.skipped !== "0" ? query.skipped : null;

  const contractors = await db.contractor.findMany({
    where: { workspaceId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const contractorId =
    query.contractor && contractors.some((c) => c.id === query.contractor)
      ? query.contractor
      : null;
  const status = query.status === "confirmed" || query.status === "unconfirmed" ? query.status : null;

  const invoices = await db.invoice.findMany({
    where: {
      workspaceId,
      ...(contractorId ? { contractorId } : {}),
      ...(status === "confirmed" ? { confirmedAt: { not: null } } : {}),
      ...(status === "unconfirmed" ? { confirmedAt: null } : {}),
    },
    include: { contractor: true, lineItems: true },
    orderBy: [{ issueDate: "desc" }, { number: "desc" }],
  });

  let total = 0;
  let paid = 0;
  let confirmed = 0;
  for (const invoice of invoices) {
    const value = invoiceGrandTotal(invoice.lineItems, invoice.taxRateBps);
    total += value;
    paid += Math.min(Math.max(0, invoice.amountPaid), value);
    if (invoice.confirmedAt) confirmed += 1;
  }

  const href = (next: Record<string, string | null>) => {
    const sp = new URLSearchParams();
    const merged = { contractor: contractorId, status, ...next };
    for (const [key, value] of Object.entries(merged)) if (value) sp.set(key, value);
    const qs = sp.toString();
    return `/app/w/${workspaceId}/invoices${qs ? `?${qs}` : ""}`;
  };

  const chip = (active: boolean) =>
    `rounded-full px-3 py-1.5 text-sm ring-1 ring-line ${active ? "bg-ink text-paper" : "bg-paper hover:bg-paper-2"}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl">Invoices</h2>
          <p className="text-muted">Drafts you seeded, plus anything the contractor confirmed.</p>
        </div>
        <Link href={`/app/w/${workspaceId}/invoices/new`} className="btn btn-primary">
          Seed an invoice
        </Link>
      </div>

      {imported ? (
        <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-emerald-900">
          Imported {imported} draft {imported === "1" ? "invoice" : "invoices"} from the spreadsheet.
          {skipped ? (
            <>
              {" "}
              Skipped {skipped} {skipped === "1" ? "row" : "rows"} already on this client —
              re-importing the same spreadsheet will not duplicate them.
            </>
          ) : null}
        </p>
      ) : null}

      <div className="paper grid gap-4 rounded-3xl p-6 sm:grid-cols-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Invoices</p>
          <p className="display mt-1 text-2xl tabular-nums">{invoices.length}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Total</p>
          <p className="display mt-1 text-2xl tabular-nums">{formatMoney(total)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Paid</p>
          <p className="display mt-1 text-2xl tabular-nums">{formatMoney(paid)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Confirmed</p>
          <p className="display mt-1 text-2xl tabular-nums">
            {confirmed}
            <span className="text-base text-muted"> / {invoices.length}</span>
          </p>
        </div>
      </div>

      {contractors.length > 1 || status ? (
        <div className="flex flex-wrap items-center gap-2">
          <Link href={href({ contractor: null })} className={chip(!contractorId)}>
            Everyone
          </Link>
          {contractors.map((contractor) => (
            <Link
              key={contractor.id}
              href={href({ contractor: contractor.id })}
              className={chip(contractorId === contractor.id)}
            >
              {contractor.name}
            </Link>
          ))}
          <span className="mx-1 text-muted">·</span>
          <Link href={href({ status: null })} className={chip(!status)}>
            Any status
          </Link>
          <Link href={href({ status: "confirmed" })} className={chip(status === "confirmed")}>
            Confirmed
          </Link>
          <Link href={href({ status: "unconfirmed" })} className={chip(status === "unconfirmed")}>
            Not yet confirmed
          </Link>
        </div>
      ) : null}

      <div className="paper overflow-hidden rounded-3xl">
        <table className="w-full text-left text-sm">
          <thead className="bg-background/70 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-5 py-3 font-medium">Invoice</th>
              <th className="px-5 py-3 font-medium">Contractor</th>
              <th className="px-5 py-3 font-medium">Date</th>
              <th className="px-5 py-3 font-medium">Amount</th>
              <th className="px-5 py-3 font-medium">Paid</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => {
              const value = invoiceGrandTotal(invoice.lineItems, invoice.taxRateBps);
              const state = paymentState(invoice.amountPaid, value);
              return (
                <tr key={invoice.id} className="border-t border-line">
                  <td className="px-5 py-3">
                    <Link
                      href={`/app/w/${workspaceId}/invoices/${invoice.id}`}
                      className="underline-offset-2 hover:underline"
                    >
                      {invoice.number}
                    </Link>
                  </td>
                  <td className="px-5 py-3">{invoice.contractor.name}</td>
                  <td className="px-5 py-3">{formatDate(invoice.issueDate)}</td>
                  <td className="px-5 py-3 tabular-nums">{formatMoney(value)}</td>
                  <td className="px-5 py-3 text-muted">
                    {state === "paid" ? "Paid" : state === "partial" ? "Part paid" : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={invoice.status} />
                  </td>
                </tr>
              );
            })}
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-muted">
                  Nothing matches that filter.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
