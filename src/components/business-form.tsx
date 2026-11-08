"use client";

import { useActionState, useState } from "react";
import {
  removeBusinessLogoAction,
  updateBusinessAction,
  updateBusinessLogoAction,
  updateBusinessLogoKindAction,
} from "@/actions/account";
import { FormBanner } from "@/components/form-banner";
import { SaveButton, useSaveButton } from "@/components/save-button";
import { ImageDropzone, fileToDataUrl } from "@/components/image-dropzone";
import { formatUsPhone, US_STATES } from "@/lib/us-address";

/** Largest original file accepted. It is resized in the browser before saving. */
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

export function BusinessForm({
  businessName,
  businessEmail,
  businessLogoUrl,
  businessWordmarkUrl,
  businessLogoKind = "mark",
  phone,
  addressLine,
  addressLine2,
  city,
  region,
  postalCode,
}: {
  businessName?: string | null;
  businessEmail?: string | null;
  businessLogoUrl?: string | null;
  businessWordmarkUrl?: string | null;
  businessLogoKind?: string | null;
  phone?: string | null;
  addressLine?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
}) {
  const [state, action, pending] = useActionState(updateBusinessAction, null);
  const [logoState, logoAction, logoPending] = useActionState(updateBusinessLogoAction, null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const save = useSaveButton(state);
  const [kind, setKind] = useState(businessLogoKind === "wide" ? "wide" : "mark");
  const [phoneValue, setPhoneValue] = useState(formatUsPhone(phone ?? ""));

  async function onLogoFile(which: "mark" | "wide", file: File) {
    setLogoError(null);
    if (!file.type.startsWith("image/")) {
      setLogoError("Choose a JPG or PNG logo.");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      const mb = (file.size / (1024 * 1024)).toFixed(1);
      setLogoError(`That file is ${mb} MB. Logos can be up to 2 MB. Try a smaller or more compressed image.`);
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      const form = new FormData();
      form.set("logoUrl", dataUrl);
      form.set("kind", which);
      logoAction(form);
      setKind(which);
    } catch {
      setLogoError("Could not read that image. Try a JPG or PNG.");
    }
  }

  function pickKind(next: "mark" | "wide") {
    setKind(next);
    void updateBusinessLogoKindAction(next);
  }

  return (
    <form
      action={action}
      onChange={save.markDirty}
      className="paper compact-fields space-y-1 rounded-3xl p-6"
    >
      <div>
        <h2 className="text-xl">Who gets paid</h2>
        <p className="mt-1 text-sm text-muted">
          This is the name and contact on the invoice. Use your name, or a company name
          if you have one.
        </p>
      </div>
      <FormBanner state={logoError ? { error: logoError } : logoState ?? (state?.error ? state : null)} />
      <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3">
        <ImageDropzone
          label="Mark"
          hint="Square, 1:1"
          variant="square"
          value={businessLogoUrl}
          pending={logoPending}
          onFile={(file) => onLogoFile("mark", file)}
          onRemove={
            businessLogoUrl
              ? () => {
                  const form = new FormData();
                  form.set("kind", "mark");
                  void removeBusinessLogoAction(form);
                }
              : undefined
          }
        />
        <ImageDropzone
          label="Wide logo"
          hint="Horizontal, 4:1"
          variant="wide"
          value={businessWordmarkUrl}
          pending={logoPending}
          onFile={(file) => onLogoFile("wide", file)}
          onRemove={
            businessWordmarkUrl
              ? () => {
                  const form = new FormData();
                  form.set("kind", "wide");
                  void removeBusinessLogoAction(form);
                }
              : undefined
          }
        />
      </div>
      <p className="text-xs text-muted">
        Mark: square (1:1), 512 × 512 px. Wide logo: 4:1, 640 × 160 px or larger.
        JPG or PNG, up to 2 MB. Larger images are shrunk to fit automatically.
      </p>
      <fieldset className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <legend className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted">
          Use on invoices
        </legend>
        <label className="inline-flex items-center gap-1.5">
          <input
            type="radio"
            name="businessLogoKind"
            value="mark"
            checked={kind === "mark"}
            onChange={() => pickKind("mark")}
          />
          Square mark
        </label>
        <label className="inline-flex items-center gap-1.5">
          <input
            type="radio"
            name="businessLogoKind"
            value="wide"
            checked={kind === "wide"}
            onChange={() => pickKind("wide")}
          />
          Wide logo
        </label>
      </fieldset>
      <div className="field">
        <label htmlFor="businessName">Name or company</label>
        <input
          id="businessName"
          name="businessName"
          defaultValue={businessName ?? ""}
          autoComplete="organization"
          placeholder="Who should they write the check to?"
        />
      </div>
      <div className="field">
        <label htmlFor="businessEmail">Email</label>
        <input
          id="businessEmail"
          name="businessEmail"
          type="email"
          defaultValue={businessEmail ?? ""}
          autoComplete="email"
          placeholder="Where they can write you back"
        />
      </div>
      <div className="field">
        <label htmlFor="phone">Phone</label>
        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phoneValue}
          onChange={(event) => setPhoneValue(formatUsPhone(event.target.value))}
          placeholder="(555) 555-5555"
        />
      </div>
      <div className="field">
        <label htmlFor="addressLine">Address</label>
        <input
          id="addressLine"
          name="addressLine"
          defaultValue={addressLine ?? ""}
          autoComplete="address-line1"
          placeholder="123 Main St"
        />
      </div>
      <div className="field">
        <label htmlFor="addressLine2">Apt, suite, etc.</label>
        <input
          id="addressLine2"
          name="addressLine2"
          defaultValue={addressLine2 ?? ""}
          autoComplete="address-line2"
          placeholder="Suite 200"
        />
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_5.5rem_6.5rem] gap-1.5">
        <div className="field">
          <label htmlFor="city">City</label>
          <input
            id="city"
            name="city"
            defaultValue={city ?? ""}
            autoComplete="address-level2"
            placeholder="Houston"
          />
        </div>
        <div className="field">
          <label htmlFor="region">State</label>
          <select id="region" name="region" defaultValue={region ?? ""} autoComplete="address-level1">
            <option value="">ST</option>
            {US_STATES.map(([code, stateName]) => (
              <option key={code} value={code} title={stateName}>
                {code}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="postalCode">ZIP</label>
          <input
            id="postalCode"
            name="postalCode"
            defaultValue={postalCode ?? ""}
            autoComplete="postal-code"
            inputMode="numeric"
            placeholder="12345"
          />
        </div>
      </div>
      <div className="pt-3">
        <SaveButton pending={pending} save={save} className="w-full" />
      </div>
    </form>
  );
}
