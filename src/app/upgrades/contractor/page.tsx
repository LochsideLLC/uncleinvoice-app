import Link from "next/link";

export const metadata = {
  title: "Contractor plan — Uncle Invoice",
  description: "Keep Uncle Invoice credit off the invoices you send to your customers.",
};

export default function ContractorPlanPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-6 pb-16">
      <Link href="/how-it-works" className="text-sm text-muted underline">← How it works</Link>
      <header className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Contractor plan · $5/month</p>
        <h1 className="display text-4xl">Keep the invoice focused on your business.</h1>
        <p className="text-lg text-muted">Create, track, and send invoices as usual—with no Uncle Invoice credit on the finished invoice or PDF.</p>
      </header>
      <section className="paper space-y-4 rounded-2xl p-6">
        <h2 className="display text-2xl">What you get</h2>
        <ul className="list-disc space-y-2 pl-5 text-muted">
          <li>Everything in the free plan.</li>
          <li>Your finished invoice without the Uncle Invoice line.</li>
          <li>The same straightforward tools to create and send invoices and track payment.</li>
        </ul>
      </section>
      <Link href="/signup" className="btn btn-primary">Create an account</Link>
      <p className="text-sm text-muted">Already have an account? Open <Link href="/app/plans" className="underline">Unlock features</Link> to choose a plan.</p>
    </div>
  );
}
