import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { renderToStaticMarkup } from "react-dom/server";
import { state } from "./fixtures/upgrade-data";
import { createWorkspaceInlineAction, createWorkspaceAction } from "@/actions/workspaces";
import { invoiceShowsBrand } from "@/lib/invoice-branding";
import { buildInvoicePdf } from "@/lib/pdf";
import { asPlan, canImportInvoices, canAttachDocuments, canBulkDownload, canUseContractorLinks } from "@/lib/plan";
import { requestPlanHref, canRequestPlan, upgradeHref } from "@/lib/upgrade";
import PlansPage from "@/app/app/plans/page";
import ImportPage from "@/app/app/w/[workspaceId]/import/page";

beforeEach(() => { state.plan = "free"; state.signedIn = true; state.creates = 0; state.paidIds.clear(); state.archivedIds.clear(); });

const customer = () => { const data = new FormData(); data.set("name", "Sample customer"); data.set("email", "customer@example.test"); return data; };

for (const plan of ["free", "invoice", "bookkeeper"]) {
  test(`${plan}: save a second billing customer without a plan restriction`, async () => {
    state.plan = plan;
    assert.equal("ok" in await createWorkspaceInlineAction(null, customer()), true);
    assert.equal("ok" in await createWorkspaceInlineAction(null, customer()), true);
    assert.equal(state.creates, 2);
  });
  test(`${plan}: standalone customer form remains usable`, async () => {
    state.plan = plan;
    await assert.rejects(createWorkspaceAction(null, customer()), /REDIRECT:\/app\/w\/sample-1/);
  });
  test(`${plan}: paid workflows keep server-side entitlements`, () => {
    for (const check of [canImportInvoices, canAttachDocuments, canBulkDownload, canUseContractorLinks]) assert.equal(check(plan), plan === "bookkeeper");
  });
  test(`${plan}: import page explains access before asking for a file`, async () => {
    state.plan = plan;
    const markup = renderToStaticMarkup(await ImportPage({ params: Promise.resolve({ workspaceId: "sample-workspace" }) }));
    assert.equal(markup.includes('type="file"'), plan === "bookkeeper");
    assert.equal(markup.includes("Included with Bookkeeper"), plan !== "bookkeeper");
  });
  test(`${plan}: plans page offers only higher tiers and explains email requests`, async () => {
    state.plan = plan;
    const markup = renderToStaticMarkup(await PlansPage({ searchParams: Promise.resolve({ feature: "import" }) }));
    assert.equal(markup.includes("Request Invoice"), plan === "free");
    assert.equal(markup.includes("Request Bookkeeper"), plan !== "bookkeeper");
    assert.match(markup, /No payment is taken here/);
    assert.match(markup, /Save as many billing customers/);
  });
}

test("customer creation still requires sign-in and valid details", async () => {
  assert.ok("error" in await createWorkspaceInlineAction(null, new FormData()));
  assert.equal(state.creates, 0);
  state.signedIn = false;
  await assert.rejects(createWorkspaceInlineAction(null, customer()), /AUTH_REQUIRED/);
  await assert.rejects(createWorkspaceAction(null, customer()), /AUTH_REQUIRED/);
  assert.equal(state.creates, 0);
});

test("unknown plans get no paid privileges", () => {
  assert.equal(asPlan("enterprise"), "free");
  assert.equal(canBulkDownload("enterprise"), false);
});

test("request links name the plan and contain no invoice or account data", () => {
  for (const plan of ["invoice", "bookkeeper"] as const) {
    const url = new URL(requestPlanHref(plan));
    assert.equal(url.protocol, "mailto:");
    assert.equal(url.pathname, "info@bookkeepingconroe.com");
    assert.match(url.searchParams.get("body")!, /Please send me pricing/);
    assert.doesNotMatch(url.href, /sample-user|customer@example/);
  }
  assert.equal(canRequestPlan("bookkeeper", "invoice"), false);
  assert.equal(upgradeHref("import"), "/app/plans?feature=import#matrix");
});

test("invoice credit follows its paid preparer or issuer, not its viewer", async () => {
  const invoice = { seededByUserId: "preparer", contractor: { userId: "issuer" } };
  assert.equal(await invoiceShowsBrand(invoice), true);
  state.paidIds.add("unrelated-viewer");
  assert.equal(await invoiceShowsBrand(invoice), true);
  state.paidIds.add("preparer");
  assert.equal(await invoiceShowsBrand(invoice), false);
  state.archivedIds.add("preparer");
  assert.equal(await invoiceShowsBrand(invoice), true);
  state.paidIds.add("issuer");
  assert.equal(await invoiceShowsBrand(invoice), false);
  assert.equal(await invoiceShowsBrand({ contractor: {} }), true);
});

test("generated PDF removes the credit for a paid issuer and preserves invoice content", async () => {
  const invoice = {
    seededByUserId: "preparer", number: "SAMPLE-001", issueDate: new Date("2026-01-01T12:00:00Z"),
    serviceStart: null, serviceEnd: null, notes: null, confirmedAt: null, confirmedByEmail: null,
    workspace: { name: "Sample customer", email: "customer@example.test", phone: null, addressLine: null, city: null, region: null, postalCode: null },
    contractor: { name: "Sample issuer", email: "issuer@example.test", phone: null, addressLine: null, city: null, region: null, postalCode: null },
    lineItems: [{ description: "Sample service", quantity: 1, unitPrice: 25000 }],
  };
  const text = (pdf: Buffer) => execFileSync("pdftotext", ["-", "-"], { input: pdf }).toString();
  const free = text(await buildInvoicePdf(invoice));
  state.paidIds.add("preparer");
  const paid = text(await buildInvoicePdf(invoice));
  assert.match(free, /uncleinvoice\.com/);
  assert.doesNotMatch(paid, /uncleinvoice\.com/);
  for (const output of [free, paid]) { assert.match(output, /SAMPLE-001/); assert.match(output, /Sample service/); assert.match(output, /250\.00/); }
});
