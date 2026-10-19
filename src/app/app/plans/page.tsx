import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { asWorkspaceKind, WORKSPACE_LABEL } from "@/lib/workspace-kind";
import { setWorkspaceKindAction } from "@/actions/account";
import { PlanMatrix } from "@/components/plan-matrix";

export const metadata = { title: "Workspaces — Uncle Invoice" };

const WORKSPACES = [
  {
    kind: "contractor",
    title: "Contractor workspace",
    price: "Free",
    blurb: "Create professional invoices, send them to customers, accept payments, and track what is paid.",
    cta: "Open Contractor workspace",
  },
  {
    kind: "bookkeeper",
    title: "Bookkeeper workspace",
    price: "Free",
    blurb: "Turn client payment records into draft invoices contractors verify and send. Track documentation across clients.",
    cta: "Open Bookkeeper workspace",
  },
] as const;

/**
 * Both workspaces are free — no checkout, no subscription. This page is the
 * chooser: pick a side, or keep both. The matrix below shows everything is
 * included everywhere.
 */
export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const user = await requireUser();
  const { welcome } = await searchParams;
  const active = asWorkspaceKind(user.workspaceKind);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10 px-6 sm:px-8">
      <header>
        <Link href="/app" className="text-sm text-muted underline">← Back to your invoices</Link>
        <h1 className="display mt-4 text-4xl">One account, two workspaces. Both free.</h1>
        <p className="mt-2 max-w-2xl text-muted">
          {welcome === "bookkeeper"
            ? "Welcome, bookkeeper. Your workspace is ready — open it below."
            : "No subscription, no checkout. Open either side whenever you need it — you can always use both."}
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {WORKSPACES.map((workspace) => (
          <section key={workspace.kind} className="paper space-y-3 rounded-3xl p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              {WORKSPACE_LABEL[workspace.kind]} · {workspace.price}
            </p>
            <h2 className="text-2xl">{workspace.title}</h2>
            <p className="text-sm text-muted">{workspace.blurb}</p>
            {active === workspace.kind ? (
              <p className="text-sm font-medium">You are here now.</p>
            ) : (
              <form action={setWorkspaceKindAction}>
                <input type="hidden" name="workspace" value={workspace.kind} />
                <button type="submit" className="btn btn-primary w-full">
                  {workspace.cta}
                </button>
              </form>
            )}
          </section>
        ))}
      </div>

      <section aria-label="Plan comparison" className="pb-10">
        <div className="overflow-x-auto">
          <PlanMatrix current={active} />
        </div>
      </section>
    </div>
  );
}
