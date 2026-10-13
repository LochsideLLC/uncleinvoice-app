"use client";

import { useActionState } from "react";
import { changePasswordAction } from "@/actions/account";
import { FormBanner } from "@/components/form-banner";

export function FirstPasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, null);

  return (
    <form action={action} className="paper mt-6 space-y-4 rounded-3xl p-6">
      <FormBanner state={state} />
      <div className="field">
        <label htmlFor="currentPassword">The temporary password you were given</label>
        <input id="currentPassword" name="currentPassword" type="password" required />
      </div>
      <div className="field">
        <label htmlFor="password">Your new password</label>
        <input id="password" name="newPassword" type="password" minLength={8} required />
        <p className="mt-1 text-xs text-muted">At least 8 characters.</p>
      </div>
      <button className="btn btn-primary" disabled={pending}>
        {pending ? "Saving…" : "Save my password"}
      </button>
    </form>
  );
}
