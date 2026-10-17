"use client";

import { useActionState, useState } from "react";
import {
  archiveAccountAction,
  deleteAccountAction,
  restoreAccountAction,
  setPlanAction,
} from "@/actions/admin-accounts";
import { FormBanner } from "@/components/form-banner";
import { PLANS, PLAN_LABEL } from "@/lib/plan";

export type AdminAccount = {
  id: string;
  name: string;
  email: string;
  admin: boolean;
  archivedAt: Date | null;
  isSelf: boolean;
  clientCount: number;
  archiveBlocker: string | null;
  deleteBlocker: string | null;
  plan: string;
  mustSetPassword: boolean;
};

export function AdminAccountRow({ account }: { account: AdminAccount }) {
  const [archiveState, archive, archiving] = useActionState(archiveAccountAction, null);
  const [restoreState, restore, restoring] = useActionState(restoreAccountAction, null);
  const [deleteState, remove, removing] = useActionState(deleteAccountAction, null);
  const [planState, setPlan, settingPlan] = useActionState(setPlanAction, null);
  const [confirming, setConfirming] = useState(false);

  const archived = Boolean(account.archivedAt);
  const state = archiveState ?? restoreState ?? deleteState ?? planState;

  return (
    <li className="border-t border-line px-5 py-4 first:border-t-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">
            {account.name}
            {account.admin ? <span className="ml-2 text-xs text-muted">admin</span> : null}
            {archived ? (
              <span className="ml-2 rounded-full bg-[#f3dcc0] px-2 py-0.5 text-xs text-[#7a3a22]">
                archived
              </span>
            ) : null}
          </p>
          <p className="truncate text-sm text-muted">
            {account.email} · {account.clientCount}{" "}
            {account.clientCount === 1 ? "client" : "clients"} · {PLAN_LABEL[
              (PLANS as readonly string[]).includes(account.plan)
                ? (account.plan as (typeof PLANS)[number])
                : "free"
            ]}
            {account.mustSetPassword ? " · must change password" : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {account.isSelf ? <span className="text-sm text-muted">That is you</span> : null}

          <form action={setPlan} className="flex items-center gap-1">
            <input type="hidden" name="userId" value={account.id} />
            <label className="sr-only" htmlFor={`plan-${account.id}`}>
              Plan
            </label>
            <select
              id={`plan-${account.id}`}
              name="plan"
              defaultValue={account.plan}
              disabled={settingPlan}
              onChange={(event) => event.currentTarget.form?.requestSubmit()}
            >
              {PLANS.map((plan) => (
                <option key={plan} value={plan}>
                  {PLAN_LABEL[plan]}
                </option>
              ))}
            </select>
          </form>

          {archived ? (
            <form action={restore}>
              <input type="hidden" name="userId" value={account.id} />
              <button className="btn btn-secondary" disabled={restoring}>
                {restoring ? "Restoring…" : "Restore"}
              </button>
            </form>
          ) : (
            <form action={archive}>
              <input type="hidden" name="userId" value={account.id} />
              <button
                className="btn btn-secondary"
                disabled={archiving || Boolean(account.archiveBlocker)}
                title={account.archiveBlocker ?? undefined}
              >
                {archiving ? "Archiving…" : "Archive"}
              </button>
            </form>
          )}

          {account.deleteBlocker ? (
            // Disabled rather than hidden, so the reason is visible on hover
            // instead of the button silently not being there.
            <button className="btn btn-secondary" disabled title={account.deleteBlocker}>
              Delete
            </button>
          ) : confirming ? null : (
            <button className="btn btn-secondary" onClick={() => setConfirming(true)}>
              Delete
            </button>
          )}
        </div>
      </div>

      {account.deleteBlocker ? (
        <p className="mt-2 text-xs text-muted">{account.deleteBlocker}</p>
      ) : null}

      {confirming && !account.deleteBlocker ? (
        <form action={remove} className="mt-3 rounded-2xl bg-[#f7ecd9] p-4">
          <p className="text-sm">
            This cannot be undone. Type <strong>{account.email}</strong> to confirm.
          </p>
          <input type="hidden" name="userId" value={account.id} />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              name="confirmEmail"
              type="email"
              required
              autoComplete="off"
              placeholder={account.email}
              className="min-w-[16rem] flex-1"
            />
            <button className="btn btn-primary" disabled={removing}>
              {removing ? "Deleting…" : "Delete for good"}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setConfirming(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {state?.error ? <div className="mt-3"><FormBanner state={state} /></div> : null}
      {state?.ok ? <FormBanner state={state} /> : null}
    </li>
  );
}
