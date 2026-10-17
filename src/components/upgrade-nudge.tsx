import Link from "next/link";
import { PLANS, PLAN_FEATURES, asPlan } from "@/lib/plan";

/**
 * The upsell on the dashboard.
 *
 * Shown to everyone who is not already on the top tier, and to nobody who is.
 * What it offers depends on where they are: a free account is sold the whole
 * ladder, an Invoice account only the step it has not taken.
 *
 * It sits under the stats rather than above the Create Invoice button on
 * purpose — the first thing someone came here to do is write an invoice, not
 * read an advertisement.
 */
export function UpgradeNudge({ plan }: { plan?: string | null }) {
  const current = asPlan(plan);
  if (current === "bookkeeper") return null;

  /**
   * Everything the tiers above them add, with two things taken out: the
   * "Everything in …" lines, which say nothing outside the pricing table,
   * and anything they already have. Offering a free account "One client" as
   * a reason to pay is how an upsell loses its credibility.
   */
  const alreadyHave = new Set(PLAN_FEATURES[current]);
  const gains = PLANS.slice(PLANS.indexOf(current) + 1)
    .flatMap((tier) => PLAN_FEATURES[tier])
    .filter((f) => !f.startsWith("Everything in") && !alreadyHave.has(f));
  const heading =
    current === "free"
      ? "Put your name on it, and nobody else's"
      : "Keeping books for other people?";
  const pitch =
    current === "free"
      ? "The Uncle Invoice line sits at the bottom of every invoice you send. Invoice takes it off. Bookkeeper adds as many clients as you keep, a spreadsheet importer, and a link that lets each contractor confirm and send their own."
      : "Bookkeeper lifts the one-client limit and adds the spreadsheet importer, contractor confirm-and-send links, bulk download and supporting documents.";


  return (
    <section className="paper rounded-3xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            {current === "free" ? "On the Free plan" : "On the Invoice plan"}
          </p>
          <h2 className="mt-1 text-2xl">{heading}</h2>
          <p className="mt-2 text-sm text-muted">{pitch}</p>
          <ul className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2">
            {gains.map((feature) => (
              <li key={feature} className="flex gap-2">
                <span aria-hidden className="text-muted">
                  ·
                </span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
        <Link href="/app/profile#upgrade" className="btn btn-primary">
          See the plans
        </Link>
      </div>
    </section>
  );
}
