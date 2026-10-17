import Link from "next/link";
import { logoutAction } from "@/actions/auth";
import { AccountMenu } from "@/components/account-menu";
import { UncleStamp } from "@/components/brand-mark";

const navLink =
  "nav-link whitespace-nowrap rounded-lg px-2.5 py-2 text-detail font-medium";

export function SiteHeader({
  user,
}: {
  user?: {
    admin?: boolean;
    name?: string;
    businessLogoUrl?: string | null;
    businessWordmarkUrl?: string | null;
  } | null;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-5">
        <Link href="/" className="brand-home flex shrink-0 items-center gap-2.5">
          <UncleStamp className="h-9 w-9 shrink-0" />
          <span className="display hidden whitespace-nowrap text-xl leading-none xs:inline">
            Uncle Invoice
          </span>
        </Link>

        {user ? (
          <nav className="flex items-center gap-1">
            <Link href="/app" className={navLink}>
              Dashboard
            </Link>
            <Link href="/app/profile#upgrade" className={`${navLink} hidden sm:inline-flex`}>
              Upgrade
            </Link>
            {user.admin ? (
              <>
                <Link href="/admin/view-as" className={`${navLink} hidden md:inline-flex`}>
                  View as
                </Link>
                <Link href="/admin/accounts" className={`${navLink} hidden md:inline-flex`}>
                  Accounts
                </Link>
                <Link href="/admin/sponsors" className={`${navLink} hidden md:inline-flex`}>
                  Admin
                </Link>
              </>
            ) : null}
            <form action={logoutAction}>
              <button type="submit" className={navLink}>
                Sign out
              </button>
            </form>
            <AccountMenu
              name={user.name ?? "Account"}
              logoUrl={user.businessLogoUrl || user.businessWordmarkUrl}
              admin={user.admin}
            />
          </nav>
        ) : (
          <nav className="flex items-center gap-2">
            <Link href="/login" className={navLink}>
              Sign in
            </Link>
            <Link href="/signup" className="btn btn-primary btn-sm whitespace-nowrap">
              Create account
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
