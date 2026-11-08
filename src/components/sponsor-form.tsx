"use client";

import { useActionState } from "react";
import {
  createSponsorAction,
  updateSponsorAction,
} from "@/actions/sponsors";
import { FormBanner } from "@/components/form-banner";
import { SaveButton, useSaveButton } from "@/components/save-button";

type SponsorValues = {
  id?: string;
  name: string;
  slug: string;
  tagline: string;
  about: string;
  url: string;
  email: string;
  phone: string;
  city: string;
  logoUrl: string;
  featured: boolean;
};

export function SponsorForm({ sponsor }: { sponsor?: SponsorValues }) {
  const action = sponsor ? updateSponsorAction : createSponsorAction;
  const [state, formAction, pending] = useActionState(action, null);
  const save = useSaveButton(state);

  return (
    <form action={formAction} onChange={save.markDirty} className="paper space-y-4 rounded-[1.4rem] p-6">
      {sponsor ? <input type="hidden" name="id" value={sponsor.id} /> : null}
      <FormBanner state={state} />
      <div className="field">
        <label htmlFor="name">Name</label>
        <input id="name" name="name" required defaultValue={sponsor?.name ?? ""} />
      </div>
      <div className="field">
        <label htmlFor="slug">Page URL</label>
        <input
          id="slug"
          name="slug"
          defaultValue={sponsor?.slug ?? ""}
          placeholder="bookkeeping-conroe"
        />
        <p className="text-xs text-muted">Leave blank to generate from the name. Lives at /sponsors/…</p>
      </div>
      <div className="field">
        <label htmlFor="tagline">Tagline</label>
        <input
          id="tagline"
          name="tagline"
          defaultValue={sponsor?.tagline ?? ""}
          placeholder="What they do, in one line"
        />
      </div>
      <div className="field">
        <label htmlFor="about">About</label>
        <textarea id="about" name="about" rows={5} defaultValue={sponsor?.about ?? ""} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="field">
          <label htmlFor="url">Website</label>
          <input id="url" name="url" required defaultValue={sponsor?.url ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="logoUrl">Logo URL</label>
          <input id="logoUrl" name="logoUrl" defaultValue={sponsor?.logoUrl ?? ""} />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" defaultValue={sponsor?.email ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="phone">Phone</label>
          <input id="phone" name="phone" defaultValue={sponsor?.phone ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="city">City</label>
          <input id="city" name="city" defaultValue={sponsor?.city ?? ""} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="featured" defaultChecked={sponsor?.featured ?? false} />
        Show in the featured row on the home page
      </label>
      {sponsor ? (
        <SaveButton pending={pending} save={save} label="Save sponsor" />
      ) : (
        <button className="btn btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Add sponsor"}
        </button>
      )}
    </form>
  );
}
