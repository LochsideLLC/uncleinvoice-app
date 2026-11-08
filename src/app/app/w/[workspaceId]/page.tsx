import Link from "next/link";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/workspace";
import { formatDate } from "@/lib/dates";
import { formatMoney, invoiceGrandTotal } from "@/lib/money";
import { StatusBadge } from "@/components/status-badge";

const PAGE_SIZE = 25;
const FILTERS = [
  ["", "All invoices"],
  ["draft", "Draft"],
  ["review", "Needs review"],
  ["ready", "Ready to send"],
  ["sent", "Sent"],
] as const;

export default async function WorkspaceHomePage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspaceId } = await params;
  const query = await searchParams;
  await requireWorkspace(workspaceId);

  const view = query.view === "customer" ? "customer" : "client";
  const rawStatus = typeof query.status === "string" ? query.status : "";
  const status = FILTERS.some(([value]) => value === rawStatus) ? rawStatus : "";
  const search = (typeof query.q === "string" ? query.q : "").trim().slice(0, 80);
  const page = Math.min(1000, Math.max(0, Number.parseInt(typeof query.page === "string" ? query.page : "0", 10) || 0));

  const invoices = await db.invoice.findMany({
    where: {
      workspaceId,
      ...(status === "draft" ? { status: "draft" } : {}),
      ...(status === "review" ? { status: "awaiting_review" } : {}),
      ...(status === "ready" ? { status: "confirmed", sentAt: null } : {}),
      ...(status === "sent" ? { status: "sent" } : {}),
      ...(search ? {
        OR: [
          { number: { contains: search } },
          { contractor: { name: { contains: search } } },
        ],
      } : {}),
    },
    include: { contractor: true, lineItems: true },
    orderBy: [{ issueDate: "desc" }, { number: "desc" }],
    skip: page * PAGE_SIZE,
    take: PAGE_SIZE + 1,
  });

  const hasNext = invoices.length > PAGE_SIZE;
  const rows = invoices.slice(0, PAGE_SIZE);
  const pageHref = (nextPage: number) => {
    const queryString = new URLSearchParams();
    if (view === "customer") queryString.set("view", view);
    if (status) queryString.set("status", status);
    if (search) queryString.set("q", search);
    if (nextPage > 0) queryString.set("page", String(nextPage));
    const suffix = queryString.toString();
    return `/app/w/${workspaceId}${suffix ? `?${suffix}` : ""}`;
  };

  return (
    <div className="space-y-4">
      <Link href={`/app/w/${workspaceId}/settings${view === "customer" ? "?view=customer" : ""}`} className="btn btn-secondary w-full sm:w-auto">
        {view === "customer" ? "Edit customer details" : "Edit client details"}
      </Link>
      <h2 className="text-2xl">Invoices</h2>

      <form method="get" action={`/app/w/${workspaceId}`} className="paper grid gap-3 rounded-2xl p-3 sm:grid-cols-[minmax(0,1fr)_12rem_auto] sm:items-end">
        {view === "customer" ? <input type="hidden" name="view" value={view} /> : null}
        <label className="field">
          <span>Search invoices</span>
          <input name="q" type="search" defaultValue={search} maxLength={80} placeholder="Invoice number or contractor" />
        </label>
        <label className="field">
          <span>Show</span>
          <select name="status" defaultValue={status}>
            {FILTERS.map(([value, label]) => <option key={value || "all"} value={value}>{label}</option>)}
          </select>
        </label>
        <button className="btn btn-secondary min-h-11">Filter</button>
      </form>

      <section aria-label="Invoices">
        <ul className="space-y-2">
          {rows.map((invoice) => {
            const total = invoiceGrandTotal(invoice.lineItems, invoice.taxRateBps);
            return (
              <li key={invoice.id} className="paper rounded-xl px-3 py-3 sm:px-4">
                <Link href={`/app/w/${workspaceId}/invoices/${invoice.id}`} className="flex min-w-0 items-center justify-between gap-3 hover:underline">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{invoice.number} <span className="font-normal text-muted">· {invoice.contractor.name}</span></span>
                    <span className="mt-1 block text-sm text-muted">{formatDate(invoice.issueDate)}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="font-semibold tabular-nums">{formatMoney(total)}</span>
                    <StatusBadge status={invoice.status} />
                  </span>
                </Link>
              </li>
            );
          })}
          {rows.length === 0 ? <li className="paper rounded-xl px-4 py-6 text-muted">No invoices found.</li> : null}
        </ul>
      </section>

      {(page > 0 || hasNext) ? (
        <nav className="flex items-center justify-between" aria-label="Invoice pages">
          {page > 0 ? <Link href={pageHref(page - 1)} className="btn btn-secondary min-h-11">← Previous</Link> : <span />}
          <span className="text-sm text-muted">Page {page + 1}</span>
          {hasNext ? <Link href={pageHref(page + 1)} className="btn btn-secondary min-h-11">Next →</Link> : <span />}
        </nav>
      ) : null}
    </div>
  );
}
