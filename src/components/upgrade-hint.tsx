"use client";

import { useState, useSyncExternalStore } from "react";
import { asPlan } from "@/lib/plan";
import { UpgradeOffer } from "@/components/upgrade-offer";

const subscribe = (callback: () => void) => {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
};

/** One offer after useful work; dismissal belongs to this account and plan. */
export function UpgradeHint({ plan, userId }: { plan?: string | null; userId: string }) {
  const current = asPlan(plan);
  const key = `uncleinvoice:offer:v2:${userId}:${current}`;
  const [dismissed, setDismissed] = useState(false);
  const stored = useSyncExternalStore(subscribe, () => {
    try { return localStorage.getItem(key) === "dismissed"; } catch { return false; }
  }, () => true);
  if (current !== "free" || dismissed || stored) return null;
  return <aside className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line px-5 py-4 print:hidden">
    <div>
      <p className="font-medium">Your invoice. Your business.</p>
      <p className="text-sm text-muted">See how your finished invoice looks without our credit.</p>
    </div>
    <div className="flex flex-wrap items-center gap-3">
      <UpgradeOffer feature="branding" className="text-sm underline underline-offset-4">Preview Invoice</UpgradeOffer>
      <button type="button" className="btn btn-ghost" onClick={() => {
        setDismissed(true);
        try { localStorage.setItem(key, "dismissed"); } catch { /* Dismiss for this visit when storage is unavailable. */ }
      }}>Dismiss</button>
    </div>
  </aside>;
}
