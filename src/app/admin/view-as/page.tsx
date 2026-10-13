import { db } from "@/lib/db";
import { requireAdmin, getViewAs } from "@/lib/auth";
import { startViewAsAction } from "@/actions/view-as";

export const metadata = { title: "View as — Uncle Invoice" };

export default async function ViewAsPage() {
  const admin = await requireAdmin();
  const viewing = await getViewAs();

  const users = await db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      admin: true,
      _count: { select: { memberships: true } },
    },
    orderBy: [{ admin: "desc" }, { email: "asc" }],
  });

  return (
    <div className="mx-auto w-full max-w-3xl px-6 pb-16">
      <h1 className="text-3xl">View as</h1>
      <p className="mt-3 text-muted">
        Open the product as one of these accounts sees it, so you can check what
        someone else is actually looking at. Nothing you do is hidden — a banner stays
        on screen until you switch back, and your own admin rights are unaffected.
      </p>
      <p className="mt-2 text-sm text-muted">
        Signed in as {admin.name} ({admin.email}).
      </p>

      <div className="paper mt-8 overflow-hidden rounded-3xl">
        <ul>
          {users.map((user) => (
            <li
              key={user.id}
              className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4 first:border-t-0"
            >
              <div className="min-w-0">
                <p className="font-medium">
                  {user.name}
                  {user.admin ? <span className="ml-2 text-xs text-muted">admin</span> : null}
                </p>
                <p className="truncate text-sm text-muted">
                  {user.email} · {user._count.memberships}{" "}
                  {user._count.memberships === 1 ? "client" : "clients"}
                </p>
              </div>
              {viewing?.target.id === user.id ? (
                <span className="text-sm text-muted">Currently viewing</span>
              ) : user.id === admin.id ? (
                <span className="text-sm text-muted">That is you</span>
              ) : (
                <form action={startViewAsAction}>
                  <input type="hidden" name="userId" value={user.id} />
                  <button className="btn btn-secondary">View as</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
