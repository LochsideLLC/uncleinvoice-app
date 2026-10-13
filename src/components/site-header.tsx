import type { ReactNode } from "react";
import Link from "next/link";
import { logoutAction } from "@/actions/auth";
import { AccountMenu } from "@/components/account-menu";
import { UncleStamp } from "@/components/brand-mark";

export function SiteHeader({
  user,
  stampClassName = "h-16 w-16",
  extra,
}: {
  user?: {
    admin?: boolean;
    name?: string;
    businessLogoUrl?: string | null;
    businessWordmarkUrl?: string | null;
  } | null;
  stampClassName?: string;
  extra?: ReactNode;
}) {
  return (
    <header className="relative mb-6">
      <div className="pointer-events-none invisible flex flex-col items-center" aria-hidden>
        <span className="display text-2xl leading-none">Uncle Invoice</span>
        <div className={`mt-1.5 ${stampClassName}`} />
        <div className="mt-3 h-5" />
      </div>
      <div className="absolute left-[50vw] top-0 flex -translate-x-1/2 flex-col items-center text-center">
        <div className="flex flex-col items-center">
          <Link href="/" className="brand-home display text-2xl leading-none">
            Uncle Invoice
          </Link>
          {user ? (
            <AccountMenu
              name={user.name ?? "Account"}
              logoUrl={user.businessLogoUrl || user.businessWordmarkUrl}
              admin={user.admin}
              stampClassName={stampClassName}
            />
          ) : (
            <Link href="/" aria-label="Home">
              <UncleStamp className={`mt-1.5 ${stampClassName}`} />
            </Link>
          )}
        </div>
        {user ? (
          <nav className="mt-3 flex items-center gap-5 text-sm text-muted">
            <Link href="/app" className="hover:text-ink">
              Dashboard
            </Link>
            <Link href="/app/profile#upgrade" className="hover:text-ink">
              Upgrade
            </Link>
            {user.admin ? (
              <>
                <Link href="/admin/view-as" className="hover:text-ink">
                  View as
                </Link>
                <Link href="/admin/sponsors" className="hover:text-ink">
                  Admin
                </Link>
              </>
            ) : null}
            <form action={logoutAction}>
              <button type="submit" className="hover:text-ink">
                Sign Out
              </button>
            </form>
            {extra}
          </nav>
        ) : (
          <nav className="mt-3 flex items-center gap-5 text-sm text-muted">
            <Link href="/login" className="hover:text-ink">
              Sign In
            </Link>
            <span className="group/signup relative">
              <Link
                href="/signup"
                className="hover:text-ink"
                aria-describedby="signup-benefits"
              >
                Create Account
              </Link>
              <span
                id="signup-benefits"
                role="tooltip"
                className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-max max-w-[17rem] -translate-x-1/2 rounded-lg border border-line bg-paper px-2.5 py-1.5 text-center text-xs leading-snug text-ink opacity-0 shadow-md transition-opacity group-hover/signup:opacity-100 group-focus-within/signup:opacity-100"
              >
                Your logo on the invoice, saved templates, and a history you can open later.
              </span>
            </span>
            {extra}
          </nav>
        )}
      </div>
    </header>
  );
}
