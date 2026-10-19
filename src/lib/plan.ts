/**
 * Both workspaces are free since the free-dual-workspaces change: no
 * subscription is required for anything. `invoice` is the stable internal
 * key for the Contractor workspace; customers see it as Contractor.
 *
 * The tier lives on the **person** (User.plan), not on the client workspace.
 * A bookkeeper upgrades once and it covers every client whose books they
 * keep; a solo contractor upgrades their own account. Decided 2026-10-16.
 *
 * Billing contacts are unlimited on every plan. Bookkeeper sells workflow
 * tools, not permission to bill a second customer; the shared Workspace
 * model must not impose a bookkeeping-client limit on billing contacts.
 * Every feature check here is advice to the UI. A restriction actually holds in
 * the server action, which calls these same functions — a hidden button is
 * not a restriction.
 */
export const PLANS = ["free", "invoice", "bookkeeper"] as const;
export type Plan = (typeof PLANS)[number];
export const PAID_PLANS = ["invoice", "bookkeeper"] as const;
export type PaidPlan = (typeof PAID_PLANS)[number];

export const PLAN_PRICE_CENTS: Record<Plan, number> = {
  free: 0,
  invoice: 0,
  bookkeeper: 0,
};

export function asPlan(value?: string | null): Plan {
  return (PLANS as readonly string[]).includes(value ?? "") ? (value as Plan) : "free";
}

export function asPaidPlan(value?: string | null): PaidPlan | null {
  return (PAID_PLANS as readonly string[]).includes(value ?? "") ? (value as PaidPlan) : null;
}

export function monthlyPrice(plan: Plan) {
  return `$${(PLAN_PRICE_CENTS[plan] / 100).toFixed(0)}/mo`;
}

export const PLAN_LABEL: Record<Plan, string> = {
  free: "Free",
  invoice: "Contractor",
  bookkeeper: "Bookkeeper",
};

export const PLAN_TAGLINE: Record<Plan, string> = {
  free: "Write an invoice and keep track of it.",
  invoice: "Your invoices, with your name on them and nobody else's.",
  bookkeeper: "Turn payment records into invoices contractors can confirm.",
};

/**
 * Both workspaces are free: every feature check passes for every account.
 * The `plan` argument stays so call sites and server actions keep their
 * shape, and the legacy User.plan column stays for history.
 */
export function isPaidPlan(_plan?: string | null) {
  return true;
}

export function showsUncleInvoiceMark(_plan?: string | null) {
  return false;
}

export function canImportInvoices(_plan?: string | null) {
  return true;
}

export function canUseContractorLinks(_plan?: string | null) {
  return true;
}

export function canBulkDownload(_plan?: string | null) {
  return true;
}

export function canAttachDocuments(_plan?: string | null) {
  return true;
}

/** The sentence an action returns when a tier is not enough. */
export function upgradeMessage(what: string) {
  return `${what} is part of Bookkeeper. Open Plans to see how it works. Your existing invoices are still available.`;
}

/** What each tier lists on the upgrade page. */
export const PLAN_FEATURES: Record<Plan, string[]> = {
  free: [
    "Save as many billing customers as you need",
    "Write and send invoices",
    "Track what is paid and what is still owed",
    "The Uncle Invoice line stays on the invoice",
  ],
  invoice: [
    "Everything in Free",
    "Your invoice, without the Uncle Invoice line on it",
    "The same simple invoicing, with only your business on the page",
  ],
  bookkeeper: [
    "Everything in Contractor",
    "As many clients as you keep books for",
    "Import a spreadsheet of payments and turn it into invoices",
    "Send a contractor a link to confirm their own invoices",
    "Attach supporting documents, and download invoices in bulk",
  ],
};
