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
 * accessible; a white surface separates the switcher from the primary action,
 * while the selected side uses a thin accent outline, darker text, and its
 * pressed state so the mode never depends on color alone.
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
          background: "#fff",
          border: "1px solid var(--line)",
          boxShadow: "0 1px 3px rgba(42,31,22,0.08)",
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
                      background: "#fff",
                      color: "var(--ink)",
                      boxShadow: "inset 0 0 0 1px var(--accent), 0 1px 3px rgba(42,31,22,0.12)",
                    }
                  : { background: "transparent", color: "var(--muted)" }
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
