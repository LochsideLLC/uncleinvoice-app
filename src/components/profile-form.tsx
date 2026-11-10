"use client";

import { useActionState, useState } from "react";
import { updateProfileAction } from "@/actions/account";
import { CLIENT_TERMS } from "@/lib/client-terms";
import { DEFAULT_INVOICE_MESSAGE } from "@/lib/invoice-email";
import { FormBanner } from "@/components/form-banner";
import { SaveButton, useSaveButton } from "@/components/save-button";

export function ProfileForm({
  name,
  email,
  backupEmail,
  clientTerm,
  emailSignature,
  emailSignatureType,
  emailSignatureImage,
  defaultInvoiceMessage,
}: {
  name: string;
  email: string;
  backupEmail?: string | null;
  clientTerm?: string | null;
  emailSignature?: string | null;
  emailSignatureType?: string | null;
  emailSignatureImage?: string | null;
  defaultInvoiceMessage?: string | null;
}) {
  const [state, action, pending] = useActionState(updateProfileAction, null);
  const save = useSaveButton(state);
  const [signatureType, setSignatureType] = useState(emailSignatureType === "image" ? "image" : "text");
  const [signatureImage, setSignatureImage] = useState(emailSignatureImage ?? "");
  const [signatureImageError, setSignatureImageError] = useState<string | null>(null);

  return (
    <form action={action} onChange={save.markDirty} className="paper compact-fields space-y-1 rounded-3xl p-6">
      <div>
        <h2 className="text-xl">Account Info</h2>
        <p className="mt-1 text-sm text-muted">How you show up on Uncle Invoice.</p>
      </div>
      <FormBanner state={state} />
      <div className="field">
        <label htmlFor="name">Name</label>
        <input
          id="name"
          name="name"
          required
          defaultValue={name}
          autoComplete="name"
          placeholder="Your name"
        />
      </div>
      <div className="field">
        <label htmlFor="email">Account email</label>
        <input
          id="email"
          value={email}
          readOnly
          className="opacity-80"
          placeholder="The email you sign in with"
        />
      </div>
      <div className="field">
        <label htmlFor="backupEmail">Backup email</label>
        <input
          id="backupEmail"
          name="backupEmail"
          type="email"
          defaultValue={backupEmail ?? ""}
          autoComplete="email"
          placeholder="Another email, just in case"
        />
      </div>
      <div className="field">
        <label htmlFor="clientTerm">You call them your…</label>
        <select id="clientTerm" name="clientTerm" defaultValue={clientTerm ?? "clients"}>
          {CLIENT_TERMS.map((term) => (
            <option key={term} value={term}>
              {term.charAt(0).toUpperCase() + term.slice(1)}
            </option>
          ))}
        </select>
      </div>
      <div id="default-invoice-message" className="field scroll-mt-8">
        <label htmlFor="defaultInvoiceMessage">Default invoice message</label>
        <textarea
          id="defaultInvoiceMessage"
          name="defaultInvoiceMessage"
          rows={3}
          maxLength={2000}
          defaultValue={defaultInvoiceMessage ?? DEFAULT_INVOICE_MESSAGE}
        />
        <p className="mt-1 text-xs text-muted">
          You can insert this message when sending an invoice. Change it here anytime.
        </p>
      </div>
      <div id="email-signature" className="field scroll-mt-8 space-y-2">
        <h3 className="text-base font-semibold">Email signature</h3>
        <p className="text-sm text-muted">Choose text or an image. You can include it or leave it out each time you send an invoice.</p>
        <input type="hidden" name="emailSignatureImage" value={signatureImage} />
        <label htmlFor="emailSignatureType">Signature style</label>
        <select id="emailSignatureType" name="emailSignatureType" value={signatureType} onChange={(event) => setSignatureType(event.target.value)}>
          <option value="text">Text</option>
          <option value="image">Image</option>
        </select>
        {signatureType === "text" ? (
          <textarea
            id="emailSignature"
            name="emailSignature"
            rows={4}
            maxLength={1000}
            defaultValue={emailSignature ?? ""}
            placeholder={"Thanks,\nYour name\nYour business\nPhone number"}
          />
        ) : (
          <div className="space-y-2">
            <label htmlFor="emailSignatureUpload">Signature image</label>
            <input
              id="emailSignatureUpload"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                setSignatureImageError(null);
                if (!file) return;
                if (file.size > 300_000) {
                  setSignatureImageError("Choose an image under 300 KB.");
                  event.currentTarget.value = "";
                  return;
                }
                const reader = new FileReader();
                reader.onload = () => {
                  if (typeof reader.result === "string") setSignatureImage(reader.result);
                };
                reader.onerror = () => setSignatureImageError("That image could not be read.");
                reader.readAsDataURL(file);
              }}
            />
            {signatureImage ? (
              <div className="flex items-center gap-3">
                {/* Signature uploads are user-provided and stored as data URLs. */}
                {/* eslint-disable-next-line @next/next/no-img-element -- user signature image is stored as a data URL. */}
                <img src={signatureImage} alt="Saved email signature" className="max-h-20 max-w-full object-contain" />
                <button type="button" className="btn btn-ghost" onClick={() => { setSignatureImage(""); save.markDirty(); }}>Remove image</button>
              </div>
            ) : <p className="text-sm text-muted">Upload a PNG, JPG, or WebP image. Maximum 300 KB.</p>}
            {signatureImageError ? <p role="alert" className="text-sm text-red-900">{signatureImageError}</p> : null}
          </div>
        )}
      </div>
      <div className="pt-3">
        <SaveButton pending={pending} save={save} className="w-full" />
      </div>
    </form>
  );
}
