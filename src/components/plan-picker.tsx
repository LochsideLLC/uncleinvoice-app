import { PLANS, PLAN_FEATURES, PLAN_LABEL, PLAN_TAGLINE, asPlan } from "@/lib/plan";

/**
 * The three tiers side by side, with the one in force marked.
 *
 * There is no checkout yet, on purpose: the plan is set by hand from the
 * admin screen while pricing is still being settled. The button says so
 * rather than pretending to take a card.
 */
export function PlanPicker({ current }: { current?: string | null }) {
  const active = asPlan(current);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {PLANS.map((plan) => {
        const isCurrent = plan === active;
        return (
          <div
            key={plan}
            className={`rounded-2xl border p-5 ${
              isCurrent ? "border-ink bg-[#f7ecd9]" : "border-line"
            }`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-lg font-medium">{PLAN_LABEL[plan]}</h3>
              {isCurrent ? (
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                  Your plan
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-muted">{PLAN_TAGLINE[plan]}</p>
            <ul className="mt-3 space-y-1.5 text-sm">
              {PLAN_FEATURES[plan].map((feature) => (
                <li key={feature} className="flex gap-2">
                  <span aria-hidden className="text-muted">
                    ·
                  </span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
