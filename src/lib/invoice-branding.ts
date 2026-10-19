/**
 * Both workspaces are free, so finished invoices never carry the Uncle
 * Invoice credit for anyone. The lookup stays in the signature (callers and
 * the PDF builder keep their shape), but no account needs a paid tier to
 * get a clean invoice.
 */
export async function invoiceShowsBrand(_invoice: {
  seededByUserId?: string | null;
  contractor: { userId?: string | null };
}) {
  return false;
}
