/**
 * The two paid tiers, and what each one unlocks.
 *
 * The tier lives on the **person** (User.plan), not on the client workspace.
 * A bookkeeper upgrades once and it covers every client whose books they
 * keep; a solo contractor upgrades their own account. Decided 2026-10-16.
 *
 * Every limit here is advice to the UI. The place a limit actually holds is
 * the server action, which calls these same functions — a hidden button is
 * not a restriction.
 */
export const PLANS = ["free", "invoice", "bookkeeper"] as const;
export type Plan = (typeof PLANS)[number];

export function asPlan(value?: string | null): Plan {
  return (PLANS as readonly string[]).includes(value ?? "") ? (value as Plan) : "free";
}

export const PLAN_LABEL: Record<Plan, string> = {
  free: "Free",
  invoice: "Invoice",
  bookkeeper: "Bookkeeper",
};

export const PLAN_TAGLINE: Record<Plan, string> = {
  free: "Write an invoice and keep track of it.",
  invoice: "Your invoices, with your name on them and nobody else's.",
  bookkeeper: "Prepare invoices for other people's books, in bulk.",
};

/** How many clients a tier may have. Infinity for the bookkeeper tier. */
export function workspaceLimit(plan?: string | null) {
  return asPlan(plan) === "bookkeeper" ? Infinity : 1;
}

/** Paid tiers drop the Uncle Invoice line off the finished invoice. */
export function isPaidPlan(plan?: string | null) {
  return asPlan(plan) !== "free";
}

export function showsUncleInvoiceMark(plan?: string | null) {
  return !isPaidPlan(plan);
}

/**
 * The bookkeeper tier is the one that prepares work inside somebody else's
 * books, so everything that only makes sense on someone else's behalf sits
 * behind it: the spreadsheet importer, more than one client, the contractor
 * confirm-and-send links, bulk download and supporting documents.
 */
export function canImportInvoices(plan?: string | null) {
  return asPlan(plan) === "bookkeeper";
}

export function canKeepMultipleClients(plan?: string | null) {
  return asPlan(plan) === "bookkeeper";
}

export function canUseContractorLinks(plan?: string | null) {
  return asPlan(plan) === "bookkeeper";
}

export function canBulkDownload(plan?: string | null) {
  return asPlan(plan) === "bookkeeper";
}

export function canAttachDocuments(plan?: string | null) {
  return asPlan(plan) === "bookkeeper";
}

/** The sentence an action returns when a tier is not enough. */
export function upgradeMessage(what: string) {
  return `${what} is part of the Bookkeeper plan. See Upgrade in your profile.`;
}

/** What each tier lists on the upgrade page. */
export const PLAN_FEATURES: Record<Plan, string[]> = {
  free: [
    "One client",
    "Write and send invoices",
    "Track what is paid and what is still owed",
    "The Uncle Invoice line stays on the invoice",
  ],
  invoice: [
    "Everything in Free",
    "Your invoice, without the Uncle Invoice line on it",
    "One client",
  ],
  bookkeeper: [
    "Everything in Invoice",
    "As many clients as you keep books for",
    "Import a spreadsheet of payments and turn it into invoices",
    "Send a contractor a link to confirm their own invoices",
    "Attach supporting documents, and download invoices in bulk",
  ],
};
