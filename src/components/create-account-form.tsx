"use client";

import { useActionState } from "react";
import { createAccountAction } from "@/actions/admin-accounts";
import { FormBanner } from "@/components/form-banner";
import { PLANS, PLAN_LABEL } from "@/lib/plan";

export function CreateAccountForm() {
  const [state, action, pending] = useActionState(createAccountAction, null);

  return (
    <form action={action} className="paper space-y-4 rounded-3xl p-6">
      <div>
        <h2 className="text-xl">Create an account</h2>
        <p className="mt-1 text-sm text-muted">
          Makes a login on someone else&rsquo;s behalf. They are made to replace the
          temporary password the first time they sign in.
        </p>
      </div>
      <FormBanner state={state} />
      {/* The one-time password comes back in the banner, so show it as text
          that can be read rather than letting it vanish on a timer. */}
      {state?.ok && state.message ? (
        <p className="rounded-xl bg-[#f7ecd9] px-3 py-2 text-sm">{state.message}</p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="field">
          <label htmlFor="new-name">Name</label>
          <input id="new-name" name="name" required placeholder="Christina Graves" />
        </div>
        <div className="field">
          <label htmlFor="new-email">Email</label>
          <input id="new-email" name="email" type="email" required placeholder="name@example.com" />
        </div>
        <div className="field">
          <label htmlFor="new-plan">Plan</label>
          <select id="new-plan" name="plan" defaultValue="free">
            {PLANS.map((plan) => (
              <option key={plan} value={plan}>
                {PLAN_LABEL[plan]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="new-password">Temporary password</label>
          <input
            id="new-password"
            name="password"
            type="text"
            autoComplete="off"
            minLength={8}
            placeholder="Leave blank to generate one"
          />
        </div>
      </div>
      <button className="btn btn-primary" disabled={pending}>
        {pending ? "Creating…" : "Create account"}
      </button>
    </form>
  );
}
