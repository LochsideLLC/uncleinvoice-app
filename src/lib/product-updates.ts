export const CURRENT_RELEASE = {
  version: "0.1.0",
  releasedOn: "2026-10-17",
  releasedLabel: "October 17, 2026",
} as const;

export type ProductUpdate = {
  status: "shipped" | "coming-soon";
  title: string;
  description: string;
};

/** Add future release notes here; the page renders this list without extra markup. */
export const PRODUCT_UPDATES = [
  { status: "shipped", title: "Invoices from start to finish", description: "Create an invoice, add saved billing customers, custom terms, tax, and line items, then track what has been paid and what is still owed." },
  { status: "shipped", title: "Spreadsheet import for bookkeepers", description: "Turn payment rows into invoice drafts, choose whether blank payment amounts are paid or owed, and skip rows that have already been imported." },
  { status: "shipped", title: "Contractor review and confirmation", description: "Give each contractor one private link where they can review their invoices, make corrections, confirm them, and send the finished set to the client." },
  { status: "shipped", title: "PDF delivery with a paper trail", description: "Compose the recipient and message, include your saved signature, send finished invoice PDFs, and see when each invoice was sent." },
  { status: "shipped", title: "Supporting documents and bulk downloads", description: "Attach backup documents to an invoice and download selected invoices together in a ZIP with a matching manifest." },
  { status: "shipped", title: "Your business on the page", description: "Save business details, a logo or wordmark, and profile information. Paid plans remove the Uncle Invoice credit from finished invoices." },
  { status: "shipped", title: "Account and admin safeguards", description: "Sign in with a password or Google, reset and change passwords, archive accounts, and let admins preview the product as another account." },
  { status: "shipped", title: "Plans that explain the workflow", description: "Compare Free, Contractor, and Bookkeeper, preview paid branding, and see an upgrade explanation without losing unfinished invoice work." },
  { status: "coming-soon", title: "Payment reminders", description: "Send a follow-up from an invoice when a balance is still outstanding." },
] satisfies readonly ProductUpdate[];
