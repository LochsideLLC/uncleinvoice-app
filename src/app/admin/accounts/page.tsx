import { requireAdmin } from "@/lib/auth";
import { listAccountsForAdmin } from "@/lib/admin-accounts";
import { AdminAccountRow } from "@/components/admin-account-row";
import { CreateAccountForm } from "@/components/create-account-form";

export const metadata = { title: "Accounts — Uncle Invoice" };

export default async function AdminAccountsPage() {
  const admin = await requireAdmin();
  const accounts = (await listAccountsForAdmin()) ?? [];
  const archived = accounts.filter((a) => a.archivedAt);
  const live = accounts.filter((a) => !a.archivedAt);

  return (
    <div className="mx-auto w-full max-w-3xl px-6 pb-16">
      <h1 className="text-3xl">Accounts</h1>
      <p className="mt-3 text-muted">
        Archiving keeps everything an account owns but stops it signing in, by password,
        by Google, or by a link already sent. It can be undone. Deleting cannot, and is
        only offered for an account that owns nothing at all.
      </p>
      <p className="mt-2 text-sm text-muted">
        Signed in as {admin.name} ({admin.email}).
      </p>

      <div className="mt-8">
        <CreateAccountForm />
      </div>

      <div className="paper mt-8 overflow-hidden rounded-3xl">
        <ul>
          {live.map((account) => (
            <AdminAccountRow
              key={account.id}
              account={{
                id: account.id,
                name: account.name,
                email: account.email,
                admin: account.admin,
                archivedAt: account.archivedAt,
                isSelf: account.isSelf,
                clientCount: account._count.memberships,
                archiveBlocker: account.archiveBlocker,
                deleteBlocker: account.deleteBlocker,
                plan: account.plan,
                mustSetPassword: account.mustSetPassword,
              }}
            />
          ))}
        </ul>
      </div>

      {archived.length ? (
        <>
          <h2 className="mt-10 text-xl">Archived</h2>
          <div className="paper mt-4 overflow-hidden rounded-3xl">
            <ul>
              {archived.map((account) => (
                <AdminAccountRow
                  key={account.id}
                  account={{
                    id: account.id,
                    name: account.name,
                    email: account.email,
                    admin: account.admin,
                    archivedAt: account.archivedAt,
                    isSelf: account.isSelf,
                    clientCount: account._count.memberships,
                    archiveBlocker: account.archiveBlocker,
                    deleteBlocker: account.deleteBlocker,
                    plan: account.plan,
                    mustSetPassword: account.mustSetPassword,
                  }}
                />
              ))}
            </ul>
          </div>
        </>
      ) : null}
    </div>
  );
}
