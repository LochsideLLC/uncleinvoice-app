import Link from "next/link";

export const metadata = {
  title: "Bookkeeper workspace — Uncle Invoice",
  description: "Prepare invoices from payment records, then let contractors review and send them to your clients. Free.",
};

export default function BookkeeperUpgradePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-6 pb-16">
      <Link href="/how-it-works" className="text-sm text-muted underline">← How it works</Link>
      <header className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Bookkeeper workspace · Free</p>
        <h1 className="display text-4xl">Turn recorded payments into invoices contractors can stand behind.</h1>
        <p className="text-lg text-muted">Prepare invoices for contractors who worked with your bookkeeping clients. They check the details, confirm the invoices, and send them to the client.</p>
      </header>
      <section className="space-y-4">
        <h2 className="display text-2xl">A clear handoff</h2>
        <ol className="space-y-4">
          <li className="paper flex gap-4 rounded-2xl p-5"><span className="font-semibold">1</span><p><strong>Export payment data</strong><br /><span className="text-sm text-muted">Export a spreadsheet from QuickBooks or another bookkeeping platform.</span></p></li>
          <li className="paper flex gap-4 rounded-2xl p-5"><span className="font-semibold">2</span><p><strong>Prepare invoice drafts</strong><br /><span className="text-sm text-muted">Import the payment rows and match them to contractor records and client workspaces.</span></p></li>
          <li className="paper flex gap-4 rounded-2xl p-5"><span className="font-semibold">3</span><p><strong>Let each contractor verify</strong><br /><span className="text-sm text-muted">Share a private review link so the contractor can check, correct, and confirm their invoices.</span></p></li>
          <li className="paper flex gap-4 rounded-2xl p-5"><span className="font-semibold">4</span><p><strong>Contractor sends the invoice</strong><br /><span className="text-sm text-muted">The contractor emails the confirmed invoice to your bookkeeping client, creating a clear record that matches the payment data.</span></p></li>
        </ol>
      </section>
      <section className="paper space-y-3 rounded-2xl p-6">
        <h2 className="display text-2xl">Included tools</h2>
        <ul className="list-disc space-y-2 pl-5 text-muted">
          <li>Spreadsheet payment import and invoice drafts.</li>
          <li>Contractor review and confirmation links; contractors do not need an account.</li>
          <li>Supporting documents and bulk invoice downloads.</li>
          <li>Unlimited bookkeeping clients.</li>
        </ul>
      </section>
      <p className="text-sm text-muted">This works from files you export and import. It is not a direct QuickBooks connection. Contractors review invoices through a private link; the current flow does not create a contractor sign-in account.</p>
      <div className="flex flex-wrap items-center gap-4">
        <Link href="/signup?workspace=bookkeeper" className="btn btn-primary">Explore Bookkeeper Tools — Free</Link>
        <Link href="/app/plans" className="text-sm underline">Already signed in? Compare workspaces</Link>
      </div>
    </div>
  );
}
