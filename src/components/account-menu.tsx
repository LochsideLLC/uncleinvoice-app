"use client";

import { useEffect, useRef, useState } from "react";
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
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  // Clicking off the menu — or pressing Escape — closes it. A plain
  // <details> element stays open until its summary is clicked again.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open ]);

  return (
    <div ref={root} className="relative ml-1 shrink-0">
      <button
        type="button"
        aria-label="Account menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="block rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <AccountMark name={name} logoUrl={logoUrl} className="h-9 w-9" />
      </button>
      {open ? (
        <div className="paper absolute right-0 top-full z-50 mt-2 w-48 rounded-xl p-2">
          <p className="truncate px-3 py-2 text-detail font-semibold">{name}</p>
          <Link href="/app/profile" onClick={() => setOpen(false)} className="account-menu-item nav-link block rounded-lg px-3 py-2 font-medium">
            Profile
          </Link>
          <Link href="/app/payments" onClick={() => setOpen(false)} className="account-menu-item nav-link block rounded-lg px-3 py-2 font-medium">
            Payments
          </Link>
          <Link href="/app/notifications/settings" onClick={() => setOpen(false)} className="account-menu-item nav-link block rounded-lg px-3 py-2 font-medium">
            Notifications
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="account-menu-item nav-link block w-full rounded-lg px-3 py-2 text-left font-medium">
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
