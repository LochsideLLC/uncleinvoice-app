import { setWorkspaceKindAction } from "@/actions/account";

export const metadata = { title: "What would you like to do? — Uncle Invoice" };

const CHOICES = [
  {
    workspace: "contractor",
    title: "Create and send invoices",
    blurb: "For contractors and small businesses. Write invoices, send them to customers, and track what is paid.",
  },
  {
    workspace: "bookkeeper",
    title: "Manage contractor invoices for clients",
    blurb: "For bookkeepers and accounting professionals. Turn payment records into drafts contractors verify.",
  },
] as const;

/**
 * General registration lands here: pick a starting side. The choice only
 * sets the initial workspace — both stay free and both stay open, and the
 * switcher moves between them later. Guest-claim signups skip this page and
 * land on their invoice; bookkeeper-CTAs land in that workspace directly.
 */
export default function OnboardingPage() {
  return (
    <section className="mx-auto max-w-xl space-y-5 py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Welcome to Uncle Invoice</p>
      <h1 className="display text-3xl">What would you like to do?</h1>
      <p className="text-muted">You can always do both later.</p>
      <div className="grid gap-4">
        {CHOICES.map((choice) => (
          <form
            key={choice.workspace}
            action={setWorkspaceKindAction}
            className="paper space-y-2 rounded-3xl p-6"
          >
            <input type="hidden" name="workspace" value={choice.workspace} />
            <h2 className="text-2xl">{choice.title}</h2>
            <p className="text-sm text-muted">{choice.blurb}</p>
            <button className="btn btn-primary mt-2" type="submit">
              Continue
            </button>
          </form>
        ))}
      </div>
    </section>
  );
}
