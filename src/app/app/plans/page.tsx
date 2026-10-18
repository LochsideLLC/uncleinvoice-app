import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { asPlan } from "@/lib/plan";
import { UPGRADE_OFFERS } from "@/lib/upgrade";
import { PlanMatrix } from "@/components/plan-matrix";
import { CheckoutSuccessModal } from "@/components/checkout-success-modal";

export const metadata = { title: "Plans — Uncle Invoice" };

export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ feature?: string; checkout?: string }>;
}) {
  const user = await requireUser();
  const { feature, checkout } = await searchParams;
  const context = feature && Object.hasOwn(UPGRADE_OFFERS, feature) ? UPGRADE_OFFERS[feature as keyof typeof UPGRADE_OFFERS] : null;
  const current = asPlan(user.plan);
  const paidPlan = current === "free" ? null : current;
  return <div className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 px-6 sm:px-8">
    <header className="mx-auto w-full max-w-6xl pb-4 sm:pb-6">
      <Link href="/app" className="text-sm text-muted underline">← Back to your invoices</Link>
      {context && <p className="mt-4 max-w-2xl rounded-xl bg-paper-2 p-4">You came here for: {context.title}</p>}
      {checkout === "success" && <CheckoutSuccessModal plan={paidPlan} />}
      {checkout === "canceled" && <p className="mt-4 max-w-2xl rounded-xl bg-paper-2 p-4">Checkout canceled. Your plan has not changed.</p>}
    </header>
    <section id="matrix" aria-label="Plan comparison" className="scroll-mt-24">
      <div className="mx-auto w-full max-w-6xl pt-4 sm:pt-6 pb-10 sm:pb-14">
        <div className="overflow-x-auto">
          <PlanMatrix current={current} />
        </div>
        <p className="mt-6 text-sm text-muted">Stripe Checkout is in test mode. Use a Stripe test card; no real money is charged.</p>
      </div>
    </section>
  </div>;
}
