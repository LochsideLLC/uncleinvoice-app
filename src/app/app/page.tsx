import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getDashboardStats } from "@/lib/dashboard";
import { listWorkspaces } from "@/lib/workspace";
import { asWorkspaceKind } from "@/lib/workspace-kind";
import { db } from "@/lib/db";
import { DashboardTabs } from "@/components/dashboard-tabs";
import { BookkeeperHome } from "@/components/bookkeeper-home";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import { ConfirmMyInvoices } from "@/components/confirm-my-invoices";
import { SendToClient } from "@/components/send-to-client";
import { formatMoney, invoiceGrandTotal } from "@/lib/money";

export default async function AppHomePage({
  searchParams,
}: {
  searchParams: Promise<{ workspace?: string }>;
}) {
  const user = await requireUser();
  // A login created on someone's behalf has a password a third party knows.
  // Nothing else happens until it is replaced.
  if (user.mustSetPassword) redirect("/app/set-password");

  // ?workspace= switches modes and remembers the choice. The switcher posts
  // a form; plain links (onboarding, emails) use this query string. Either
  // way the same account keeps both modes: entering one never closes the
  // other, and re-entering never duplicates anything.
  //
  // The header renders from the user row before this page runs, so persisting
  // here would leave it showing the old mode for one request. Redirecting to
  // a clean /app re-renders everything from the stored choice instead.
  const requested = (await searchParams).workspace;
  if (requested === "contractor" || requested === "bookkeeper") {
    const kind = asWorkspaceKind(requested);
    const flag = kind === "bookkeeper" ? "bookkeeperOnboardedAt" : "contractorOnboardedAt";
    if (user.workspaceKind !== kind || !user[flag]) {
      await db.user.update({
        where: { id: user.id },
        data: { workspaceKind: kind, [flag]: new Date() },
      });
    }
    redirect("/app");
  }
  const kind = asWorkspaceKind(user.workspaceKind);

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
      <WorkspaceSwitcher active={kind} />

      {kind === "bookkeeper" ? (
        <BookkeeperHome memberships={memberships} />
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
