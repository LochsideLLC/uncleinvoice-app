import { createRoot } from "react-dom/client";
import PlansPage from "@/app/app/plans/page";
import { SiteHeader } from "@/components/site-header";
import { UpgradeHint } from "@/components/upgrade-hint";
import { InvoiceList } from "@/components/invoice-list";
import { BrandingPreview } from "@/components/branding-preview";
import { UpgradeOffer, FeatureGate } from "@/components/upgrade-offer";
import { state, user } from "./upgrade-data";

state.plan = new URLSearchParams(location.search).get("plan") ?? "free";
const root = createRoot(document.getElementById("root")!);
const rows = [{ id: "sample-invoice", number: "SAMPLE-001", workspaceId: "sample-workspace", clientName: "Sample customer", status: "sent", totalCents: 25000, dueCents: 25000, isPaid: false, isPartiallyPaid: false, issueDate: new Date("2026-01-01"), dueDate: null, sentAt: new Date("2026-01-01") }];

async function render() {
  const content = location.pathname === "/app/plans"
    ? await PlansPage({ searchParams: Promise.resolve({}) })
    : <div className="space-y-8">
      <h1 className="text-3xl">Upgrade flow review · sample data</h1>
      <label>Unfinished invoice note<input aria-label="Unfinished invoice note" defaultValue="Keep this draft" /></label>
      <UpgradeHint plan={state.plan} userId="sample-user" />
      <UpgradeOffer feature="branding" preview={<BrandingPreview />}>Preview invoice</UpgradeOffer>
      <InvoiceList invoices={rows} canDownloadBulk={state.plan === "bookkeeper"} />
      <FeatureGate feature="import" />
    </div>;
  root.render(<><SiteHeader user={user()} /><main className="mx-auto max-w-6xl px-5 py-8">{content}</main></>);
}
void render();
