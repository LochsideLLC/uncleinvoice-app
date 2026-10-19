"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signupAction } from "@/actions/auth";
import { ContinueWithGoogle } from "@/components/continue-with-google";
import { FormBanner } from "@/components/form-banner";

export function SignupForm({
  error,
  googleEnabled,
  claim,
  embedded = false,
  onSwitchMode,
}: {
  error?: string;
  googleEnabled: boolean;
  claim?: string;
  embedded?: boolean;
  onSwitchMode?: () => void;
}) {
  const [state, action, pending] = useActionState(signupAction, null);

  const banner = claim ? (
    <div className={`paper rounded-3xl border-olive p-6 text-center ${embedded ? "" : "mt-8"}`}>
      <p className="display text-2xl">Your invoice is ready!</p>
      <p className="mt-1 text-muted">
        Create your free account to save it and email it directly to your customer.
      </p>
    </div>
  ) : null;

  const switchLink = onSwitchMode ? (
    <button type="button" className="text-ink underline" onClick={onSwitchMode}>
      Sign in
    </button>
  ) : (
    <Link href={claim ? `/login?claim=${encodeURIComponent(claim)}` : "/login"} className="text-ink underline">
      Sign in
    </Link>
  );

  const card = (
    <>
        <h1 className="display text-center text-2xl">Create your free account</h1>
        <p className="mt-1 text-center text-sm text-muted">
          Send invoices, see when they&rsquo;re viewed, and get notified when you get
          paid.
        </p>
        {googleEnabled ? (
          <div className="mt-5">
            <ContinueWithGoogle from="/signup" claim={claim} />
            <div className="relative my-2 text-center text-sm text-muted">
              <span className={`relative z-10 px-2 ${embedded ? "bg-background" : "bg-paper"}`}>or continue with email</span>
              <span className="absolute inset-x-0 top-1/2 border-t border-line" />
            </div>
          </div>
        ) : null}
        <form action={action} className="mt-5 space-y-3">
          <FormBanner state={state ?? (error ? { error } : null)} />
          {claim ? <input type="hidden" name="claim" value={claim} /> : null}
          <div className="field">
            <label htmlFor="name">Your name</label>
            <input id="name" name="name" required autoComplete="name" placeholder="Jane Smith" />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required autoComplete="email" placeholder="jane@example.com" />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              placeholder="Create a password"
            />
          </div>
          <button className="btn btn-primary w-full" name="intent" value="password" disabled={pending}>
            Create free account
          </button>
          <button
            type="submit"
            className="w-full text-center text-sm text-muted underline"
            name="intent"
            value="magic"
            disabled={pending}
          >
            No password? Email me a sign-in link instead
          </button>
          <p className="text-center text-sm text-muted">
            Already have an account?{" "}
            {switchLink}
          </p>
        </form>
    </>
  );

  const body = (
    <>
      {banner}
      {embedded ? (
        <div className="mt-2">{card}</div>
      ) : (
        <div className="paper mt-6 rounded-3xl p-5 sm:p-6">{card}</div>
      )}
    </>
  );

  if (embedded) return body;
  return (
    <div className="mx-auto flex min-h-full w-full max-w-[440px] flex-col justify-center px-6 pb-16">
      {body}
    </div>
  );
}
