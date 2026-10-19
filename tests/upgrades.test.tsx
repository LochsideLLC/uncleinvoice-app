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
import OnboardingPage from "@/app/app/onboarding/page";
import { PlanMatrix } from "@/components/plan-matrix";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import { BookkeeperHome } from "@/components/bookkeeper-home";
import { QuickInvoiceForm } from "@/components/quick-invoice-form";

beforeEach(() => { state.plan = "free"; state.planSetAt = null; state.planUpdates = 0; state.signedIn = true; state.creates = 0; state.paidIds.clear(); state.archivedIds.clear(); });

const customer = () => { const data = new FormData(); data.set("name", "Sample customer"); data.set("email", "customer@example.test"); return data; };

// Both workspaces are free: every legacy plan value unlocks everything.
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
  test(`${plan}: every feature is unlocked on every legacy tier`, () => {
    for (const check of [canImportInvoices, canAttachDocuments, canBulkDownload, canUseContractorLinks]) assert.equal(check(plan), true);
  });
  test(`${plan}: import page always asks for a file, never a paywall`, async () => {
    state.plan = plan;
    const markup = renderToStaticMarkup(await ImportPage({ params: Promise.resolve({ workspaceId: "sample-workspace" }) }));
    assert.equal(markup.includes('type="file"'), true);
    assert.equal(markup.includes("Included with Bookkeeper"), false);
  });
  test(`${plan}: workspaces page offers both free sides with no checkout`, async () => {
    state.plan = plan;
    const markup = renderToStaticMarkup(await PlansPage({ searchParams: Promise.resolve({}) }));
    assert.match(markup, /Both free/);
    assert.match(markup, /Contractor workspace/);
    assert.match(markup, /Bookkeeper workspace/);
    assert.equal(markup.includes('action="/api/stripe/checkout"'), false);
    assert.equal(markup.includes("$5/mo"), false);
    assert.equal(markup.includes("$29/mo"), false);
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

test("unknown plans fall back to free and stay fully unlocked", () => {
  assert.equal(asPlan("enterprise"), "free");
  assert.equal(canBulkDownload("enterprise"), true);
});

test("free model: prices are $0, nothing is requestable, features point at workspaces", () => {
  assert.equal(asPaidPlan("invoice"), "invoice");
  assert.equal(asPaidPlan("bookkeeper"), "bookkeeper");
  assert.equal(asPaidPlan("free"), null);
  assert.equal(asPaidPlan("enterprise"), null);
  assert.equal(monthlyPrice("invoice"), "$0/mo");
  assert.equal(monthlyPrice("bookkeeper"), "$0/mo");
  const item = checkoutLineItem("bookkeeper");
  assert.equal(item.price_data?.unit_amount, 0);
  assert.equal(item.price_data?.product_data?.name, `Uncle Invoice ${PLAN_LABEL.bookkeeper}`);
  assert.throws(() => stripeTestSecretKey(), /STRIPE_SECRET_KEY is not configured/);
  assert.throws(() => stripeTestSecretKey("sk_live_not-a-real-key"), /must be a Stripe test-mode key/);
  assert.equal(stripeTestSecretKey("sk_test_not-a-real-key"), "sk_test_not-a-real-key");
  assert.equal(canRequestPlan("free", "bookkeeper"), false);
  assert.equal(upgradeHref("import"), "/app?workspace=bookkeeper");
});

test("legacy subscription events use $0 prices; a lapse still clears the legacy column", async () => {
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

  await applyStripeEvent(checkout(500));
  assert.equal(state.plan, "free");
  assert.equal(state.planUpdates, 0);
  await applyStripeEvent(checkout(0));
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

test("finished invoices never carry the Uncle Invoice credit on any account", async () => {
  const invoice = { seededByUserId: "preparer", contractor: { userId: "issuer" } };
  assert.equal(await invoiceShowsBrand(invoice), false);
  state.paidIds.add("preparer");
  assert.equal(await invoiceShowsBrand(invoice), false);
  assert.equal(await invoiceShowsBrand({ contractor: {} }), false);
});

test("workspace switcher marks the active side and offers both", () => {
  for (const active of ["contractor", "bookkeeper"] as const) {
    const markup = renderToStaticMarkup(<WorkspaceSwitcher active={active} />);
    assert.match(markup, /Contractor/);
    assert.match(markup, /Bookkeeper/);
    assert.ok(markup.includes('aria-pressed="true"'), "active side is marked");
  }
});

test("workspace matrix shows both free sides with the current badge", () => {
  const markup = renderToStaticMarkup(<PlanMatrix current="contractor" />);
  assert.match(markup, /Current/);
  assert.match(markup, /\$0\/mo/);
  assert.match(markup, /You are on this workspace/);
  assert.match(markup, /Free — open it anytime/);
});

test("onboarding offers both starting sides without restricting access", () => {
  const markup = renderToStaticMarkup(<OnboardingPage />);
  assert.match(markup, /Create and send invoices/);
  assert.match(markup, /Manage contractor invoices for clients/);
  assert.match(markup, /You can always do both later/);
  assert.ok(markup.includes('name="workspace" value="contractor"'), "contractor choice posts");
  assert.ok(markup.includes('name="workspace" value="bookkeeper"'), "bookkeeper choice posts");
});

test("bookkeeper home explains the flow and lists client businesses", () => {
  const emptyProps = { memberships: [], awaitingByWorkspace: {}, verifiedByWorkspace: {}, paidAwaiting: 0, recentImports: [] };
  const empty = renderToStaticMarkup(<BookkeeperHome {...emptyProps} />);
  assert.match(empty, /Add Your First Client/);
  const memberships = [{
    workspace: { id: "w1", name: "Client Co", email: "client@example.test", _count: { contractors: 2, invoices: 5 } },
    role: "owner",
  }];
  const fullProps = {
    memberships: memberships as never,
    awaitingByWorkspace: { w1: 3 },
    verifiedByWorkspace: { w1: 2 },
    paidAwaiting: 1,
    recentImports: [{
      id: "e1",
      message: "Imported from spreadsheet (100 on today, paid in full).",
      createdAt: new Date("2026-01-02"),
      invoice: { id: "i1", number: "INV-1", workspace: { id: "w1", name: "Client Co" } },
    }],
  };
  const full = renderToStaticMarkup(<BookkeeperHome {...fullProps} />);
  assert.match(full, /Client Co/);
  assert.match(full, /Import payments/);
  assert.match(full, /Awaiting verification/);
  assert.match(full, /Recent payment imports/);
});

test("generated PDF carries no credit and preserves invoice content", async () => {
  const invoice = {
    seededByUserId: "preparer", number: "SAMPLE-001", issueDate: new Date("2026-01-01T12:00:00Z"),
    serviceStart: null, serviceEnd: null, notes: null, confirmedAt: null, confirmedByEmail: null,
    workspace: { name: "Sample customer", email: "customer@example.test", phone: null, addressLine: null, city: null, region: null, postalCode: null },
    contractor: { name: "Sample issuer", email: "issuer@example.test", phone: null, addressLine: null, city: null, region: null, postalCode: null },
    lineItems: [{ description: "Sample service", quantity: 1, unitPrice: 25000 }],
  };
  const text = (pdf: Buffer) => execFileSync("pdftotext", ["-", "-"], { input: pdf }).toString();
  const output = text(await buildInvoicePdf(invoice));
  assert.doesNotMatch(output, /uncleinvoice\.com/);
  assert.match(output, /SAMPLE-001/);
  assert.match(output, /Sample service/);
  assert.match(output, /250\.00/);
});
