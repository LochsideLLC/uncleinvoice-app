"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";

const NUDGE_POINTS = [
  "Email invoices directly to your customers.",
  "See when customers view your invoices.",
  "Accept payments online with Stripe.",
  "Get notified when you get paid!",
  "Save and manage all your invoices in one place.",
];

export function InvoiceActions({
  pdfHref,
  showSignupNudge = false,
  signupHref = "/signup",
}: {
  pdfHref: string;
  showSignupNudge?: boolean;
  signupHref?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [intent, setIntent] = useState<"print" | "download">("print");
  const downloadHref = `${pdfHref}${pdfHref.includes("?") ? "&" : "?"}download=1`;

  function proceed(next: "print" | "download") {
    if (next === "print") {
      window.print();
      return;
    }
    // A real link navigation: this downloads a file, it is not a page route.
    const link = document.createElement("a");
    link.href = downloadHref;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function handleClick(next: "print" | "download") {
    if (!showSignupNudge) {
      proceed(next);
      return;
    }
    setIntent(next);
    dialogRef.current?.showModal();
  }

  function handleBypass() {
    dialogRef.current?.close();
    proceed(intent);
  }

  return (
    <div className="flex flex-wrap gap-3 print:hidden">
      <button type="button" className="btn btn-ghost" onClick={() => handleClick("print")}>
        Print
      </button>
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => handleClick("download")}
      >
        Download PDF
      </button>
      {showSignupNudge ? (
        <dialog
          ref={dialogRef}
          aria-labelledby={titleId}
          onClick={(event) => {
            if (event.target === event.currentTarget) dialogRef.current?.close();
          }}
          className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border border-line bg-paper p-0 text-ink shadow-2xl backdrop:bg-ink/55 print:hidden"
        >
          <div className="p-6 sm:p-8">
            <h2 id={titleId} className="text-2xl">
              Wait! Did you know&hellip;
            </h2>
            <p className="mt-2 text-muted">Sign up for FREE to unlock:</p>
            <ul className="mt-4 space-y-2">
              {NUDGE_POINTS.map((point) => (
                <li key={point} className="flex gap-2">
                  <span aria-hidden="true" className="text-accent">
                    ✓
                  </span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 font-semibold text-olive">
              100% free. No subscription. No credit card required.
            </p>
            <div className="mt-5 flex flex-col gap-3">
              <Link href={signupHref} className="btn btn-primary w-full">
                Create My Free Account →
              </Link>
              <button type="button" className="btn btn-secondary w-full" onClick={handleBypass}>
                {intent === "print" ? "Just Print" : "Just Download"}
              </button>
            </div>
          </div>
        </dialog>
      ) : null}
    </div>
  );
}
