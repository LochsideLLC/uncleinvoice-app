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
  claim,
}: {
  label?: string;
  buttonClassName?: string;
  initialMode?: AuthMode;
  next?: string;
  googleEnabled: boolean;
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
        aria-label={initialMode === "signup" ? "Create your free account" : "Sign in"}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialogRef.current?.close();
        }}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-3xl border border-line bg-background p-6 text-ink shadow-2xl backdrop:bg-ink/55 print:hidden"
      >
        <AuthCard
          key={openCount}
          initialMode={initialMode}
          next={next}
          googleEnabled={googleEnabled}
          claim={claim}
          embedded
        />
      </dialog>
    </>
  );
}
