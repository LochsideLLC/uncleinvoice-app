import Link from "next/link";

export const metadata = {
  title: "How Uncle Invoice works",
  description: "See how Uncle Invoice turns payment records into invoices that contractors can check and send.",
};

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-12 px-6 pb-16">
      <header className="mx-auto max-w-2xl space-y-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">How it works</p>
        <h1 className="display text-4xl">From payment record to finished invoice</h1>
        <p className="text-lg text-muted">Uncle Invoice helps contractors make and send invoices, and helps bookkeepers prepare invoices from payments already recorded in their books.</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          ["1. Start with the work", "A contractor can create an invoice, or a bookkeeper can prepare drafts from an exported payment spreadsheet."],
          ["2. Check the details", "The contractor reviews the draft, fixes anything that needs changing, and confirms the invoice."],
          ["3. Send it to the client", "After confirmation, the contractor sends the invoice to the client. The goal: an invoice that agrees with the recorded payment."],
        ].map(([title, body]) => (
          <article key={title} className="paper space-y-3 rounded-2xl p-5">
            <h2 className="display text-xl">{title}</h2>
            <p className="text-sm leading-relaxed text-muted">{body}</p>
          </article>
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="display text-2xl">Choose the tools you need</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link href="/upgrades/contractor" className="paper rounded-2xl p-6 transition hover:-translate-y-0.5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Contractor workspace · Free</p>
            <h3 className="display mt-2 text-2xl">Your invoice, your brand</h3>
            <p className="mt-2 text-sm text-muted">Finished invoices carry only your business — free, no subscription.</p>
            <span className="mt-4 inline-block text-sm underline">Explore Contractor</span>
          </Link>
          <Link href="/upgrades/bookkeeper" className="paper rounded-2xl p-6 transition hover:-translate-y-0.5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Bookkeeper workspace · Free</p>
            <h3 className="display mt-2 text-2xl">Payments become invoices</h3>
            <p className="mt-2 text-sm text-muted">Import payment spreadsheets, prepare drafts, and let contractors confirm and send.</p>
            <span className="mt-4 inline-block text-sm underline">Explore Bookkeeper</span>
          </Link>
        </div>
      </section>
      <p className="text-center text-sm text-muted">QuickBooks and other bookkeeping-platform data is brought in by spreadsheet export and import; Uncle Invoice does not connect directly to those platforms.</p>
    </div>
  );
}
