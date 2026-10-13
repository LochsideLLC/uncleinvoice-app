import { db } from "@/lib/db";
import { amountDue, invoiceGrandTotal } from "@/lib/money";
import { isInvoiceStatus } from "@/lib/status";

export type InvoiceRow = {
  id: string;
  number: string;
  workspaceId: string;
  clientName: string;
  status: string;
  totalCents: number;
  dueCents: number;
  isPaid: boolean;
  isPartiallyPaid: boolean;
  issueDate: Date;
  dueDate: Date | null;
};

export type DashboardStats = {
  invoiceCount: number;
  sentCount: number;
  waitingCount: number;
  draftCount: number;
  openCount: number;
  totalInvoicedCents: number;
  collectedCents: number;
  outstandingCents: number;
  paidCents: number;
  paidCount: number;
  partiallyPaidCents: number;
  partiallyPaidCount: number;
  overdueCents: number;
  overdueCount: number;
  openInvoices: InvoiceRow[];
  allInvoices: InvoiceRow[];
};

export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const invoices = await db.invoice.findMany({
    where: {
      OR: [
        // Invoices on a client this person helps keep books for.
        { workspace: { members: { some: { userId } } } },
        // Invoices this person issued. A contractor is not a member of the
        // client's workspace — they are the other party to it — so this is the
        // relationship that makes an invoice theirs.
        { contractor: { userId } },
      ],
    },
    include: {
      workspace: { select: { id: true, name: true } },
      lineItems: { select: { quantity: true, unitPrice: true, taxable: true } },
    },
    orderBy: { issueDate: "desc" },
  });

  let sentCount = 0;
  let waitingCount = 0;
  let draftCount = 0;
  let totalInvoicedCents = 0;
  let collectedCents = 0;
  let paidCents = 0;
  let paidCount = 0;
  let partiallyPaidCents = 0;
  let partiallyPaidCount = 0;
  let overdueCents = 0;
  let overdueCount = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const openInvoices: InvoiceRow[] = [];
  const allInvoices: InvoiceRow[] = [];

  for (const invoice of invoices) {
    const totalCents = invoiceGrandTotal(invoice.lineItems, invoice.taxRateBps);
    const dueCents = amountDue(totalCents, invoice.amountPaid);
    const isPaid = totalCents > 0 && invoice.amountPaid >= totalCents;
    const isPartiallyPaid = !isPaid && invoice.amountPaid > 0;
    totalInvoicedCents += totalCents;
    collectedCents += Math.min(Math.max(0, invoice.amountPaid), totalCents);

    if (isPaid) {
      paidCents += totalCents;
      paidCount += 1;
    } else if (isPartiallyPaid) {
      partiallyPaidCents += dueCents;
      partiallyPaidCount += 1;
    }

    const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null;
    if (dueDate) dueDate.setHours(0, 0, 0, 0);
    const isOverdue = !isPaid && dueCents > 0 && dueDate !== null && dueDate < today;
    if (isOverdue) {
      overdueCents += dueCents;
      overdueCount += 1;
    }

    const status = isInvoiceStatus(invoice.status) ? invoice.status : "draft";
    if (status === "sent") sentCount += 1;
    if (status === "awaiting_review") waitingCount += 1;
    if (status === "draft") draftCount += 1;

    const row: InvoiceRow = {
      id: invoice.id,
      number: invoice.number,
      workspaceId: invoice.workspace.id,
      clientName: invoice.workspace.name,
      status,
      totalCents,
      dueCents,
      isPaid,
      isPartiallyPaid,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate ?? null,
    };

    allInvoices.push(row);
    if (dueCents > 0) openInvoices.push(row);
  }

  return {
    invoiceCount: invoices.length,
    sentCount,
    waitingCount,
    draftCount,
    openCount: openInvoices.length,
    totalInvoicedCents,
    collectedCents,
    outstandingCents: Math.max(0, totalInvoicedCents - collectedCents),
    paidCents,
    paidCount,
    partiallyPaidCents,
    partiallyPaidCount,
    overdueCents,
    overdueCount,
    openInvoices,
    allInvoices,
  };
}
