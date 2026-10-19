"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createWorkspaceAction } from "@/actions/workspaces";
import { FormBanner } from "@/components/form-banner";

export default function NewWorkspacePage() {
  const [state, action, pending] = useActionState(createWorkspaceAction, null);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link href="/app" className="text-sm text-muted">
        ← Customers &amp; clients
      </Link>
      <h1 className="text-3xl">Add a customer or client</h1>
      <p className="text-muted">
        Save a business you bill or keep books for. Use the email that should receive its invoices. Saving a business does not send anything.
      </p>
      <form action={action} className="paper space-y-4 rounded-3xl p-6">
        <FormBanner state={state} />
        <div className="field">
          <label htmlFor="name">Business name</label>
          <input id="name" name="name" required placeholder="Sunrise Cleaning Co." />
        </div>
        <div className="field">
          <label htmlFor="email">Office email</label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="Only needed to email invoices"
          />
        </div>
        <div className="field">
          <label htmlFor="phone">Phone</label>
          <input id="phone" name="phone" />
        </div>
        <div className="field">
          <label htmlFor="addressLine">Street address</label>
          <input id="addressLine" name="addressLine" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="field">
            <label htmlFor="city">City</label>
            <input id="city" name="city" />
          </div>
          <div className="field">
            <label htmlFor="region">State</label>
            <input id="region" name="region" />
          </div>
          <div className="field">
            <label htmlFor="postalCode">ZIP</label>
            <input id="postalCode" name="postalCode" />
          </div>
        </div>
        <button className="btn btn-primary" disabled={pending}>
          Save business
        </button>
      </form>
    </div>
  );
}
