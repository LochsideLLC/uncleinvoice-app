import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { asPlan, PLAN_LABEL } from "@/lib/plan";
import { requestPlanHref, canRequestPlan, UPGRADE_OFFERS } from "@/lib/upgrade";
import { PlanPicker } from "@/components/plan-picker";
import { BrandingPreview } from "@/components/branding-preview";

export const metadata = { title: "Plans — Uncle Invoice" };

export default async function PlansPage({ searchParams }: { searchParams: Promise<{ feature?: string }> }) {
  const user = await requireUser();
  const { feature } = await searchParams;
  const context = feature && Object.hasOwn(UPGRADE_OFFERS, feature) ? UPGRADE_OFFERS[feature as keyof typeof UPGRADE_OFFERS] : null;
  const current = asPlan(user.plan);
  return <div className="mx-auto max-w-5xl space-y-12">
    <header className="max-w-2xl">
      <Link href="/app" className="text-sm text-muted underline">← Back to your invoices</Link>
      <p className="mt-6 text-sm text-muted">Your plan: {PLAN_LABEL[current]}</p>
      <h1 className="mt-2 text-4xl sm:text-5xl">A little more yours.<br />A lot less paperwork.</h1>
      <p className="mt-4 text-lg text-muted">Keep writing and sending invoices for free. Choose Invoice for a page that carries only your business, or Bookkeeper for the work you do on someone else&rsquo;s books.</p>
      {context && <p className="mt-4 rounded-xl bg-paper-2 p-4">You came here for: {context.title}</p>}
    </header>
    <section id="invoice" className="grid scroll-mt-24 items-center gap-8 md:grid-cols-2">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-muted">Invoice</p>
        <h2 className="mt-2 text-3xl">Your work. Your name.</h2>
        <p className="mt-4 text-muted">You have done the work. Let the invoice carry only your business. The Uncle Invoice credit disappears from your finished invoices and PDFs.</p>
        <p className="mt-3 text-muted">Save as many billing customers as you need, on Free or Invoice. You do not need Bookkeeper just to bill another customer.</p>
        {canRequestPlan(current, "invoice") && <a href={requestPlanHref("invoice")} className="btn btn-primary mt-5">Request Invoice</a>}
      </div>
      <BrandingPreview />
    </section>
    <section id="bookkeeper" className="paper scroll-mt-24 rounded-3xl p-6 sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-wider text-muted">Bookkeeper</p>
      <h2 className="mt-2 max-w-2xl text-3xl">The payments are already in the books.<br />Now get the invoices.</h2>
      <p className="mt-4 max-w-2xl text-muted">Prepare the details once. Give contractors a link to check their invoices and confirm them. Your plan covers the clients you keep books for; contractors do not need to pay.</p>
      <ol className="my-7 grid gap-4 md:grid-cols-3">
        {[
          ["1", "Bring the payments", "Import a CSV of payments into invoice drafts."],
          ["2", "Let contractors check", "Share a review link. Each contractor checks the details and confirms their invoices."],
          ["3", "Keep the records", "Attach supporting documents and download the finished invoices together."],
        ].map(([step, title, detail]) => <li key={step} className="rounded-2xl border border-line p-5"><span className="text-sm text-muted">Step {step}</span><h3 className="mt-2 text-xl">{title}</h3><p className="mt-2 text-sm text-muted">{detail}</p></li>)}
      </ol>
      {canRequestPlan(current, "bookkeeper") ? <a href={requestPlanHref("bookkeeper")} className="btn btn-primary">Request Bookkeeper</a> : <p className="font-medium">Bookkeeper is already included in your account.</p>}
    </section>
    <section aria-labelledby="compare-title" className="space-y-5">
      <h2 id="compare-title" className="text-3xl">Choose what helps you.</h2>
      <div className="rounded-xl border border-line p-5 text-sm text-muted">Paid-plan pricing is being finalized. Request opens an email you can review and send. We will reply with pricing and next steps before changing your plan. No payment is taken here.</div>
      <PlanPicker current={current} />
      <p className="text-sm text-muted">Already requested a plan? When it is enabled, return to your original tab and refresh your plan to continue. An email request does not activate an upgrade.</p>
    </section>
    <div className="flex flex-wrap gap-4"><Link href="/create" className="btn btn-secondary">Keep creating invoices</Link><Link href="/app/profile" className="btn btn-ghost">Account settings</Link></div>
  </div>;
}
