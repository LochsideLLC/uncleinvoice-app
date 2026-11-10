"use client";

import { useEffect, useRef, useState } from "react";

export function BookkeeperModeIntro({
  open,
  onClose,
  onUnderstand,
}: {
  open: boolean;
  onClose: () => void;
  onUnderstand: (dontShowAgain: boolean) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="bookkeeper-mode-title"
      aria-describedby="bookkeeper-mode-description"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
      className="bookkeeper-mode-dialog paper w-[min(92vw,34rem)] max-w-none rounded-3xl p-0 text-ink backdrop:bg-black/40"
    >
      <section className="space-y-4 p-5 sm:p-7">
        <h2 id="bookkeeper-mode-title" className="display text-2xl sm:text-3xl">
          Bookkeeper mode
        </h2>
        <p id="bookkeeper-mode-description" className="text-muted">
          Use this mode to manage invoices for your contractor clients. You can:
        </p>
        <ul className="list-inside list-disc space-y-1 text-muted">
          <li>manage client businesses and contractors</li>
          <li>import payment records</li>
          <li>prepare invoice drafts for contractors to review</li>
          <li>track saved and sent invoices</li>
        </ul>
        <button
          type="button"
          className="btn btn-primary w-full"
          onClick={() => onUnderstand(dontShowAgain)}
        >
          I understand
        </button>
        <label className="flex min-h-11 cursor-pointer items-center justify-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(event) => setDontShowAgain(event.target.checked)}
            className="size-4 accent-[var(--accent)]"
          />
          Don’t show this again
        </label>
      </section>
    </dialog>
  );
}
