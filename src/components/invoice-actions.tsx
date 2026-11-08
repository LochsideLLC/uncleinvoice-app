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
  editHref,
  compact = false,
}: {
  pdfHref: string;
  showSignupNudge?: boolean;
  signupHref?: string;
  editHref?: string;
  compact?: boolean;
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
    <div className={`flex items-center justify-end ${compact ? "gap-1" : "gap-2"} print:hidden`}>
      {editHref ? (
        <Link href={editHref} className={`btn btn-ghost ${compact ? "h-9 w-9" : "h-11 w-11"} !p-0`} aria-label="Edit invoice" title="Edit invoice">
          <svg viewBox="0 0 20 20" className={compact ? "h-4 w-4" : "h-5 w-5"} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m12.8 3.2 4 4M3 17l3.8-.8L16.5 6.5a2.1 2.1 0 0 0-3-3L3.8 13.2 3 17Z" />
          </svg>
        </Link>
      ) : null}
      {/* The page above is the on-screen view; the PDF is a separate layout.
          This opens the real PDF inline so it can be checked before sending. */}
      <a
        href={pdfHref}
        target="_blank"
        rel="noopener"
        className={`btn btn-ghost ${compact ? "h-9 w-9" : "h-11 w-11"} !p-0`}
        aria-label="Preview PDF"
        title="See the PDF your customer will receive"
      >
        <svg viewBox="0 0 20 20" className={compact ? "h-4 w-4" : "h-5 w-5"} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M5 2.5h6l4 4v11H5v-15Z" />
          <path d="M11 2.5v4h4M7.5 11h5" />
          <circle cx="10" cy="13.5" r="2.2" />
          <path d="m11.6 15.1 1.6 1.6" />
        </svg>
      </a>
      <button type="button" className={`btn btn-ghost ${compact ? "h-9 w-9" : "h-11 w-11"} !p-0`} onClick={() => handleClick("print")} aria-label="Print invoice" title="Print invoice">
        <svg viewBox="0 0 20 20" className={compact ? "h-4 w-4" : "h-5 w-5"} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M6 6V2.8h8V6M6 14H4a1.5 1.5 0 0 1-1.5-1.5v-4A1.5 1.5 0 0 1 4 7h12a1.5 1.5 0 0 1 1.5 1.5v4A1.5 1.5 0 0 1 16 14h-2" />
          <path d="M6 11h8v6H6zM14.5 9.5h.01" />
        </svg>
      </button>
      <button
        type="button"
        className={`btn ${compact ? "btn-ghost h-9 w-9" : "btn-primary h-11 w-11"} !p-0`}
        onClick={() => handleClick("download")}
        aria-label="Download PDF"
        title="Download PDF"
      >
        <svg viewBox="0 0 20 20" className={compact ? "h-4 w-4" : "h-5 w-5"} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M10 2.5v10m-3.5-3.5L10 12.5l3.5-3.5M4 13.5v3h12v-3" />
        </svg>
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
