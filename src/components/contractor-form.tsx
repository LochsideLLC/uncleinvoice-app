"use client";

import { useActionState } from "react";
import { createContractorAction } from "@/actions/contractors";
import { FormBanner } from "@/components/form-banner";
import { SaveButton, useSaveButton } from "@/components/save-button";

export function ContractorForm({ workspaceId }: { workspaceId: string }) {
  const [state, action, pending] = useActionState(createContractorAction, null);
  const save = useSaveButton(state);

  return (
    <form action={action} onChange={save.markDirty} className="paper h-fit space-y-4 rounded-3xl p-6">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <h2 className="text-2xl">Add a contractor</h2>
      <FormBanner state={state} />
      <div className="field">
        <label htmlFor="name">Name</label>
        <input id="name" name="name" required />
      </div>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" />
      </div>
      <div className="field">
        <label htmlFor="phone">Phone</label>
        <input id="phone" name="phone" />
      </div>
      <div className="field">
        <label htmlFor="notes">Notes</label>
        <textarea id="notes" name="notes" rows={2} />
      </div>
      <SaveButton pending={pending} save={save} label="Save contractor" />
    </form>
  );
}
