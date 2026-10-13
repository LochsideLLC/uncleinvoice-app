import Link from "next/link";
import { AccountMark } from "@/components/brand-mark";

export function AccountMenu({
  name,
  logoUrl,
}: {
  name: string;
  logoUrl?: string | null;
  admin?: boolean;
}) {
  return (
    <Link href="/app/profile" aria-label="Profile" className="ml-1 shrink-0 rounded-full">
      <AccountMark name={name} logoUrl={logoUrl} className="h-9 w-9" />
    </Link>
  );
}
