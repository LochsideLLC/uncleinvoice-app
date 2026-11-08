import Link from "next/link";
import type { listWorkspaces } from "@/lib/workspace";

type Membership = Awaited<ReturnType<typeof listWorkspaces>>[number];

/** A short client work queue, with setup actions kept out of its way. */
export function BookkeeperHome({
  memberships,
  awaitingByWorkspace,
  confirmedUnsentByWorkspace,
  paidAwaitingByWorkspace,
}: {
  memberships: Membership[];
  awaitingByWorkspace: Record<string, number>;
  confirmedUnsentByWorkspace: Record<string, number>;
  paidAwaitingByWorkspace: Record<string, number>;
}) {
  if (memberships.length === 0) {
    return (
      <section className="paper rounded-3xl p-5 sm:p-7">
        <h2 className="text-xl">Start with a client</h2>
        <p className="mt-2 max-w-xl text-muted">
          Add a business, then add its contractors and payment records.
        </p>
        <Link href="/app/workspaces/new" className="btn btn-primary mt-4">
          Add your first client
        </Link>
      </section>
    );
  }

  const awaitingTotal = Object.values(awaitingByWorkspace).reduce((sum, count) => sum + count, 0);
  const readyTotal = Object.values(confirmedUnsentByWorkspace).reduce((sum, count) => sum + count, 0);

  return (
    <div className="space-y-5">
      <section aria-label="Paperwork summary" className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-sm">
        <span><strong className="tabular-nums">{memberships.length}</strong> {memberships.length === 1 ? "client" : "clients"}</span>
        <span className="text-muted"><strong className="tabular-nums text-ink">{awaitingTotal}</strong> need contractor review</span>
        <span className="text-muted"><strong className="tabular-nums text-ink">{readyTotal}</strong> confirmed, not sent</span>
      </section>

      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-paper">
        {memberships.map(({ workspace, role }) => {
          const awaiting = awaitingByWorkspace[workspace.id] ?? 0;
          const ready = confirmedUnsentByWorkspace[workspace.id] ?? 0;
          const paidAwaiting = paidAwaitingByWorkspace[workspace.id] ?? 0;
          const actionLabel = awaiting > 0 ? `Review ${awaiting} invoices` : ready > 0 ? `Select ${ready} confirmed PDFs` : "Open work queue";

          return (
            <li key={workspace.id} className="p-4 sm:px-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <h2 className="truncate text-lg font-semibold">{workspace.name}</h2>
                    <span className="text-xs text-muted">{role}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {awaiting} need review <span aria-hidden>·</span> {ready} confirmed, not sent
                    {paidAwaiting > 0 ? <><span aria-hidden> · </span>{paidAwaiting} paid, paperwork pending</> : null}
                  </p>
                </div>
                <Link href={`/app/w/${workspace.id}/contractors`} className="btn btn-secondary min-h-11 w-full shrink-0 sm:w-auto">
                  {actionLabel}
                </Link>
              </div>
              <details className="mt-3 text-sm">
                <summary className="min-h-10 cursor-pointer py-2 text-muted">Client tools</summary>
                <div className="flex flex-wrap gap-x-5 gap-y-2 pb-1">
                  <Link href={`/app/w/${workspace.id}/import`} className="underline underline-offset-4">Import payments</Link>
                  <Link href={`/app/w/${workspace.id}/invoices`} className="underline underline-offset-4">All invoices</Link>
                  <Link href={`/app/w/${workspace.id}/settings`} className="underline underline-offset-4">Client settings</Link>
                </div>
              </details>
            </li>
          );
        })}
      </ul>

      <Link href="/app/workspaces/new" className="inline-flex min-h-10 items-center text-sm text-muted underline underline-offset-4">
        Add a client
      </Link>
    </div>
  );
}
