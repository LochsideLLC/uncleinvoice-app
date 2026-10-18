"use client";

import { useId, useRef } from "react";
import { useRouter } from "next/navigation";
import { UPGRADE_OFFERS, upgradeHref, type UpgradeFeature } from "@/lib/upgrade";
import { PLAN_LABEL } from "@/lib/plan";

/** Only opens on request. Native dialog preserves focus, Escape and the underlying form. */
export function UpgradeOffer({ feature, children, preview, className = "btn btn-secondary" }: {
  feature: UpgradeFeature;
  children: React.ReactNode;
  preview?: React.ReactNode;
  className?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const keepWorking = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const router = useRouter();
  const offer = UPGRADE_OFFERS[feature];
  return <>
    <button type="button" className={className} onClick={() => { dialog.current?.showModal(); keepWorking.current?.focus(); }}>{children}</button>
    <dialog ref={dialog} aria-labelledby={titleId} className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-3xl border border-line bg-paper p-6 text-ink shadow-xl backdrop:bg-ink/40">
      <p className="text-sm text-muted">{PLAN_LABEL[offer.plan]} plan</p>
      <h2 id={titleId} className="mt-2 text-3xl">{offer.title}</h2>
      <p className="mt-3 text-muted">{offer.description}</p>
      {preview && <div className="mt-5">{preview}</div>}
      <p className="mt-3 text-sm text-muted">Plans open in a new tab, so your work stays here. Pricing is available by email; opening an offer does not change your plan.</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <a href={upgradeHref(feature)} target="_blank" rel="noopener noreferrer" className="btn btn-primary">Explore {PLAN_LABEL[offer.plan]} <span className="sr-only">(opens in a new tab)</span></a>
        <button ref={keepWorking} type="button" className="btn btn-ghost" onClick={() => dialog.current?.close()}>Keep working</button>
      </div>
      <button type="button" className="mt-4 text-sm underline" onClick={() => { dialog.current?.close(); router.refresh(); }}>Already upgraded? Refresh my plan</button>
    </dialog>
  </>;
}

export function FeatureGate({ feature }: { feature: UpgradeFeature }) {
  const offer = UPGRADE_OFFERS[feature];
  return <section className="paper rounded-3xl p-6 sm:p-8">
    <p className="text-sm text-muted">Included with Bookkeeper</p>
    <h2 className="mt-2 text-3xl">{offer.title}</h2>
    <p className="mt-3 max-w-xl text-muted">{offer.description}</p>
    <div className="mt-5"><UpgradeOffer feature={feature}>See how it works</UpgradeOffer></div>
  </section>;
}
