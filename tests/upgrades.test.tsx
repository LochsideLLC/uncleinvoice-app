import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { renderToStaticMarkup } from "react-dom/server";
import { state } from "./fixtures/upgrade-data";
import { createWorkspaceInlineAction, createWorkspaceAction } from "@/actions/workspaces";
import { invoiceShowsBrand } from "@/lib/invoice-branding";
import { buildInvoicePdf } from "@/lib/pdf";
import { PLAN_LABEL, asPaidPlan, asPlan, canImportInvoices, canAttachDocuments, canBulkDownload, canUseContractorLinks, monthlyPrice } from "@/lib/plan";
import { canRequestPlan, upgradeHref } from "@/lib/upgrade";
import { applyStripeEvent } from "@/lib/stripe-webhook";
import { checkoutLineItem, stripeTestSecretKey } from "@/lib/stripe";
import type Stripe from "stripe";
import PlansPage from "@/app/app/plans/page";
import ImportPage from "@/app/app/w/[workspaceId]/import/page";
import { QuickInvoiceForm } from "@/components/quick-invoice-form";

beforeEach(() => { state.plan = "free"; state.planSetAt = null; state.planUpdates = 0; state.signedIn = true; state.creates = 0; state.paidIds.clear(); state.archivedIds.clear(); });

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
  test(`${plan}: plans page offers only higher tiers through test checkout`, async () => {
    state.plan = plan;
    const markup = renderToStaticMarkup(await PlansPage({ searchParams: Promise.resolve({ feature: "import" }) }));
    assert.equal(markup.includes(`Choose ${PLAN_LABEL.invoice}`), plan === "free");
    assert.equal(markup.includes(`Choose ${PLAN_LABEL.bookkeeper}`), plan !== "bookkeeper");
    assert.match(markup, /Stripe Checkout is in test mode/);
    assert.match(markup, /\$5\/mo/);
    assert.match(markup, /\$29\/mo/);
    assert.equal(markup.includes('action="/api/stripe/checkout"'), plan !== "bookkeeper");
    assert.match(markup, /Save as many billing customers/);
  });
}

test("invoice form keeps Bill-to and From side by side on wide screens", () => {
  const markup = renderToStaticMarkup(<QuickInvoiceForm />);
  const grid = markup.indexOf("sm:grid-cols-2");
  const billTo = markup.indexOf(">Bill to<");
  const from = markup.indexOf(">From<");
  assert.ok(grid !== -1, "two-column grid class present");
  assert.ok(billTo !== -1 && from !== -1, "both sections render");
  assert.ok(grid < billTo && billTo < from, "both sections sit inside the grid");
  assert.ok(markup.includes('data-lpignore="true"'), "password managers told to leave invoice fields alone");
  assert.ok(markup.includes("sm:col-start-1") && markup.includes("sm:col-start-2"), "sections pinned against injected siblings");
});

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

test("checkout tiers and prices are fixed on the server", () => {
  assert.equal(asPaidPlan("invoice"), "invoice");
  assert.equal(asPaidPlan("bookkeeper"), "bookkeeper");
  assert.equal(asPaidPlan("free"), null);
  assert.equal(asPaidPlan("enterprise"), null);
  assert.equal(monthlyPrice("invoice"), "$5/mo");
  assert.equal(monthlyPrice("bookkeeper"), "$29/mo");
  const item = checkoutLineItem("bookkeeper");
  assert.equal(item.price_data?.unit_amount, 2900);
  assert.equal(item.price_data?.product_data?.name, `Uncle Invoice ${PLAN_LABEL.bookkeeper}`);
  assert.throws(() => stripeTestSecretKey(), /STRIPE_SECRET_KEY is not configured/);
  assert.throws(() => stripeTestSecretKey("sk_live_not-a-real-key"), /must be a Stripe test-mode key/);
  assert.equal(stripeTestSecretKey("sk_test_not-a-real-key"), "sk_test_not-a-real-key");
  assert.equal(canRequestPlan("bookkeeper", "invoice"), false);
  assert.equal(upgradeHref("import"), "/app/plans?feature=import#matrix");
});

test("only a paid, fixed-price Stripe event grants a plan, and a lapse removes it", async () => {
  const checkout = (amount: number, plan = "invoice") => ({
    type: "checkout.session.completed",
    created: 1_800_000_000,
    data: { object: {
      client_reference_id: "sample-user",
      metadata: { userId: "sample-user", plan },
      mode: "subscription",
      payment_status: "paid",
      currency: "usd",
      amount_total: amount,
    } },
  }) as unknown as Stripe.Event;

  await applyStripeEvent(checkout(499));
  assert.equal(state.plan, "free");
  assert.equal(state.planUpdates, 0);
  await applyStripeEvent(checkout(500));
  assert.equal(state.plan, "invoice");
  assert.equal(state.planUpdates, 1);

  await applyStripeEvent({
    type: "customer.subscription.updated",
    created: 1_800_000_001,
    data: { object: { metadata: { userId: "sample-user", plan: "invoice" }, status: "unpaid" } },
  } as unknown as Stripe.Event);
  assert.equal(state.plan, "free");
  assert.equal(state.planUpdates, 2);
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
