"use client";

import { useActionState } from "react";
import { uploadAttachmentAction, deleteAttachmentAction } from "@/actions/attachments";
import { FormBanner } from "@/components/form-banner";


export type AttachmentRow = {
  id: string;
  label: string | null;
  filename: string;
  contentType: string;
  byteSize: number;
};

function size(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function AttachmentPanel({
  workspaceId,
  invoiceId,
  attachments,
}: {
  workspaceId: string;
  invoiceId: string;
  attachments: AttachmentRow[];
}) {
  const [upState, upAction, upPending] = useActionState(uploadAttachmentAction, null);
  const [delState, delAction] = useActionState(deleteAttachmentAction, null);

  return (
    <section className="paper mt-6 space-y-4 rounded-3xl p-6">
      <div>
        <h2 className="text-xl">Supporting documents</h2>
        <p className="mt-1 text-sm text-muted">
          Attach the record this invoice came from, so the contractor can check it
          against your books before confirming.
        </p>
      </div>
      <FormBanner state={upState ?? delState} />

      {attachments.length === 0 ? (
        <p className="text-sm text-muted">Nothing attached yet.</p>
      ) : (
        <ul className="space-y-2">
          {attachments.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 text-sm">
              <a
                className="underline"
                href={`/api/invoices/${invoiceId}/attachments/${a.id}`}
                target="_blank"
                rel="noreferrer"
              >
                {a.label ?? a.filename}
              </a>
              <span className="text-muted">{size(a.byteSize)}</span>
              <form action={delAction}>
                <input type="hidden" name="workspaceId" value={workspaceId} />
                <input type="hidden" name="invoiceId" value={invoiceId} />
                <input type="hidden" name="attachmentId" value={a.id} />
                <button className="btn btn-ghost" type="submit">Remove</button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form action={upAction} encType="multipart/form-data" className="space-y-3">
        <input type="hidden" name="workspaceId" value={workspaceId} />
        <input type="hidden" name="invoiceId" value={invoiceId} />
        <div>
          <label htmlFor="label">What is it?</label>
          <input id="label" name="label" placeholder="QuickBooks payment record" />
        </div>
        <div>
          <label htmlFor="file">File (PDF, PNG, JPEG, or CSV, up to 5 MB)</label>
          <input id="file" name="file" type="file" accept=".pdf,.png,.jpg,.jpeg,.csv" />
        </div>
        <button className="btn btn-primary" type="submit" disabled={upPending}>
          {upPending ? "Attaching…" : "Attach document"}
        </button>
      </form>
    </section>
  );
}
