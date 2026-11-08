"use client";

import { archiveWorkspaceAction } from "@/actions/workspaces";

export function WorkspaceArchiveButton({
  workspaceId,
  archived,
}: {
  workspaceId: string;
  archived: boolean;
}) {
  return (
    <form
      action={archiveWorkspaceAction}
      onSubmit={(event) => {
        if (!archived && !window.confirm("Archive this customer? Their invoices will be kept.")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="archived" value={String(!archived)} />
      <button type="submit" className="btn btn-secondary w-full sm:w-auto">
        {archived ? "Restore" : "Archive"}
      </button>
    </form>
  );
}
