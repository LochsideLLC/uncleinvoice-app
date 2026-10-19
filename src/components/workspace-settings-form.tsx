"use client";

import { useActionState } from "react";
import { updateWorkspaceAction } from "@/actions/workspaces";
import { FormBanner } from "@/components/form-banner";

export function WorkspaceSettingsForm({
  workspace,
}: {
  workspace: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    addressLine: string | null;
    city: string | null;
    region: string | null;
    postalCode: string | null;
  };
}) {
  const [state, action, pending] = useActionState(updateWorkspaceAction, null);

  return (
    <form action={action} className="paper space-y-4 rounded-3xl p-6">
      <input type="hidden" name="workspaceId" value={workspace.id} />
      <FormBanner state={state} />
      <div className="field">
        <label htmlFor="name">Business name</label>
        <input id="name" name="name" required defaultValue={workspace.name} />
      </div>
      <div className="field">
        <label htmlFor="email">Office email</label>
        <input
          id="email"
          name="email"
          type="email"
          defaultValue={workspace.email ?? ""}
          placeholder="Only needed to email invoices"
        />
      </div>
      <div className="field">
        <label htmlFor="phone">Phone</label>
        <input id="phone" name="phone" defaultValue={workspace.phone ?? ""} />
      </div>
      <div className="field">
        <label htmlFor="addressLine">Street address</label>
        <input id="addressLine" name="addressLine" defaultValue={workspace.addressLine ?? ""} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="field">
          <label htmlFor="city">City</label>
          <input id="city" name="city" defaultValue={workspace.city ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="region">State</label>
          <input id="region" name="region" defaultValue={workspace.region ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="postalCode">ZIP</label>
          <input id="postalCode" name="postalCode" defaultValue={workspace.postalCode ?? ""} />
        </div>
      </div>
      <button className="btn btn-primary" disabled={pending}>
        Save
      </button>
    </form>
  );
}
