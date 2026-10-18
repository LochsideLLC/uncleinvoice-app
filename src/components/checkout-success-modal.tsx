"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { PLAN_LABEL, type PaidPlan } from "@/lib/plan";

const UNLOCKED_FEATURES: Record<PaidPlan, string[]> = {
  invoice: [
    "Your invoices no longer carry the Uncle Invoice credit.",
  ],
  bookkeeper: [
    "Invoices without the Uncle Invoice credit.",
    "Import spreadsheet payments and turn them into invoices.",
    "Send contractors links to review and confirm their invoices.",
    "Attach supporting documents to invoices.",
    "Download invoices in bulk.",
  ],
};

export function CheckoutSuccessModal({ plan }: { plan: PaidPlan | null }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="checkout-success-title"
      onClose={() => router.replace("/app/plans")}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl border border-line bg-paper p-0 text-ink shadow-2xl backdrop:bg-ink/55"
    >
      <div className="p-6 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-olive">
          Upgrade complete
        </p>
        <h2 id="checkout-success-title" className="mt-2 text-3xl">
          Thank you for upgrading!
        </h2>
        {plan ? (
          <>
            <p className="mt-3 text-muted">
              Your {PLAN_LABEL[plan]} plan is active. Here&rsquo;s what you&rsquo;ve unlocked:
            </p>
            <ul className="mt-5 space-y-3">
              {UNLOCKED_FEATURES[plan].map((feature) => (
                <li key={feature} className="flex gap-3">
                  <span aria-hidden="true" className="font-semibold text-olive">✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-3 text-muted">
            Your payment went through. We&rsquo;re finishing your plan setup now; your new features will appear shortly.
          </p>
        )}
        <button type="button" className="btn btn-primary mt-7 w-full sm:w-auto" onClick={() => dialogRef.current?.close()}>
          Continue
        </button>
      </div>
    </dialog>
  );
}
