import Link from "next/link";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/workspace";
import { asWorkspaceKind } from "@/lib/workspace-kind";
import { formatDate } from "@/lib/dates";
import { formatMoney, invoiceGrandTotal } from "@/lib/money";
import { InvoiceDisplayStatus } from "@/components/invoice-display-status";
import { ConfirmedInvoiceExport } from "@/components/confirmed-invoice-export";

const PAGE_SIZE = 50;

export default async function InvoicesPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<{
    imported?: string;
    skipped?: string;
    already?: string;
    contractor?: string;
    status?: string;
    year?: string;
    q?: string;
    page?: string;
  }>;
}) {
  const { workspaceId } = await params;
  const query = await searchParams;
  const { user } = await requireWorkspace(workspaceId);
  const contractorMode = asWorkspaceKind(user.workspaceKind) === "contractor";
  const imported = typeof query.imported === "string" ? query.imported : null;
  const skipped = typeof query.skipped === "string" && query.skipped !== "0" ? query.skipped : null;
  const already = typeof query.already === "string" && query.already !== "0" ? query.already : null;

  const contractors = await db.contractor.findMany({
    where: { workspaceId, ...(contractorMode ? { userId: user.id } : {}) },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const contractorId = query.contractor && contractors.some((c) => c.id === query.contractor) ? query.contractor : null;
  const status = ["draft", "saved", "sent", "paid"].includes(query.status ?? "")
    ? query.status as "draft" | "saved" | "sent" | "paid"
    : query.status === "review" || query.status === "unconfirmed"
      ? "draft"
      : query.status === "ready" || query.status === "confirmed"
        ? "saved"
        : null;
  const year = /^20\d{2}$/.test(query.year ?? "") ? Number(query.year) : null;
  const q = (query.q ?? "").trim().slice(0, 80);
  const page = Math.min(1000, Math.max(0, Number.parseInt(query.page ?? "0", 10) || 0));

  const invoices = await db.invoice.findMany({
    where: {
      workspaceId,
      ...(contractorMode ? { contractor: { userId: user.id } } : {}),
      ...(contractorId ? { contractorId } : {}),
      ...(status === "draft" ? { status: { in: ["draft", "awaiting_review"] } } : {}),
      ...(status === "saved" ? { status: "confirmed" } : {}),
      ...(status === "sent" ? { status: "sent" } : {}),
      ...(status === "paid" ? { amountPaid: { gt: 0 } } : {}),
      ...(year ? { issueDate: { gte: new Date(`${year}-01-01T00:00:00`), lt: new Date(`${year + 1}-01-01T00:00:00`) } } : {}),
      ...(q ? { OR: [{ number: { contains: q } }, { contractor: { name: { contains: q } } }] } : {}),
    },
    include: { contractor: true, lineItems: true },
    orderBy: [{ issueDate: "desc" }, { number: "desc" }],
    ...(status === "paid" ? {} : { skip: page * PAGE_SIZE, take: PAGE_SIZE + 1 }),
  });
  const matchingInvoices = status === "paid"
    ? invoices.filter((invoice) => {
      const total = invoiceGrandTotal(invoice.lineItems, invoice.taxRateBps);
      return total > 0 && invoice.amountPaid >= total;
    })
    : invoices;
  const hasNext = status === "paid"
    ? matchingInvoices.length > (page + 1) * PAGE_SIZE
    : invoices.length > PAGE_SIZE;
  const rows = status === "paid"
    ? matchingInvoices.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
    : invoices.slice(0, PAGE_SIZE);
  const reportableRows = rows.filter((invoice) => invoice.status === "confirmed" || invoice.status === "sent");
  const total = reportableRows.reduce((sum, invoice) => sum + invoiceGrandTotal(invoice.lineItems, invoice.taxRateBps), 0);
  const paid = reportableRows.reduce((sum, invoice) => {
    const value = invoiceGrandTotal(invoice.lineItems, invoice.taxRateBps);
    return sum + Math.min(Math.max(0, invoice.amountPaid), value);
  }, 0);
  const saved = rows.filter((invoice) => invoice.status === "confirmed").length;

  const href = (next: Record<string, string | null>) => {
    const merged: Record<string, string | null> = { contractor: contractorId, status, year: year ? String(year) : null, q: q || null, ...next };
    if (!("page" in next)) merged.page = "0";
    const sp = new URLSearchParams();
    for (const [key, value] of Object.entries(merged)) if (value && !(key === "page" && value === "0")) sp.set(key, value);
    const qs = sp.toString();
    return `/app/w/${workspaceId}/invoices${qs ? `?${qs}` : ""}`;
  };

  const exportRows = rows.filter((invoice) => invoice.confirmedAt).map((invoice) => ({ id: invoice.id, number: invoice.number }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl">Invoices</h2>
          <p className="text-sm text-muted">Showing up to {PAGE_SIZE} at a time.</p>
        </div>
        <Link href={`/app/w/${workspaceId}/import`} className="btn btn-primary">Import payments</Link>
      </div>

      {imported ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-emerald-900">Imported {imported} draft {imported === "1" ? "invoice" : "invoices"}.{already ? <> Skipped {already} row{already === "1" ? "" : "s"} with a source payment ID already on file.</> : null}{skipped ? <> Skipped {skipped} other duplicate or unchecked row{skipped === "1" ? "" : "s"}.</> : null}</p> : null}

      <form method="get" className="paper grid gap-3 rounded-2xl p-4 sm:grid-cols-2 lg:grid-cols-[minmax(12rem,2fr)_minmax(10rem,1fr)_minmax(8rem,0.7fr)_minmax(10rem,1fr)_auto] lg:items-end">
        <label className="field">
          <span>Search</span>
          <input name="q" type="search" defaultValue={q} maxLength={80} placeholder="Invoice or contractor" />
        </label>
        <label className="field"><span>Contractor</span><select name="contractor" defaultValue={contractorId ?? ""}><option value="">All contractors</option>{contractors.map((contractor) => <option key={contractor.id} value={contractor.id}>{contractor.name}</option>)}</select></label>
        <label className="field"><span>Year</span><select name="year" defaultValue={year ? String(year) : ""}><option value="">All years</option>{Array.from({ length: 8 }, (_, i) => new Date().getFullYear() - i).map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        <label className="field"><span>Status</span><select name="status" defaultValue={status ?? ""}><option value="">All statuses</option><option value="draft">Draft</option><option value="saved">Saved</option><option value="sent">Sent</option><option value="paid">Paid</option></select></label>
        <button className="btn btn-secondary min-h-11">Apply filters</button>
      </form>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="On this page" value={String(rows.length)} />
        <Stat label="Invoice total" value={formatMoney(total)} />
        <Stat label="Paid" value={formatMoney(paid)} />
        <Stat label="Saved" value={`${saved} / ${rows.length}`} />
      </div>

      <section className="space-y-3" aria-label="Invoice results">
        <ConfirmedInvoiceExport workspaceId={workspaceId} invoices={exportRows} />
        <ul className="space-y-2 sm:hidden">
          {rows.map((invoice) => {
            const value = invoiceGrandTotal(invoice.lineItems, invoice.taxRateBps);
            return <li key={invoice.id} className="paper rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0"><Link href={`/app/w/${workspaceId}/invoices/${invoice.id}`} className="font-semibold underline underline-offset-4">{invoice.number}</Link><p className="truncate text-sm text-muted">{invoice.contractor.name}</p></div>
                <span className="shrink-0 font-medium tabular-nums">{formatMoney(value)}</span>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm"><span className="text-muted">Due {invoice.dueDate ? formatDate(invoice.dueDate) : "on receipt"}</span><InvoiceDisplayStatus status={invoice.status} dueDate={invoice.dueDate} amountPaid={invoice.amountPaid} totalCents={value} /></div>
              {invoice.confirmedAt ? <label className="mt-3 flex min-h-10 items-center gap-2 border-t border-line pt-2 text-sm"><input type="checkbox" name="id" value={invoice.id} form="confirmed-invoice-export" /><span>Add confirmed PDF to export</span></label> : null}
            </li>;
          })}
          {!rows.length ? <li className="paper rounded-2xl px-4 py-8 text-muted">No invoices match these filters.</li> : null}
        </ul>

        <div className="paper hidden overflow-x-auto rounded-2xl sm:block">
          <table className="w-full min-w-[48rem] text-left text-sm">
            <thead className="bg-background/70 text-xs uppercase tracking-wide text-muted"><tr><th className="px-4 py-3 font-medium">Invoice</th><th className="px-4 py-3 font-medium">Contractor</th><th className="px-4 py-3 font-medium">Due</th><th className="px-4 py-3 font-medium">Amount</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Export</th></tr></thead>
            <tbody>{rows.map((invoice) => {
              const value = invoiceGrandTotal(invoice.lineItems, invoice.taxRateBps);
                return <tr key={invoice.id} className="border-t border-line"><td className="px-4 py-3"><Link href={`/app/w/${workspaceId}/invoices/${invoice.id}`} className="underline underline-offset-2">{invoice.number}</Link></td><td className="px-4 py-3">{invoice.contractor.name}</td><td className="px-4 py-3">{invoice.dueDate ? formatDate(invoice.dueDate) : "On receipt"}</td><td className="px-4 py-3 tabular-nums">{formatMoney(value)}</td><td className="px-4 py-3"><InvoiceDisplayStatus status={invoice.status} dueDate={invoice.dueDate} amountPaid={invoice.amountPaid} totalCents={value} /></td><td className="px-4 py-3">{invoice.confirmedAt ? <label className="flex min-h-10 items-center gap-2"><input type="checkbox" name="id" value={invoice.id} form="confirmed-invoice-export" /><span className="sr-only">Export {invoice.number}</span></label> : "—"}</td></tr>;
            })}{!rows.length ? <tr><td colSpan={6} className="px-4 py-8 text-muted">No invoices match these filters.</td></tr> : null}</tbody>
          </table>
        </div>
      </section>

      {(page > 0 || hasNext) ? <nav className="flex items-center justify-between" aria-label="Invoice pages">
        {page > 0 ? <Link href={href({ page: String(page - 1) })} className="btn btn-secondary min-h-11">← Previous 50</Link> : <span />}
        <span className="text-sm text-muted">Page {page + 1}</span>
        {hasNext ? <Link href={href({ page: String(page + 1) })} className="btn btn-secondary min-h-11">Next 50 →</Link> : <span />}
      </nav> : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="paper rounded-xl px-3 py-2"><p className="text-xs text-muted">{label}</p><p className="mt-1 font-semibold tabular-nums">{value}</p></div>;
}
