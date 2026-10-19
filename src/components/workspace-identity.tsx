import { CalculatorIcon, DocumentIcon } from "@/components/workspace-switcher";
import type { WorkspaceKind } from "@/lib/workspace-kind";

const COPY: Record<WorkspaceKind, { title: string; description: string }> = {
  contractor: {
    title: "Contractor Workspace",
    description: "Create invoices, manage customers, and track payments.",
  },
  bookkeeper: {
    title: "Bookkeeper Workspace",
    description: "Manage client records, contractor verification, and missing invoices.",
  },
};

const ICONS = {
  contractor: DocumentIcon,
  bookkeeper: CalculatorIcon,
} as const;

/**
 * Compact contextual header directly under the switcher: which workspace
 * this is and what it is for. One short line, accent-tinted icon — the
 * dashboard content below stays near the top of the page.
 */
export function WorkspaceIdentity({ active }: { active: WorkspaceKind }) {
  const Icon = ICONS[active];
  const copy = COPY[active];
  return (
    <div className="flex items-center justify-center gap-3 text-center">
      <span
        aria-hidden
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
      >
        <Icon />
      </span>
      <span>
        <span className="display block text-left text-2xl leading-tight">{copy.title}</span>
        <span className="block text-left text-sm text-muted">{copy.description}</span>
      </span>
    </div>
  );
}
