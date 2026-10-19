import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import Stripe from "stripe";
import {
  isSafeConnectConfiguration,
  onlinePaymentEligibility,
  REQUIRED_CONNECT_CONFIGURATION,
} from "@/lib/payment-policy";
import { stripeTestSecretKey } from "@/lib/stripe";
import { checkoutMatchesBalance, classifyStripePayment, netPaidAmount } from "@/lib/payment-state";
import { isLikelyHumanBrowser } from "@/lib/view-policy";
import { createToken, hashToken } from "@/lib/crypto";
import { notificationChannels } from "@/lib/notification-policy";
import { cappedInteger } from "@/lib/quota-policy";

const safeAccount = {
  ...REQUIRED_CONNECT_CONFIGURATION,
  cardPaymentsStatus: "active",
  chargesEnabled: true,
  payoutsEnabled: true,
  detailsSubmitted: true,
  disconnectedAt: null,
};

const eligible = () => ({
  total: 50_000,
  amountPaid: 10_000,
  status: "sent",
  collectionMode: "stripe",
  onlinePaymentEnabled: true,
  ownerUserId: "owner",
  requestingUserId: "owner",
  account: safeAccount,
});

test("only the exact Stripe-controlled responsibility settings are safe", () => {
  assert.equal(isSafeConnectConfiguration(safeAccount), true);
  assert.equal(isSafeConnectConfiguration({ ...safeAccount, dashboardType: "express" }), false);
  assert.equal(isSafeConnectConfiguration({ ...safeAccount, feesCollector: "application" }), false);
  assert.equal(isSafeConnectConfiguration({ ...safeAccount, lossesCollector: "application" }), false);
  assert.equal(isSafeConnectConfiguration({ ...safeAccount, requirementsCollector: "application" }), false);
});

test("online payment requires owner, confirmation, safe Stripe state, and a balance", () => {
  assert.deepEqual(onlinePaymentEligibility(eligible()), { eligible: true, total: 50_000, balance: 40_000 });
  const wrongOwner = onlinePaymentEligibility({ ...eligible(), requestingUserId: "bookkeeper" });
  assert.equal(wrongOwner.eligible, false);
  if (!wrongOwner.eligible) assert.match(wrongOwner.reason, /contractor/);
  assert.equal(onlinePaymentEligibility({ ...eligible(), collectionMode: "documentation" }).eligible, false);
  assert.equal(onlinePaymentEligibility({ ...eligible(), onlinePaymentEnabled: false }).eligible, false);
  assert.equal(onlinePaymentEligibility({ ...eligible(), status: "draft" }).eligible, false);
  assert.equal(onlinePaymentEligibility({ ...eligible(), amountPaid: 50_000 }).eligible, false);
  assert.equal(onlinePaymentEligibility({ ...eligible(), amountPaid: 50_000, collectionMode: "documentation" }).eligible, false);
  assert.equal(onlinePaymentEligibility({ ...eligible(), ownerUserId: null }).eligible, false);
  assert.equal(onlinePaymentEligibility({ ...eligible(), account: { ...safeAccount, lossesCollector: "application" } }).eligible, false);
  assert.equal(onlinePaymentEligibility({ ...eligible(), account: { ...safeAccount, payoutsEnabled: false } }).eligible, false);
  assert.equal(onlinePaymentEligibility({ ...eligible(), account: { ...safeAccount, detailsSubmitted: false } }).eligible, false);
});

test("Stripe code refuses live secret keys", () => {
  assert.throws(() => stripeTestSecretKey("sk_live_not-real"), /test-mode key/);
  assert.equal(stripeTestSecretKey("sk_test_not-real"), "sk_test_not-real");
});

test("Stripe signatures reject changed webhook bodies", () => {
  const stripe = new Stripe("sk_test_example");
  const secret = "whsec_testing_secret";
  const payload = JSON.stringify({ id: "evt_test", type: "payment_intent.succeeded", livemode: false, data: { object: { id: "pi_test" } } });
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret });
  assert.equal(stripe.webhooks.constructEvent(payload, signature, secret).id, "evt_test");
  assert.throws(() => stripe.webhooks.constructEvent(payload.replace("pi_test", "pi_other"), signature, secret));
});

test("current Stripe state wins over late or repeated events", () => {
  assert.equal(classifyStripePayment({ intentStatus: "succeeded", amountReceived: 1000, refundedAmount: 0, disputed: false, hasFailure: true }), "succeeded");
  assert.equal(classifyStripePayment({ intentStatus: "processing", amountReceived: 0, refundedAmount: 0, disputed: false, hasFailure: false }), "pending");
  assert.equal(classifyStripePayment({ intentStatus: "requires_payment_method", amountReceived: 0, refundedAmount: 0, disputed: false, hasFailure: true }), "failed");
  assert.equal(classifyStripePayment({ intentStatus: "succeeded", amountReceived: 1000, refundedAmount: 250, disputed: false, hasFailure: false }), "partially_refunded");
  assert.equal(classifyStripePayment({ intentStatus: "succeeded", amountReceived: 1000, refundedAmount: 1000, disputed: false, hasFailure: false }), "fully_refunded");
  assert.equal(classifyStripePayment({ intentStatus: "succeeded", amountReceived: 1000, refundedAmount: 0, disputed: true, hasFailure: false }), "disputed");
  assert.equal(netPaidAmount("failed", 1000, 0), 0);
  assert.equal(netPaidAmount("partially_refunded", 1000, 250), 750);
  assert.equal(netPaidAmount("fully_refunded", 1000, 1000), 0);
});

test("old Checkout attempts cannot be reused for a changed balance or account", () => {
  const attempt = { amount: 1000, currency: "usd", connectedAccountId: "acct_a" };
  assert.equal(checkoutMatchesBalance(attempt, { balance: 1000, currency: "usd", connectedAccountId: "acct_a" }), true);
  assert.equal(checkoutMatchesBalance(attempt, { balance: 500, currency: "usd", connectedAccountId: "acct_a" }), false);
  assert.equal(checkoutMatchesBalance(attempt, { balance: 1000, currency: "usd", connectedAccountId: "acct_b" }), false);
});

test("hosted links are random and scanner requests do not count as human views", () => {
  const a = createToken();
  const b = createToken();
  assert.match(a, /^[a-f0-9]{64}$/);
  assert.notEqual(a, b);
  assert.notEqual(hashToken(a), a);
  assert.equal(isLikelyHumanBrowser("Mozilla/5.0 Chrome/130.0 Safari/537.36"), true);
  assert.equal(isLikelyHumanBrowser("Mozilla/5.0 Proofpoint URL Scanner"), false);
  assert.equal(isLikelyHumanBrowser("curl/8.0"), false);
});

test("notification choices and hard local caps keep optional channels off", () => {
  assert.deepEqual(notificationChannels("payment_received"), { inApp: true, push: false, email: false });
  assert.deepEqual(notificationChannels("invoice_overdue"), { inApp: false, push: false, email: false });
  assert.deepEqual(notificationChannels("payment_received", { inApp: false, push: true, email: false }), { inApp: false, push: true, email: false });
  assert.equal(cappedInteger("999999", 80, 100), 100);
  assert.equal(cappedInteger("0", 80, 100), 80);
});

test("Checkout is a connected direct charge with a server amount and no platform fee", () => {
  const source = readFileSync("src/app/api/i/[token]/checkout/route.ts", "utf8");
  assert.match(source, /stripeAccount: hosted\.account\.stripeAccountId/);
  assert.match(source, /unit_amount: attempt\.amount/);
  assert.match(source, /amount: hosted\.eligibility\.balance/);
  assert.doesNotMatch(source, /application_fee_amount|transfer_data|destination:/);
});

test("Connect webhook has its own secret, signature check, event record, and live-mode block", () => {
  const route = readFileSync("src/app/api/stripe/connect/webhook/route.ts", "utf8");
  const worker = readFileSync("src/lib/stripe-connect-webhook.ts", "utf8");
  assert.match(route, /stripe-signature/);
  assert.match(route, /stripeConnectWebhookSecret/);
  assert.match(route, /event\.livemode/);
  assert.match(worker, /stripeEventId: event\.id/);
  assert.match(worker, /amount or currency does not match/);
  assert.match(worker, /"processed", "ignored", "quarantined"/);
});

test("migration keeps old and guest invoices out of online collection", () => {
  const migration = readFileSync(
    "prisma/migrations/20261019011500_stripe_connect_foundation/migration.sql",
    "utf8",
  );
  assert.match(migration, /"collectionMode" TEXT NOT NULL DEFAULT 'documentation'/);
  assert.match(migration, /"onlinePaymentEnabled" BOOLEAN NOT NULL DEFAULT false/);
  assert.match(migration, /StripeConnectEvent_stripeEventId_key/);
  assert.match(migration, /HostedInvoiceAccess_tokenHash_key/);
});
