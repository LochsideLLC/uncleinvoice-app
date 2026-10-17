import { PLAN_LABEL, PLANS, asPlan, type Plan } from "@/lib/plan";
import { canRequestPlan, requestPlanHref } from "@/lib/upgrade";

const ROWS: { label: string; plans: Plan[] }[] = [
  { label: "Save as many billing customers as you need", plans: ["free", "invoice", "bookkeeper"] },
  { label: "Write and send invoices", plans: ["free", "invoice", "bookkeeper"] },
  { label: "Track what is paid and what is still owed", plans: ["free", "invoice", "bookkeeper"] },
  { label: "Finished invoices without the Uncle Invoice credit", plans: ["invoice", "bookkeeper"] },
  { label: "Import a spreadsheet of payments into drafts", plans: ["bookkeeper"] },
  { label: "Contractor review-and-confirm links", plans: ["bookkeeper"] },
  { label: "Attach supporting documents", plans: ["bookkeeper"] },
  { label: "Download invoices in bulk", plans: ["bookkeeper"] },
];

function Cell({ included }: { included: boolean }) {
  return included ? (
    <><span aria-hidden="true" className="text-lg font-semibold text-accent">✓</span><span className="sr-only">Included</span></>
  ) : (
    <><span aria-hidden="true" className="text-muted">—</span><span className="sr-only">Not included</span></>
  );
}

/** Every tier against every feature, with checks. No checkout yet: requests go by email. */
export function PlanMatrix({ current }: { current?: string | null }) {
  const active = asPlan(current);
  return (
    <table className="w-full border-collapse text-sm sm:text-base">
      <thead>
        <tr className="border-b-2 border-ink text-left align-bottom">
          <th scope="col" className="py-3 pr-4 font-medium text-muted">Compare the plans</th>
          {PLANS.map((plan) => (
            <th key={plan} scope="col" className="px-3 py-3 text-center">
              {PLAN_LABEL[plan]}
              {plan === active && (
                <span className="mt-1 block text-xs font-semibold uppercase tracking-[0.12em] text-muted">Your plan</span>
              )}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {ROWS.map((row) => (
          <tr key={row.label} className="border-b border-line">
            <th scope="row" className="py-3 pr-4 text-left font-normal">{row.label}</th>
            {PLANS.map((plan) => (
              <td key={plan} className="px-3 py-3 text-center">
                <Cell included={row.plans.includes(plan)} />
              </td>
            ))}
          </tr>
        ))}
        <tr>
          <th scope="row" className="py-4 pr-4 text-left font-normal text-muted">Get started</th>
          {PLANS.map((plan) => (
            <td key={plan} className="px-3 py-4 text-center align-top">
              {plan === active ? (
                <p className="text-sm text-muted">You are on this plan.</p>
              ) : plan === "free" || !canRequestPlan(active, plan) ? (
                <p className="text-sm text-muted">Included in your plan.</p>
              ) : (
                <a href={requestPlanHref(plan)} className="btn btn-primary w-full">Request {PLAN_LABEL[plan]}</a>
              )}
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}
