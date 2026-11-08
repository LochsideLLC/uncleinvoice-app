"use client";

import { useActionState, type ReactNode } from "react";
import type { ActionState } from "@/actions/auth";
import { FormBanner } from "@/components/form-banner";
import { SaveButton, useSaveButton } from "@/components/save-button";

export function NotificationSettingsSaveForm({
  action,
  label,
  className,
  buttonClassName = "",
  children,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  label: string;
  className: string;
  buttonClassName?: string;
  children: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const save = useSaveButton(state);
  return (
    <form action={formAction} onChange={save.markDirty} className={className}>
      <FormBanner state={state} />
      {children}
      <SaveButton pending={pending} save={save} label={label} className={buttonClassName} />
    </form>
  );
}
