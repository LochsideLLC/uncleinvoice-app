"use client";

import { useState } from "react";
import type { ButtonHTMLAttributes } from "react";

type SaveResult = { ok?: boolean; error?: string } | null | undefined;

export function useSaveButton(state: SaveResult) {
  const [dirty, setDirty] = useState(false);
  const hasSaved = state?.ok === true;
  const feedback = dirty ? null : state?.error ? "error" : hasSaved ? "saved" : null;

  function markDirty() {
    setDirty(true);
  }

  function beginSave() {
    setDirty(false);
  }

  function reset() {
    setDirty(false);
  }

  return {
    dirty,
    hasSaved,
    feedback,
    markDirty,
    beginSave,
    reset,
    className: `border border-line ${hasSaved && !dirty ? "btn-save-success" : dirty ? "btn-save-dirty" : "btn-secondary"}`,
  };
}

export function SaveButton({
  pending,
  label = "Save",
  save,
  className = "",
  onClick,
  ...props
}: {
  pending: boolean;
  label?: string;
  save: ReturnType<typeof useSaveButton>;
  className?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">) {
  const text = pending ? "Saving…" : save.feedback === "saved" ? "Saved" : save.feedback === "error" ? "Not saved" : save.dirty ? label : save.hasSaved ? "Saved" : label;
  return (
    <button
      {...props}
      onClick={(event) => {
        const form = event.currentTarget.form;
        if (!form || form.checkValidity()) save.beginSave();
        onClick?.(event);
      }}
      className={`btn ${save.className} ${className}`.trim()}
      disabled={pending || props.disabled}
      aria-live="polite"
    >
      {text}
    </button>
  );
}
