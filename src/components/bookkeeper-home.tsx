import Link from "next/link";
import type { listWorkspaces } from "@/lib/workspace";

type Membership = Awaited<ReturnType<typeof listWorkspaces>>[number];

/**
 * Bookkeeper workspace home: the client businesses this person keeps books
 * for, with entry points to import payments, review contractors, and pull
 * the finished set. Same components as the contractor side — no duplicates.
 */
export function BookkeeperHome({ memberships }: { memberships: Membership[] }) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-widest text-muted">Bookkeeper workspace · Free</p>
        <h1 className="display mt-1 text-3xl">The books you keep</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          How it works: add a client business, import its payment records, and
          Uncle Invoice drafts the invoices. Each contractor reviews and
          confirms their own, then the invoice goes to your client. Drafts that
          document payments already received never ask for payment again.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link href="/app/workspaces/new" className="btn btn-primary w-full">
          Add a client business
        </Link>
        <Link href="/create" className="btn btn-secondary w-full">
          Write an invoice yourself
        </Link>
      </div>

      {memberships.length === 0 ? (
        <div className="paper rounded-3xl p-8">
          <h2 className="text-2xl">No clients yet</h2>
          <p className="mt-2 max-w-xl text-muted">
            Add the first business you keep books for. Its payment imports,
            contractors, and documentation status will live here.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {memberships.map(({ workspace, role }) => (
            <li key={workspace.id}>
              <Link
                href={`/app/w/${workspace.id}`}
                className="paper block rounded-3xl p-6 transition hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-2xl">{workspace.name}</h2>
                  <span className="text-xs uppercase tracking-wide text-muted">{role}</span>
                </div>
                <p className="mt-2 text-muted">{workspace.email}</p>
                <p className="mt-4 text-sm text-muted">
                  {workspace._count.contractors} contractors · {workspace._count.invoices} invoices
                </p>
                <p className="mt-3 flex flex-wrap gap-3 text-sm font-medium">
                  <span className="underline underline-offset-4">Import payments</span>
                  <span className="underline underline-offset-4">Contractors</span>
                  <span className="underline underline-offset-4">Invoices</span>
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
