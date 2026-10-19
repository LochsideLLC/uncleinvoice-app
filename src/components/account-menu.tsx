import Link from "next/link";
import { logoutAction } from "@/actions/auth";
import { AccountMark } from "@/components/brand-mark";

export function AccountMenu({
  name,
  logoUrl,
  workspaceKind,
}: {
  name: string;
  logoUrl?: string | null;
  workspaceKind?: string | null;
}) {
  const active = workspaceKind === "bookkeeper" ? "bookkeeper" : "contractor";
  return (
    <details className="group relative ml-1 shrink-0">
      <summary
        aria-label="Account menu"
        className="list-none rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent [&::-webkit-details-marker]:hidden"
      >
        <AccountMark name={name} logoUrl={logoUrl} className="h-9 w-9" />
      </summary>
      <div className="paper absolute right-0 top-full z-50 mt-2 w-48 rounded-xl p-2">
        <p className="truncate px-3 py-2 text-detail font-semibold">{name}</p>
        <p className="px-3 pb-1 pt-2 text-detail font-semibold uppercase tracking-[0.1em] text-muted">Workspace</p>
        <Link href="/app?workspace=contractor" className="account-menu-item nav-link block rounded-lg px-3 py-2 font-medium">
          {active === "contractor" ? "✓ " : ""}Contractor
        </Link>
        <Link href="/app?workspace=bookkeeper" className="account-menu-item nav-link block rounded-lg px-3 py-2 font-medium">
          {active === "bookkeeper" ? "✓ " : ""}Bookkeeper
        </Link>
        <Link href="/app/profile" className="account-menu-item nav-link block rounded-lg px-3 py-2 font-medium">
          Profile
        </Link>
        <Link href="/app/payments" className="account-menu-item nav-link block rounded-lg px-3 py-2 font-medium">
          Payments
        </Link>
        <Link href="/app/notifications/settings" className="account-menu-item nav-link block rounded-lg px-3 py-2 font-medium">
          Notifications
        </Link>
        <form action={logoutAction}>
          <button type="submit" className="account-menu-item nav-link block w-full rounded-lg px-3 py-2 text-left font-medium">
            Sign out
          </button>
        </form>
      </div>
    </details>
  );
}
