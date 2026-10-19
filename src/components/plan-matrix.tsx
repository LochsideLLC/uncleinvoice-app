import type { WorkspaceKind } from "@/lib/workspace-kind";
import { WORKSPACE_LABEL } from "@/lib/workspace-kind";

const ROWS: { label: string; contractor: boolean; bookkeeper: boolean }[] = [
  { label: "Save as many billing customers as you need", contractor: true, bookkeeper: true },
  { label: "Write and send invoices", contractor: true, bookkeeper: true },
  { label: "Track what is paid and what is still owed", contractor: true, bookkeeper: true },
  { label: "Finished invoices without the Uncle Invoice credit", contractor: true, bookkeeper: true },
  { label: "Import a spreadsheet of payments into drafts", contractor: true, bookkeeper: true },
  { label: "Contractor review-and-confirm links", contractor: true, bookkeeper: true },
  { label: "Attach supporting documents", contractor: true, bookkeeper: true },
  { label: "Download invoices in bulk", contractor: true, bookkeeper: true },
];

function Cell({ included }: { included: boolean }) {
  return included ? (
    <><span aria-hidden="true" className="text-lg font-semibold text-accent">✓</span><span className="sr-only">Included</span></>
  ) : (
    <><span aria-hidden="true" className="text-muted">—</span><span className="sr-only">Not included</span></>
  );
}

/** Both workspaces, both free: every feature is included on both sides. */
export function PlanMatrix({ current }: { current?: WorkspaceKind | null }) {
  const kinds: WorkspaceKind[] = ["contractor", "bookkeeper"];
  return (
    <table className="w-full border-collapse text-sm sm:text-base">
      <thead>
        <tr className="border-b-2 border-ink text-left align-bottom">
          <th scope="col" className="py-3 pr-4 font-medium text-muted">Compare the workspaces</th>
          {kinds.map((kind) => (
            <th key={kind} scope="col" className="px-3 py-3 text-center">
              <span className="flex min-h-5 items-center justify-center">
                {kind === current ? (
                  <span title="Your workspace" className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-white">
                    <span className="sr-only">Your workspace: </span>
                    <span aria-hidden="true">Current</span>
                  </span>
                ) : null}
              </span>
              <span className="mt-1 block whitespace-nowrap">{WORKSPACE_LABEL[kind]}</span>
              <span className="mt-1 block text-sm font-normal text-muted">$0/mo · Free</span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {ROWS.map((row) => (
          <tr key={row.label} className="border-b border-line">
            <th scope="row" className="py-3 pr-4 text-left font-normal">{row.label}</th>
            <td className="px-3 py-3 text-center">
              <Cell included={row.contractor} />
            </td>
            <td className="px-3 py-3 text-center">
              <Cell included={row.bookkeeper} />
            </td>
          </tr>
        ))}
        <tr>
          <th scope="row" className="py-4 pr-4 text-left font-normal text-muted align-middle">Get started</th>
          {kinds.map((kind) => (
            <td key={kind} className="px-3 py-4 text-center align-middle">
              {kind === current ? (
                <p className="text-sm text-muted">You are on this workspace.</p>
              ) : (
                <p className="text-sm text-muted">Free — open it anytime.</p>
              )}
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}
