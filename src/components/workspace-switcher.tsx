import { CalculatorIcon, DocumentIcon } from "@/components/workspace-icons";
import type { WorkspaceKind } from "@/lib/workspace-kind";

const ICONS: Record<WorkspaceKind, typeof DocumentIcon> = {
  contractor: DocumentIcon,
  bookkeeper: CalculatorIcon,
};

// Mirrors WORKSPACE_LABEL in @/lib/workspace-kind, which client components
// cannot import (server-only). Keep the two in sync.
const LABELS: Record<WorkspaceKind, string> = {
  contractor: "Contractor",
  bookkeeper: "Bookkeeper",
};

/**
 * Contractor / Bookkeeper switcher. Presentational: the parent owns the
 * selection, paints the theme, persists the choice, and swaps the content,
 * so all four happen in the same instant. Native buttons keep it keyboard
 * accessible; the active side uses the workspace accent with light text plus
 * its icon and pressed state, so the mode never depends on color alone.
 */
export function WorkspaceSwitcher({
  active,
  pending,
  onSelect,
}: {
  active: WorkspaceKind;
  pending: boolean;
  onSelect: (kind: WorkspaceKind) => void;
}) {
  return (
    <div className="flex justify-center print:hidden">
      <div
        className="flex w-full max-w-md gap-1 rounded-xl p-1"
        role="group"
        aria-label="Workspace"
        aria-busy={pending}
        style={{
          background: "var(--paper-2)",
          boxShadow: "inset 0 1px 4px rgba(0,0,0,0.12), inset 0 0 0 1px rgba(0,0,0,0.06)",
        }}
      >
        {(["contractor", "bookkeeper"] as const).map((kind) => {
          const Icon = ICONS[kind];
          const isActive = active === kind;
          return (
            <button
              key={kind}
              type="button"
              onClick={() => onSelect(kind)}
              aria-pressed={isActive}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all"
              style={
                isActive
                  ? {
                      background: "var(--accent)",
                      color: "var(--accent-ink)",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                    }
                  : { color: "var(--muted)" }
              }
            >
              <Icon />
              {LABELS[kind]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
