import Link from "next/link";
import { AccountCta } from "@/components/account-cta";
import { AccountMenu } from "@/components/account-menu";
import { UncleStamp } from "@/components/brand-mark";
import { asPlan } from "@/lib/plan";

const navLink =
  "nav-link whitespace-nowrap rounded-lg px-2.5 py-2 text-detail font-medium";

export function SiteHeader({
  user,
  unreadNotifications = 0,
}: {
  user?: {
    admin?: boolean;
    plan?: string | null;
    name?: string;
    businessLogoUrl?: string | null;
    businessWordmarkUrl?: string | null;
  } | null;
  unreadNotifications?: number;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-2 px-3 sm:gap-4 sm:px-5">
        <Link href="/" className="brand-home flex shrink-0 items-center gap-2.5">
          <UncleStamp className="h-9 w-9 shrink-0" />
          <span className="display hidden whitespace-nowrap text-xl leading-none xs:inline">
            Uncle Invoice
          </span>
        </Link>

        {user ? (
          <nav className="flex items-center gap-1">
            <Link href="/how-it-works" className={`${navLink} hidden sm:inline-flex`}>
              How it works
            </Link>
            <Link href="/app" className={navLink}>
              Dashboard
            </Link>
            <Link
              href="/app/plans"
              className="btn btn-sm btn-sparkle whitespace-nowrap"
            >
              {asPlan(user.plan) === "bookkeeper" ? "Your plan" : "Unlock features"}
            </Link>
            <Link href="/app/whats-new" className={`${navLink} hidden lg:inline-flex`}>
              What&rsquo;s new
            </Link>
            <Link href="/app/notifications" className="relative rounded-lg p-2 text-muted hover:text-ink" aria-label={`${unreadNotifications} unread notifications`}>
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                <path d="M10 21h4" />
              </svg>
              {unreadNotifications ? <span className="absolute right-0 top-0 min-w-4 rounded-full bg-accent px-1 text-center text-[10px] leading-4 text-white">{Math.min(unreadNotifications, 99)}</span> : null}
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
            <AccountMenu
              name={user.name ?? "Account"}
              logoUrl={user.businessLogoUrl || user.businessWordmarkUrl}
            />
          </nav>
        ) : (
          <nav className="flex items-center gap-2">
            <Link href="/how-it-works" className={`${navLink} hidden sm:inline-flex`}>
              How it works
            </Link>
            <AccountCta buttonClassName="btn btn-primary btn-sm whitespace-nowrap" />
          </nav>
        )}
      </div>
    </header>
  );
}
