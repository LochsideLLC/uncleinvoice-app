import { asPlan, type Plan } from "@/lib/plan";

export const UPGRADE_OFFERS = {
  branding: { plan: "invoice", title: "Make this invoice entirely yours", description: "Keep the invoice you made. Remove the Uncle Invoice credit from the finished page and PDF." },
  import: { plan: "bookkeeper", title: "Start with the payments. Finish with invoices.", description: "Import your spreadsheet into drafts, then let each contractor review and confirm their own invoices." },
  clients: { plan: "bookkeeper", title: "One place for the books you keep", description: "Prepare invoices across your clients, collect contractor confirmations, and keep the supporting records together." },
  links: { plan: "bookkeeper", title: "Let contractors confirm their own invoices", description: "Give each contractor one link to review their invoices. They do not need an account or a paid plan." },
  attachments: { plan: "bookkeeper", title: "Keep the record beside the invoice", description: "Attach payment records and other supporting documents so contractors can check the details before confirming." },
  download: { plan: "bookkeeper", title: "Download the whole set in one step", description: "Collect your selected invoices in one download with Bookkeeper. Individual PDFs remain available on every plan." },
} as const;
export type UpgradeFeature = keyof typeof UPGRADE_OFFERS;

export function upgradeHref(feature: UpgradeFeature) {
  return `/app/plans?feature=${feature}#${UPGRADE_OFFERS[feature].plan}`;
}

export function requestPlanHref(plan: Exclude<Plan, "free">) {
  const name = plan === "invoice" ? "Invoice" : "Bookkeeper";
  return `mailto:info@bookkeepingconroe.com?subject=${encodeURIComponent(`Request ${name} plan`)}&body=${encodeURIComponent(`I'd like to learn about the ${name} plan for Uncle Invoice. Please send me pricing and the next steps.\n\nMy Uncle Invoice account email is: `)}`;
}

export function canRequestPlan(current: string | null | undefined, target: Plan) {
  const ranks = { free: 0, invoice: 1, bookkeeper: 2 };
  return ranks[target] > ranks[asPlan(current)];
}
