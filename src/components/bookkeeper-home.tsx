import Link from "next/link";
import { formatDate } from "@/lib/dates";
import type { listWorkspaces } from "@/lib/workspace";

type Membership = Awaited<ReturnType<typeof listWorkspaces>>[number];

type RecentImport = {
  id: string;
  message: string;
  createdAt: Date;
  invoice: {
    id: string;
    number: string;
    workspace: { id: string; name: string };
  };
};

/**
 * Bookkeeper workspace home: client documentation at a glance. Every number
 * comes from real records in the businesses this account belongs to:
 * per-client awaiting/verified invoice counts, money already received that
 * still lacks confirmed paperwork, and the latest spreadsheet imports.
 */
export function BookkeeperHome({
  memberships,
  awaitingByWorkspace,
  verifiedByWorkspace,
  paidAwaiting,
  recentImports,
}: {
  memberships: Membership[];
  awaitingByWorkspace: Record<string, number>;
  verifiedByWorkspace: Record<string, number>;
  paidAwaiting: number;
  recentImports: RecentImport[];
}) {
  const awaitingTotal = Object.values(awaitingByWorkspace).reduce((sum, n) => sum + n, 0);
  const verifiedTotal = Object.values(verifiedByWorkspace).reduce((sum, n) => sum + n, 0);
  const firstWorkspaceId = memberships[0]?.workspace.id;

  return (
    <div className="space-y-8">
      {memberships.length === 0 ? (
        <div className="flex flex-col items-center pt-2 text-center">
          <p className="max-w-xl text-muted">
            Add the first business you keep books for then import its payment
            records. Its contractors, drafts, and documentation status will
            live here.
          </p>
          <Link href="/app/workspaces/new" className="btn btn-primary btn-hero mt-4">
            Add Your First Client
          </Link>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {firstWorkspaceId && memberships.length === 1 ? (
            <Link href={`/app/w/${firstWorkspaceId}/import`} className="btn btn-primary">
              Import Payments
            </Link>
          ) : (
            <p className="max-w-xl text-center text-muted">
              Pick a client below, then choose Import payments to turn its
              payment records into draft invoices.
            </p>
          )}
          <Link href="/app/workspaces/new" className="btn btn-secondary">
            Add a client business
          </Link>
        </div>
      )}

      {memberships.length > 0 ? (
        <section className="space-y-3">
          <div>
            <p className="text-sm uppercase tracking-widest text-muted">Client documentation</p>
            <h2 className="mt-1 text-3xl">Outstanding paperwork</h2>
          </div>
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="paper rounded-3xl p-5">
              <dt className="text-sm text-muted">My clients</dt>
              <dd className="display mt-1 text-4xl">{memberships.length}</dd>
            </div>
            <div className="paper rounded-3xl p-5">
              <dt className="text-sm text-muted">Awaiting verification</dt>
              <dd className="display mt-1 text-4xl">{awaitingTotal}</dd>
            </div>
            <div className="paper rounded-3xl p-5">
              <dt className="text-sm text-muted">Verified invoices</dt>
              <dd className="display mt-1 text-4xl">{verifiedTotal}</dd>
            </div>
            <div className="paper rounded-3xl p-5">
              <dt className="text-sm text-muted">Paid, awaiting paperwork</dt>
              <dd className="display mt-1 text-4xl">{paidAwaiting}</dd>
              <dd className="mt-1 text-xs text-muted">Money in, no confirmed invoice yet</dd>
            </div>
          </dl>
        </section>
      ) : null}

      {memberships.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-3xl">My clients</h2>
          <ul className="space-y-3">
            {memberships.map(({ workspace, role }) => (
              <li key={workspace.id}>
                <div className="paper rounded-3xl p-6">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-2xl">{workspace.name}</h3>
                    <span className="text-xs uppercase tracking-wide text-muted">{role}</span>
                  </div>
                  <p className="mt-2 text-muted">{workspace.email}</p>
                  <p className="mt-4 text-sm text-muted">
                    {awaitingByWorkspace[workspace.id] ?? 0} awaiting verification ·{" "}
                    {verifiedByWorkspace[workspace.id] ?? 0} verified ·{" "}
                    {workspace._count.contractors} contractors
                  </p>
                  <p className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm font-medium">
                    <Link href={`/app/w/${workspace.id}/import`} className="underline underline-offset-4">
                      Import payments
                    </Link>
                    <Link href={`/app/w/${workspace.id}/contractors`} className="underline underline-offset-4">
                      Contractors
                    </Link>
                    <Link href={`/app/w/${workspace.id}/invoices`} className="underline underline-offset-4">
                      Contractor invoices
                    </Link>
                    <Link href={`/app/w/${workspace.id}`} className="underline underline-offset-4">
                      Documentation status
                    </Link>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {recentImports.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-3xl">Recent payment imports</h2>
          <ul className="paper divide-y divide-line rounded-3xl">
            {recentImports.map((event) => (
              <li key={event.id} className="flex flex-wrap items-baseline justify-between gap-2 px-6 py-4">
                <p className="text-sm">
                  <Link href={`/app/w/${event.invoice.workspace.id}/invoices`} className="font-medium underline underline-offset-4">
                    {event.invoice.workspace.name}
                  </Link>{" "}
                  <span className="text-muted">{event.message}</span>
                </p>
                <p className="text-xs text-muted">{formatDate(event.createdAt)}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
