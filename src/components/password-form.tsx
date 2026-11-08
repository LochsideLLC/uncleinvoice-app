"use client";

import { useActionState } from "react";
import { changePasswordAction } from "@/actions/account";
import { FormBanner } from "@/components/form-banner";
import { SaveButton, useSaveButton } from "@/components/save-button";

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, action, pending] = useActionState(changePasswordAction, null);
  const save = useSaveButton(state);

  return (
    <form action={action} onChange={save.markDirty} className="paper compact-fields space-y-1 rounded-3xl p-6">
      <div>
        <h2 className="text-xl">Password</h2>
        <p className="mt-1 text-sm text-muted">
          {hasPassword
            ? "Enter your current password, then choose a new one."
            : "Choose a password for your account."}
        </p>
      </div>
      <FormBanner state={state} />
      {hasPassword ? (
        <div className="field">
          <label htmlFor="currentPassword">Current password</label>
          <input
            id="currentPassword"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            placeholder="Your current password"
          />
        </div>
      ) : null}
      <div className="field">
        <label htmlFor="newPassword">New password</label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="At least 8 characters"
        />
      </div>
      <div className="pt-3">
        <SaveButton pending={pending} save={save} label="Save new password" className="w-full" />
      </div>
    </form>
  );
}
