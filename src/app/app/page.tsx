import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getDashboardStats } from "@/lib/dashboard";
import { listWorkspaces } from "@/lib/workspace";
import { DashboardTabs } from "@/components/dashboard-tabs";
import { ConfirmMyInvoices } from "@/components/confirm-my-invoices";
import { SendToClient } from "@/components/send-to-client";
import { db } from "@/lib/db";
import { formatMoney, invoiceGrandTotal } from "@/lib/money";

export default async function AppHomePage() {
  const user = await requireUser();
  // A login created on someone's behalf has a password a third party knows.
  // Nothing else happens until it is replaced.
  if (user.mustSetPassword) redirect("/app/set-password");
  const [memberships, stats] = await Promise.all([
    listWorkspaces(user.id),
    getDashboardStats(user.id),
  ]);

  // Invoices this person issued, as opposed to a client's books they help keep.
  const mine = await db.contractor.findMany({
    where: { userId: user.id },
    include: {
      workspace: { select: { name: true } },
      invoices: { where: { confirmedAt: null }, include: { lineItems: true } },
    },
  });
  const waiting = mine.flatMap((c) => c.invoices);
  const confirmed = mine.length
    ? await db.invoice.findMany({
        where: { contractorId: { in: mine.map((c) => c.id) }, confirmedAt: { not: null } },
        include: { lineItems: true },
      })
    : [];
  const confirmedTotal = confirmed.reduce(
    (sum, invoice) => sum + invoiceGrandTotal(invoice.lineItems, invoice.taxRateBps),
    0,
  );
  const alreadySent = confirmed.filter((invoice) => invoice.sentAt).length;
  const waitingTotal = waiting.reduce(
    (sum, invoice) => sum + invoiceGrandTotal(invoice.lineItems, invoice.taxRateBps),
    0,
  );
  const first = mine[0];

  return (
    <div className="space-y-8">
      {waiting.length > 0 && first ? (
        <ConfirmMyInvoices
          count={waiting.length}
          total={formatMoney(waitingTotal)}
          clientNames={[...new Set(mine.map((c) => c.workspace.name))]}
          contact={{
            email: first.email?.endsWith(".test") ? "" : (first.email ?? ""),
            phone: first.phone ?? "",
            addressLine: first.addressLine ?? "",
            city: first.city ?? "",
            region: first.region ?? "",
            postalCode: first.postalCode ?? "",
          }}
        />
      ) : null}

      {confirmed.length > 0 && first ? (
        <SendToClient
          clientName={first.workspace.name}
          count={confirmed.length}
          total={formatMoney(confirmedTotal)}
          alreadySent={alreadySent}
        />
      ) : null}

      <div className="flex flex-col items-center pt-2">
        <Link href="/create" className="btn btn-primary btn-hero">
          Create Invoice
        </Link>
      </div>
      <DashboardTabs stats={stats} memberships={memberships} />
    </div>
  );
}
