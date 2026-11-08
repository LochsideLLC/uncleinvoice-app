export function ConfirmedInvoiceExport({
  workspaceId,
  invoices,
}: {
  workspaceId: string;
  invoices: { id: string; number: string }[];
}) {
  if (!invoices.length) return null;

  return (
    <form id="confirmed-invoice-export" action="/api/invoices/zip" method="post" className="paper flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="confirmedOnly" value="true" />
      <div>
        <p className="font-medium">Download confirmed invoices</p>
        <p className="text-sm text-muted">Choose up to 50 PDFs from these results. Unconfirmed invoices cannot be added.</p>
      </div>
      <button className="btn btn-secondary min-h-11 w-full shrink-0 sm:w-auto">Download selected</button>
    </form>
  );
}
