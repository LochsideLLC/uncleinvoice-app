import { db } from "@/lib/db";
import { amountDue, invoiceGrandTotal } from "@/lib/money";
import { isInvoiceStatus } from "@/lib/status";

export type InvoiceRow = {
  id: string;
  number: string;
  workspaceId: string;
  canSend: boolean;
  clientName: string;
  status: string;
  totalCents: number;
  dueCents: number;
  isPaid: boolean;
  isPartiallyPaid: boolean;
  issueDate: Date;
  dueDate: Date | null;
  sentAt: Date | null;
  firstViewedAt: Date | null;
  lastViewedAt: Date | null;
  approximateViewCount: number;
  isOverdue: boolean;
  paymentStatus: "unpaid" | "partial" | "paid";
  stripePaymentState: string | null;
};

export type DashboardStats = {
  invoiceCount: number;
  sentCount: number;
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
    // This feeds the Contractor dashboard. A contractor sees only invoices
    // they issued; the Bookkeeper view separately shows the full client ledger.
    where: { contractor: { userId } },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          members: { where: { userId }, select: { userId: true }, take: 1 },
        },
      },
      lineItems: { select: { quantity: true, unitPrice: true, taxable: true } },
      payments: { where: { source: "stripe" }, orderBy: { updatedAt: "desc" }, take: 1, select: { status: true } },
    },
    orderBy: { issueDate: "desc" },
  });

  let sentCount = 0;
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
    const status = isInvoiceStatus(invoice.status) ? invoice.status : "draft";
    const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null;
    if (dueDate) dueDate.setHours(0, 0, 0, 0);
    const isOverdue = status === "sent" && !isPaid && dueCents > 0 && dueDate !== null && dueDate < today;
    const isDraft = status === "draft" || status === "awaiting_review";
    if (!isDraft) {
      totalInvoicedCents += totalCents;
      collectedCents += Math.min(Math.max(0, invoice.amountPaid), totalCents);
      if (isPaid) {
        paidCents += totalCents;
        paidCount += 1;
      } else if (isPartiallyPaid) {
        partiallyPaidCents += dueCents;
        partiallyPaidCount += 1;
      }
      if (isOverdue) {
        overdueCents += dueCents;
        overdueCount += 1;
      }
    }

    if (status === "sent") sentCount += 1;
    if (isDraft) draftCount += 1;

    const row: InvoiceRow = {
      id: invoice.id,
      number: invoice.number,
      workspaceId: invoice.workspace.id,
      canSend: invoice.workspace.members.length > 0,
      clientName: invoice.workspace.name,
      status,
      totalCents,
      dueCents,
      isPaid,
      isPartiallyPaid,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate ?? null,
      sentAt: invoice.sentAt ?? null,
      firstViewedAt: invoice.firstViewedAt ?? null,
      lastViewedAt: invoice.lastViewedAt ?? null,
      approximateViewCount: invoice.approximateViewCount,
      isOverdue,
      paymentStatus: isPaid ? "paid" : isPartiallyPaid ? "partial" : "unpaid",
      stripePaymentState: invoice.payments[0]?.status ?? null,
    };

    allInvoices.push(row);
    if (!isDraft && dueCents > 0) openInvoices.push(row);
  }

  return {
    invoiceCount: invoices.length - draftCount,
    sentCount,
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
