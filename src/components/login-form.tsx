"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { loginAction } from "@/actions/auth";
import { ContinueWithGoogle } from "@/components/continue-with-google";
import { FormBanner } from "@/components/form-banner";

export function LoginForm({
  next,
  error,
  googleEnabled,
  claim,
  embedded = false,
  onSwitchMode,
}: {
  next: string;
  error?: string;
  googleEnabled: boolean;
  claim?: string;
  embedded?: boolean;
  onSwitchMode?: () => void;
}) {
  const [state, action, pending] = useActionState(loginAction, null);
  // Held here only so "Forgot your password?" can carry the address across
  // rather than making someone type it twice.
  const [email, setEmail] = useState("");

  const switchLink = onSwitchMode ? (
    <button type="button" className="text-ink underline" onClick={onSwitchMode}>
      Create an account
    </button>
  ) : (
    <Link href={claim ? `/signup?claim=${encodeURIComponent(claim)}` : "/signup"} className="text-ink underline">
      Create an account
    </Link>
  );

  const heading = (
    <>
      <h1 className="display text-center text-3xl">Sign in</h1>
      <p className="mt-2 text-center text-muted">
        Use Google, your password, or a link in your email.
      </p>
    </>
  );

  const card = (
    <>
      <div className={embedded ? "mt-4" : ""}>
        {googleEnabled ? (
          <>
            <ContinueWithGoogle next={next} from="/login" claim={claim} />
            <div className="relative my-6 text-center text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              <span className={`relative z-10 px-2 ${embedded ? "bg-background" : "bg-paper"}`}>or</span>
              <span className="absolute inset-x-0 top-1/2 border-t border-line" />
            </div>
          </>
        ) : null}
        <form action={action} className="space-y-4">
          {next ? <input type="hidden" name="next" value={next} /> : null}
          {claim ? <input type="hidden" name="claim" value={claim} /> : null}
          <FormBanner state={state ?? (error ? { error } : null)} />
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
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="field">
            <label className="text-center" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
            />
            <p className="mt-1 text-center text-xs text-muted">
              <Link
                href={email ? `/forgot?email=${encodeURIComponent(email)}` : "/forgot"}
                className="text-ink underline"
              >
                Forgot your password?
              </Link>
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <button
              className="btn btn-primary w-full"
              name="intent"
              value="password"
              disabled={pending}
            >
              Sign in
            </button>
            <button
              className="btn btn-secondary w-full"
              name="intent"
              value="magic"
              disabled={pending}
            >
              Email me a link
            </button>
          </div>
        </form>
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        New here?{" "}
        {switchLink}
      </p>
    </>
  );

  const body = (
    <>
      {heading}
      {embedded ? (
        <div className="mt-2">{card}</div>
      ) : (
        <div className="paper mt-8 rounded-3xl p-6">{card}</div>
      )}
    </>
  );

  if (embedded) return body;
  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-6 pb-16">
      {body}
    </div>
  );
}
