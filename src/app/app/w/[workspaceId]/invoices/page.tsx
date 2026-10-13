import Link from "next/link";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/workspace";
import { formatDate } from "@/lib/dates";
import { formatMoney, invoiceGrandTotal } from "@/lib/money";
import { StatusBadge } from "@/components/status-badge";

export default async function InvoicesPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<{ imported?: string; skipped?: string }>;
}) {
  const { workspaceId } = await params;
  const query = await searchParams;
  await requireWorkspace(workspaceId);
  const imported = typeof query.imported === "string" ? query.imported : null;
  const skipped = typeof query.skipped === "string" && query.skipped !== "0" ? query.skipped : null;

  const invoices = await db.invoice.findMany({
    where: { workspaceId },
    include: { contractor: true, lineItems: true },
    orderBy: { createdAt: "desc" },
  });

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

      <div className="paper overflow-hidden rounded-3xl">
        <table className="w-full text-left text-sm">
          <thead className="bg-background/70 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-5 py-3 font-medium">Invoice</th>
              <th className="px-5 py-3 font-medium">Contractor</th>
              <th className="px-5 py-3 font-medium">Date</th>
              <th className="px-5 py-3 font-medium">Amount</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
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
                <td className="px-5 py-3">{formatMoney(invoiceGrandTotal(invoice.lineItems, invoice.taxRateBps))}</td>
                <td className="px-5 py-3">
                  <StatusBadge status={invoice.status} />
                </td>
              </tr>
            ))}
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-muted">
                  No invoices yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
