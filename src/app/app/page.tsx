import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getDashboardStats } from "@/lib/dashboard";
import { listWorkspaces } from "@/lib/workspace";
import { asWorkspaceKind } from "@/lib/workspace-kind";
import { db } from "@/lib/db";
import { DashboardStats } from "@/components/dashboard-stats";
import { CustomersPanel } from "@/components/dashboard-tabs";
import { BookkeeperHome } from "@/components/bookkeeper-home";
import { WorkspaceDashboard } from "@/components/workspace-dashboard";

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
  const [memberships, stats] = await Promise.all([
    listWorkspaces(user.id),
    getDashboardStats(user.id),
  ]);

  // Bookkeeper documentation metrics, derived from real records in the
  // businesses this account belongs to.
  const wsIds = memberships.map((m) => m.workspace.id);
  const [awaitingByWorkspace, confirmedUnsentByWorkspace, paidAwaitingByWorkspace] =
    wsIds.length > 0
      ? await Promise.all([
          db.invoice.groupBy({
            by: ["workspaceId"],
            where: { workspaceId: { in: wsIds }, confirmedAt: null },
            _count: true,
          }),
          db.invoice.groupBy({
            by: ["workspaceId"],
            where: { workspaceId: { in: wsIds }, confirmedAt: { not: null }, sentAt: null },
            _count: true,
          }),
          db.invoice.groupBy({
            by: ["workspaceId"],
            where: { workspaceId: { in: wsIds }, confirmedAt: null, amountPaid: { gt: 0 } },
            _count: true,
          }),
        ])
      : [[], [], []];

  const createAction = (
    <Link href="/create" className="btn btn-primary min-h-10 w-full shrink-0 px-2 text-sm sm:min-h-11 sm:w-auto sm:px-4 sm:text-base">
      <span aria-hidden className="text-lg leading-none">+</span> Create Invoice
    </Link>
  );

  const invoices = (
    <>
      <DashboardStats stats={stats} />
    </>
  );

  const clients = <CustomersPanel memberships={memberships} />;

  const bookkeeper = (
    <BookkeeperHome
      memberships={memberships}
      awaitingByWorkspace={Object.fromEntries(
        awaitingByWorkspace.map((row) => [row.workspaceId, row._count]),
      )}
      confirmedUnsentByWorkspace={Object.fromEntries(
        confirmedUnsentByWorkspace.map((row) => [row.workspaceId, row._count]),
      )}
      paidAwaitingByWorkspace={Object.fromEntries(
        paidAwaitingByWorkspace.map((row) => [row.workspaceId, row._count]),
      )}
    />
  );

  return (
    <WorkspaceDashboard
      kind={kind}
      createAction={createAction}
      invoices={invoices}
      clients={clients}
      bookkeeper={bookkeeper}
    />
  );
}
