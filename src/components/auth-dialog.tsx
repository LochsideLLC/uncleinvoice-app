"use client";

import { useRef, useState } from "react";
import { AuthCard, type AuthMode } from "@/components/auth-card";

/**
 * Header entry point: one button opens the real signup form in a modal —
 * no intermediate menu. Mode switches in place, claim and next carry over.
 */
export function AuthDialog({
  label = "Sign up / Sign in",
  buttonClassName = "btn btn-secondary w-full",
  initialMode = "signup",
  next = "",
  googleEnabled,
  devAccessEnabled = false,
  claim,
}: {
  label?: string;
  buttonClassName?: string;
  initialMode?: AuthMode;
  next?: string;
  googleEnabled: boolean;
  devAccessEnabled?: boolean;
  claim?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [openCount, setOpenCount] = useState(0);

  return (
    <>
      <button
        type="button"
        className={buttonClassName}
        onClick={() => {
          setOpenCount((count) => count + 1);
          dialogRef.current?.showModal();
        }}
      >
        {label}
      </button>
      <dialog
        ref={dialogRef}
        aria-label="Sign in or create an account"
        onClick={(event) => {
          if (event.target === event.currentTarget) dialogRef.current?.close();
        }}
        className="auth-dialog m-auto max-h-[calc(100dvh-1rem)] w-[calc(100%-1.5rem)] max-w-md overflow-y-auto rounded-3xl border border-line bg-background p-4 text-ink shadow-2xl backdrop:bg-ink/55 sm:p-6 print:hidden"
      >
        <button
          type="button"
          className="auth-dialog-close"
          aria-label="Close"
          title="Close"
          onClick={() => dialogRef.current?.close()}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
        <AuthCard
          key={openCount}
          initialMode={initialMode}
          next={next}
          googleEnabled={googleEnabled}
          devAccessEnabled={devAccessEnabled}
          claim={claim}
          embedded
        />
      </dialog>
    </>
  );
}
