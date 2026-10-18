import Link from "next/link";
import { logoutAction } from "@/actions/auth";
import { AccountMark } from "@/components/brand-mark";

export function AccountMenu({
  name,
  logoUrl,
}: {
  name: string;
  logoUrl?: string | null;
}) {
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
        <Link href="/app/profile" className="nav-link block rounded-lg px-3 py-2 text-detail font-medium">
          Profile
        </Link>
        <form action={logoutAction}>
          <button type="submit" className="nav-link block w-full rounded-lg px-3 py-2 text-left text-detail font-medium">
            Sign out
          </button>
        </form>
      </div>
    </details>
  );
}
