"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signupAction } from "@/actions/auth";
import { ContinueWithGoogle } from "@/components/continue-with-google";
import { FormBanner } from "@/components/form-banner";

export function SignupForm({
  error,
  googleEnabled,
  initialAccountType,
}: {
  error?: string;
  googleEnabled: boolean;
  initialAccountType?: string;
}) {
  const [state, action, pending] = useActionState(signupAction, null);
  const [accountType, setAccountType] = useState(initialAccountType ?? "");

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-6 pb-16">
      <h1 className="display text-3xl">Create your account</h1>
      <p className="mt-2 text-muted">
        Bookkeepers and business owners start here. Contractors usually arrive from a
        review link — no signup required.
      </p>
      <div className="paper mt-8 rounded-3xl p-6">
        <form action={action} className="space-y-4">
          <FormBanner state={state ?? (error ? { error } : null)} />
          <div className="field">
            <label htmlFor="accountType">Which best describes you?</label>
            <select id="accountType" name="accountType" required value={accountType} onChange={(event) => setAccountType(event.target.value)}>
              <option value="" disabled>Choose one</option>
              <option value="contractor">Contractor</option>
              <option value="bookkeeper">Bookkeeper</option>
              <option value="other">Other</option>
            </select>
          </div>
          {accountType === "bookkeeper" ? (
            <p className="rounded-xl bg-paper-2 p-4 text-sm text-muted">
              The Bookkeeper upgrade helps turn payment exports into invoices contractors can review and send. {" "}
              <Link href="/upgrades/bookkeeper" className="text-ink underline">See how the Bookkeeper upgrade works</Link>.
            </p>
          ) : null}
          {googleEnabled ? (
            <>
              <ContinueWithGoogle from="/signup" accountType={accountType} disabled={!accountType} />
              <div className="relative my-2 text-center text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                <span className="relative z-10 bg-paper px-2">or</span>
                <span className="absolute inset-x-0 top-1/2 border-t border-line" />
              </div>
            </>
          ) : null}
          <div className="field">
            <label htmlFor="name">Your name</label>
            <input id="name" name="name" required autoComplete="name" />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button className="btn btn-primary" name="intent" value="password" disabled={pending}>
              Create account
            </button>
            <button className="btn btn-secondary" name="intent" value="magic" disabled={pending}>
              Use a sign-in link instead
            </button>
          </div>
        </form>
      </div>
      <p className="mt-6 text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-ink underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
