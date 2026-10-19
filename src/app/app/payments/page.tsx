import Link from "next/link";
import { redirect } from "next/navigation";
import { getRealSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  isSafeConnectConfiguration,
  stripeConnectEnabled,
  stripeTestDashboardUrl,
} from "@/lib/stripe-connect";

export const metadata = { title: "Payments — Uncle Invoice" };

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ connect?: string }>;
}) {
  const user = await getRealSessionUser();
  if (!user) redirect("/login?next=/app/payments");
  const account = await db.stripeConnectedAccount.findUnique({ where: { userId: user.id } });
  const enabled = stripeConnectEnabled();
  const safe = account ? isSafeConnectConfiguration(account) : false;
  const ready = Boolean(account && !account.disconnectedAt && safe && account.chargesEnabled && account.payoutsEnabled && account.detailsSubmitted && account.cardPaymentsStatus === "active");
  const state = (await searchParams).connect;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm uppercase tracking-widest text-muted">Account</p>
        <h1 className="mt-1 text-3xl">Online payments</h1>
        <p className="mt-2 text-muted">
          Connect your own Stripe account. Customer charges go straight to that account.
        </p>
      </div>

      {state === "returned" ? (
        <div className="rounded-2xl border border-line bg-paper-2 px-5 py-4">
          Stripe onboarding returned. Check the status below.
        </div>
      ) : null}
      {state === "error" ? (
        <div className="rounded-2xl border border-accent bg-paper px-5 py-4 text-accent">
          Stripe could not be checked. No payment feature was turned on.
        </div>
      ) : null}
      {state === "disconnected" ? <p className="rounded-2xl border border-line bg-paper-2 px-5 py-4">Online payment is off for your invoices. Your Stripe account remains with Stripe.</p> : null}
      {state === "disconnect-blocked" ? <p className="rounded-2xl border border-accent bg-paper px-5 py-4 text-accent">This connection has payment history. Contact support before disconnecting it.</p> : null}

      <section className="paper space-y-5 rounded-3xl p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Stripe status</p>
          <h2 className="mt-1 text-2xl">
            {!enabled ? "Paused" : !account ? "Not connected" : ready ? "Ready for test payments" : "Setup needed"}
          </h2>
        </div>

        {!enabled ? (
          <p className="text-muted">
            Stripe Connect is off. This is the safe default until the test webhook and account rules are set.
          </p>
        ) : null}

        {account ? (
          <dl className="grid gap-3 rounded-2xl border border-line bg-paper-2 p-4 sm:grid-cols-2">
            <div><dt className="text-sm text-muted">Card payments</dt><dd className="font-semibold">{account.cardPaymentsStatus ?? "Pending"}</dd></div>
            <div><dt className="text-sm text-muted">Details</dt><dd className="font-semibold">{account.detailsSubmitted ? "Submitted" : "Needed"}</dd></div>
            <div><dt className="text-sm text-muted">Fees paid by</dt><dd className="font-semibold">{account.feesCollector === "stripe" ? "Stripe account" : "Blocked"}</dd></div>
            <div><dt className="text-sm text-muted">Losses handled by</dt><dd className="font-semibold">{account.lossesCollector === "stripe" ? "Stripe" : "Blocked"}</dd></div>
          </dl>
        ) : null}

        {account?.disabledReason ? <p className="text-accent">{account.disabledReason}</p> : null}

        <div className="flex flex-wrap gap-3">
          {enabled && !ready ? (
            <form action="/api/stripe/connect/start" method="post">
              <button className="btn btn-primary" type="submit">
                {account ? "Continue Stripe setup" : "Connect Stripe"}
              </button>
            </form>
          ) : null}
          {enabled && account ? (
            <form action="/api/stripe/connect/sync" method="post">
              <button className="btn btn-ghost" type="submit">Check status</button>
            </form>
          ) : null}
          {account?.detailsSubmitted ? (
            <Link className="btn btn-secondary" href={stripeTestDashboardUrl()} target="_blank" rel="noreferrer">
              Open Stripe test dashboard
            </Link>
          ) : null}
          {account && !account.disconnectedAt ? (
            <form action="/api/stripe/connect/disconnect" method="post">
              <button className="btn btn-ghost" type="submit">Disconnect from Uncle Invoice</button>
            </form>
          ) : null}
        </div>
      </section>

      <p className="text-sm text-muted">
        Test mode only. Uncle Invoice does not add a payment fee. Stripe may charge its normal processing fees.
      </p>
    </div>
  );
}
