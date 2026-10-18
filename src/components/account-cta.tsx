"use client";

import { useId, useRef } from "react";
import Link from "next/link";

export function AccountCta({
  label = "Sign in / Sign up",
  buttonClassName = "btn btn-secondary w-full",
}: {
  label?: string;
  buttonClassName?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  return (
    <>
      <button
        type="button"
        className={buttonClassName}
        onClick={() => dialogRef.current?.showModal()}
      >
        {label}
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClick={(event) => {
          if (event.target === event.currentTarget)
            dialogRef.current?.close();
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-line bg-paper p-0 text-ink shadow-2xl backdrop:bg-ink/55"
      >
        <div className="p-6">
          <h2 id={titleId} className="text-2xl">
            Join Uncle Invoice
          </h2>
          <p className="mt-2 text-muted">
            Save your invoices and email them straight to clients.
          </p>
          <div className="mt-5 flex flex-col gap-3">
            <Link href="/signup" className="btn btn-primary w-full">
              Create free account
            </Link>
            <Link href="/login" className="btn btn-secondary w-full">
              Sign in
            </Link>
          </div>
          <button
            type="button"
            className="btn btn-ghost mt-3 w-full"
            onClick={() => dialogRef.current?.close()}
          >
            Close
          </button>
        </div>
      </dialog>
    </>
  );
}
