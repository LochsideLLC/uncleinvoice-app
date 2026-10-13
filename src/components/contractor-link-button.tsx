"use client";

import { useActionState, useState } from "react";
import { contractorLinkAction } from "@/actions/invoices";
import { FormBanner } from "@/components/form-banner";

/**
 * Produces the link the client passes to their own contractor.
 *
 * The contractor's email or phone is never needed here: the client already has
 * it, and sends the link on by whatever they normally use.
 */
export function ContractorLinkButton({
  workspaceId,
  contractorId,
  contractorName,
}: {
  workspaceId: string;
  contractorId: string;
  contractorName: string;
}) {
  const [state, action, pending] = useActionState(contractorLinkAction, null);
  const [copied, setCopied] = useState(false);
  const link = state?.message?.startsWith("http") ? state.message : null;

  return (
    <div className="mt-3 space-y-2">
      {link ? (
        <>
          <input
            readOnly
            value={link}
            onFocus={(event) => event.currentTarget.select()}
            className="w-full rounded-xl bg-background px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(link);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch {
                  setCopied(false);
                }
              }}
            >
              {copied ? "Copied" : "Copy link"}
            </button>
            <a
              className="btn btn-ghost"
              href={`sms:?&body=${encodeURIComponent(
                `Hi ${contractorName.split(" ")[0]} — your invoices are ready to look over: ${link}`,
              )}`}
            >
              Send by text
            </a>
          </div>
          <p className="text-xs text-muted">
            Give this to {contractorName.split(" ")[0]} however you normally reach them. It
            opens all their invoices, no account needed.
          </p>
        </>
      ) : (
        <form action={action}>
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <input type="hidden" name="contractorId" value={contractorId} />
          <FormBanner state={state} />
          <button className="btn btn-secondary" disabled={pending}>
            {pending ? "Making link…" : "Get their invoice link"}
          </button>
        </form>
      )}
    </div>
  );
}
