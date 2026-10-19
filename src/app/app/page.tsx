import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getDashboardStats } from "@/lib/dashboard";
import { listWorkspaces } from "@/lib/workspace";
import { asWorkspaceKind } from "@/lib/workspace-kind";
import { db } from "@/lib/db";
import { DashboardTabs } from "@/components/dashboard-tabs";
import { BookkeeperHome } from "@/components/bookkeeper-home";
import { WorkspaceDashboard } from "@/components/workspace-dashboard";
import { DocumentIcon } from "@/components/workspace-icons";
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

  // ?workspace= switches modes and remembers the choice. Plain links
  // (onboarding, emails) use this query string; the dashboard toggle flips
  // client-side instead. Either way the same account keeps both modes:
  // entering one never closes the other, and re-entering never duplicates
  // anything.
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

  // Both modes' data loads in one parallel pass, so the toggle swaps theme
  // and content together with no server wait. Wall time is roughly the
  // slowest query, not the sum.
  const [memberships, stats, mine] = await Promise.all([
    listWorkspaces(user.id),
    getDashboardStats(user.id),
    // Invoices this person issued, as opposed to a client's books they keep.
    db.contractor.findMany({
      where: { userId: user.id },
      include: {
        workspace: { select: { name: true } },
        invoices: { where: { confirmedAt: null }, include: { lineItems: true } },
      },
    }),
  ]);
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

  // Bookkeeper documentation metrics, derived from real records in the
  // businesses this account belongs to.
  const wsIds = memberships.map((m) => m.workspace.id);
  const [awaitingByWorkspace, verifiedByWorkspace, paidAwaiting, recentImports] =
    wsIds.length > 0
      ? await Promise.all([
          db.invoice.groupBy({
            by: ["workspaceId"],
            where: { workspaceId: { in: wsIds }, confirmedAt: null },
            _count: true,
          }),
          db.invoice.groupBy({
            by: ["workspaceId"],
            where: { workspaceId: { in: wsIds }, confirmedAt: { not: null } },
            _count: true,
          }),
          db.invoice.count({
            where: { workspaceId: { in: wsIds }, confirmedAt: null, amountPaid: { gt: 0 } },
          }),
          db.invoiceEvent.findMany({
            where: {
              invoice: { workspaceId: { in: wsIds } },
              message: { startsWith: "Imported from spreadsheet" },
            },
            include: {
              invoice: {
                select: {
                  id: true,
                  number: true,
                  workspace: { select: { id: true, name: true } },
                },
              },
            },
            orderBy: { createdAt: "desc" },
            take: 5,
          }),
        ])
      : [[], [], 0, []];

  const contractor = (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span
            aria-hidden
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
            style={{
              background: "color-mix(in srgb, var(--accent) 12%, var(--paper))",
              color: "var(--accent)",
            }}
          >
            <DocumentIcon className="h-7 w-7" />
          </span>
          <div>
            <p className="text-sm uppercase tracking-[0.14em] text-muted">Contractor workspace</p>
            <h1 className="display text-4xl leading-tight">Your invoices</h1>
            <p className="mt-1 text-muted">Create invoices, manage customers, and track payments.</p>
          </div>
        </div>
        <Link href="/create" className="btn btn-primary shrink-0">
          <span aria-hidden className="text-xl leading-none">+</span> Create Invoice
        </Link>
      </div>

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

      <DashboardTabs stats={stats} memberships={memberships} />
    </>
  );

  const bookkeeper = (
    <BookkeeperHome
      memberships={memberships}
      awaitingByWorkspace={Object.fromEntries(
        awaitingByWorkspace.map((row) => [row.workspaceId, row._count]),
      )}
      verifiedByWorkspace={Object.fromEntries(
        verifiedByWorkspace.map((row) => [row.workspaceId, row._count]),
      )}
      paidAwaiting={paidAwaiting}
      recentImports={recentImports}
    />
  );

  return <WorkspaceDashboard kind={kind} contractor={contractor} bookkeeper={bookkeeper} />;
}
