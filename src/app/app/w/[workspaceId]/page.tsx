import Link from "next/link";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/workspace";
import { asWorkspaceKind } from "@/lib/workspace-kind";
import { formatDate } from "@/lib/dates";
import { formatMoney, invoiceGrandTotal } from "@/lib/money";
import { InvoiceDisplayStatus } from "@/components/invoice-display-status";
import { InvoiceSearch } from "@/components/invoice-search";

const PAGE_SIZE = 25;

export default async function WorkspaceHomePage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspaceId } = await params;
  const query = await searchParams;
  const { user } = await requireWorkspace(workspaceId);
  const contractorMode = asWorkspaceKind(user.workspaceKind) === "contractor";

  const view = query.view === "customer" ? "customer" : "client";
  const search = (typeof query.q === "string" ? query.q : "").trim().slice(0, 80);
  const status = ["draft", "saved", "sent", "paid", "overdue"].includes(typeof query.status === "string" ? query.status : "")
    ? query.status as "draft" | "saved" | "sent" | "paid" | "overdue"
    : "";
  const page = Math.min(1000, Math.max(0, Number.parseInt(typeof query.page === "string" ? query.page : "0", 10) || 0));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const invoices = await db.invoice.findMany({
    where: {
      workspaceId,
      ...(contractorMode ? { contractor: { userId: user.id } } : {}),
      ...(status === "overdue"
        ? { status: "sent", dueDate: { lt: today } }
        : status === "paid"
          ? { amountPaid: { gt: 0 } }
          : status === "draft"
            ? { status: { in: ["draft", "awaiting_review"] } }
            : status === "saved"
              ? { status: "confirmed" }
              : status === "sent"
                ? { status: "sent" }
                : {}),
      ...(search ? {
        OR: [
          { number: { contains: search } },
          { contractor: { name: { contains: search } } },
        ],
      } : {}),
    },
    include: { contractor: true, lineItems: true },
    orderBy: [{ issueDate: "desc" }, { number: "desc" }],
    ...(status === "overdue" || status === "paid" ? {} : { skip: page * PAGE_SIZE, take: PAGE_SIZE + 1 }),
  });

  const matchingInvoices = status === "overdue" || status === "paid"
    ? invoices.filter((invoice) => {
      const total = invoiceGrandTotal(invoice.lineItems, invoice.taxRateBps);
      return status === "paid" ? total > 0 && invoice.amountPaid >= total : invoice.amountPaid < total;
    })
    : invoices;
  const hasNext = status === "overdue" || status === "paid"
    ? matchingInvoices.length > (page + 1) * PAGE_SIZE
    : matchingInvoices.length > PAGE_SIZE;
  const rows = status === "overdue" || status === "paid"
    ? matchingInvoices.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
    : matchingInvoices.slice(0, PAGE_SIZE);
  const pageHref = (nextPage: number) => {
    const queryString = new URLSearchParams();
    if (view === "customer") queryString.set("view", view);
    if (search) queryString.set("q", search);
    if (status) queryString.set("status", status);
    if (nextPage > 0) queryString.set("page", String(nextPage));
    const suffix = queryString.toString();
    return `/app/w/${workspaceId}${suffix ? `?${suffix}` : ""}`;
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl">Invoices</h2>
      <InvoiceSearch
        key={`${search}:${status}`}
        action={`/app/w/${workspaceId}`}
        initialValue={search}
        initialStatus={status}
        customerView={view === "customer"}
      />

      <section aria-label="Invoices">
        <ul className="space-y-2">
          {rows.map((invoice) => {
            const total = invoiceGrandTotal(invoice.lineItems, invoice.taxRateBps);
            return (
              <li key={invoice.id} className="paper rounded-xl px-3 py-3 sm:px-4">
                <Link href={`/app/w/${workspaceId}/invoices/${invoice.id}`} className="flex min-w-0 items-center justify-between gap-3 hover:underline">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{invoice.number}{!contractorMode ? <span className="font-normal text-muted"> · From {invoice.contractor.name}</span> : null}</span>
                    <span className="mt-1 block text-sm text-muted">Due {invoice.dueDate ? formatDate(invoice.dueDate) : "on receipt"}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="font-semibold tabular-nums">{formatMoney(total)}</span>
                    <InvoiceDisplayStatus status={invoice.status} dueDate={invoice.dueDate} amountPaid={invoice.amountPaid} totalCents={total} />
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
