/**
 * Former upgrade prompts, now pointers to the free workspace that holds the
 * feature. Nothing requires payment: contractor tools live in the Contractor
 * workspace, bookkeeping tools in the Bookkeeper workspace.
 */
const FEATURE_HOME = {
  branding: "/app?workspace=contractor",
  import: "/app?workspace=bookkeeper",
  clients: "/app?workspace=bookkeeper",
  links: "/app?workspace=bookkeeper",
  attachments: "/app?workspace=bookkeeper",
  download: "/app?workspace=bookkeeper",
} as const;

export const UPGRADE_OFFERS = {
  branding: { plan: "invoice", title: "Make this invoice entirely yours", description: "Finished pages and PDFs carry only your business — free in the Contractor workspace." },
  import: { plan: "bookkeeper", title: "Start with the payments. Finish with invoices.", description: "Import your spreadsheet into drafts, then let each contractor review and confirm their own invoices." },
  clients: { plan: "bookkeeper", title: "One place for the books you keep", description: "Prepare invoices across your clients, collect contractor confirmations, and keep the supporting records together." },
  links: { plan: "bookkeeper", title: "Let contractors confirm their own invoices", description: "Give each contractor one link to review their invoices. They do not need an account." },
  attachments: { plan: "bookkeeper", title: "Keep the record beside the invoice", description: "Attach payment records and other supporting documents so contractors can check the details before confirming." },
  download: { plan: "bookkeeper", title: "Download the whole set in one step", description: "Collect selected invoices in one download from the Bookkeeper workspace." },
} as const;
export type UpgradeFeature = keyof typeof UPGRADE_OFFERS;

export function upgradeHref(feature: UpgradeFeature) {
  return FEATURE_HOME[feature];
}

/** Nothing left to request: every workspace is free. Kept for callers. */
export function canRequestPlan(
  _current: string | null | undefined,
  _target: string,
) {
  return false;
}
