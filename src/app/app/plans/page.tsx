import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { asPlan } from "@/lib/plan";
import { UPGRADE_OFFERS } from "@/lib/upgrade";
import { PlanMatrix } from "@/components/plan-matrix";

export const metadata = { title: "Plans — Uncle Invoice" };

export default async function PlansPage({ searchParams }: { searchParams: Promise<{ feature?: string }> }) {
  const user = await requireUser();
  const { feature } = await searchParams;
  const context = feature && Object.hasOwn(UPGRADE_OFFERS, feature) ? UPGRADE_OFFERS[feature as keyof typeof UPGRADE_OFFERS] : null;
  const current = asPlan(user.plan);
  return <div className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 px-6 sm:px-8">
    <header className="mx-auto w-full max-w-6xl pb-4 sm:pb-6">
      <Link href="/app" className="text-sm text-muted underline">← Back to your invoices</Link>
      {context && <p className="mt-4 max-w-2xl rounded-xl bg-paper-2 p-4">You came here for: {context.title}</p>}
    </header>
    <section id="matrix" aria-label="Plan comparison" className="scroll-mt-24">
      <div className="mx-auto w-full max-w-6xl pt-4 sm:pt-6 pb-10 sm:pb-14">
        <div className="overflow-x-auto">
          <PlanMatrix current={current} />
        </div>
        <p className="mt-6 text-sm text-muted">Requesting a plan opens an email you can review and send. No payment is taken here.</p>
      </div>
    </section>
  </div>;
}
