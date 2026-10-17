"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordResetAction } from "@/actions/auth";
import { FormBanner } from "@/components/form-banner";

export function ForgotPasswordForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(requestPasswordResetAction, null);

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-6 pb-16">
      <h1 className="display text-center text-3xl">Forgot your password</h1>
      <p className="mt-2 text-center text-muted">
        Type the email you sign in with and we will send you a link to choose a new one.
      </p>
      <div className="paper mt-8 rounded-3xl p-6">
        <form action={action} className="space-y-4">
          <FormBanner state={state} />
          <div className="field">
            <label className="text-center" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              defaultValue={email}
            />
          </div>
          <button className="btn btn-primary w-full" disabled={pending}>
            {pending ? "Sending…" : "Send me a reset link"}
          </button>
        </form>
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        Remembered it?{" "}
        <Link href="/login" className="text-ink underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
