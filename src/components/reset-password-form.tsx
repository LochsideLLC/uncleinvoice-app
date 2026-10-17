"use client";

import { useActionState } from "react";
import { resetPasswordAction } from "@/actions/auth";
import { FormBanner } from "@/components/form-banner";

export function ResetPasswordForm({ token, email }: { token: string; email: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, null);

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-6 pb-16">
      <h1 className="display text-center text-3xl">Choose a new password</h1>
      <p className="mt-2 text-center text-muted">
        For {email}. Saving it signs you in and signs out anywhere the old password was used.
      </p>
      <div className="paper mt-8 rounded-3xl p-6">
        <form action={action} className="space-y-4">
          <FormBanner state={state} />
          <input type="hidden" name="token" value={token} />
          {/* Here only so a password manager knows which login it belongs to. */}
          <input type="hidden" name="username" autoComplete="username" value={email} readOnly />
          <div className="field">
            <label className="text-center" htmlFor="password">
              New password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="At least 8 characters"
            />
          </div>
          <button className="btn btn-primary w-full" disabled={pending}>
            {pending ? "Saving…" : "Save and sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
