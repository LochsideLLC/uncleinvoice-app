import Link from "next/link";

export const metadata = {
  title: "Contractor workspace — Uncle Invoice",
  description: "Create invoices for free. Get paid. Finished invoices carry only your business.",
};

export default function ContractorPlanPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-6 pb-16">
      <Link href="/how-it-works" className="text-sm text-muted underline">← How it works</Link>
      <header className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Contractor workspace · Free</p>
        <h1 className="display text-4xl">Keep the invoice focused on your business.</h1>
        <p className="text-lg text-muted">Create, track, and send invoices as usual—with no Uncle Invoice credit on the finished invoice or PDF.</p>
      </header>
      <section className="paper space-y-4 rounded-2xl p-6">
        <h2 className="display text-2xl">What you get</h2>
        <ul className="list-disc space-y-2 pl-5 text-muted">
          <li>Create invoices for free. Get paid.</li>
          <li>Your finished invoice without the Uncle Invoice line.</li>
          <li>The same straightforward tools to create and send invoices and track payment.</li>
        </ul>
      </section>
      <Link href="/create" className="btn btn-primary">Create an Invoice — Free</Link>
      <p className="text-sm text-muted">Already have an account? Open <Link href="/app/plans" className="underline">Compare workspaces</Link> to pick a side.</p>
    </div>
  );
}
