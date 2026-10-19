import { setWorkspaceKindAction } from "@/actions/account";
import { WORKSPACE_LABEL, type WorkspaceKind } from "@/lib/workspace-kind";
import { CalculatorIcon, DocumentIcon } from "@/components/workspace-icons";

const ICONS: Record<WorkspaceKind, typeof DocumentIcon> = {
  contractor: DocumentIcon,
  bookkeeper: CalculatorIcon,
};

/**
 * Contractor / Bookkeeper switcher. Same account, both free, no re-login.
 * The active side uses the workspace accent with light text plus its icon
 * and pressed state, so the mode never depends on color alone. Plain form
 * posts keep it keyboard accessible and working without client JavaScript
 * beyond hydration.
 */
export function WorkspaceSwitcher({ active }: { active: WorkspaceKind }) {
  return (
    <div className="flex justify-center print:hidden">
      <div
        className="flex w-full max-w-md gap-1 rounded-xl p-1"
        role="group"
        aria-label="Workspace"
        style={{
          background: "var(--paper-2)",
          boxShadow: "inset 0 1px 4px rgba(0,0,0,0.12), inset 0 0 0 1px rgba(0,0,0,0.06)",
        }}
      >
        {(["contractor", "bookkeeper"] as const).map((kind) => {
          const Icon = ICONS[kind];
          const isActive = active === kind;
          return (
            <form key={kind} action={setWorkspaceKindAction} className="flex-1">
              <input type="hidden" name="workspace" value={kind} />
              <button
                type="submit"
                aria-pressed={isActive}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all"
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
                {WORKSPACE_LABEL[kind]}
              </button>
            </form>
          );
        })}
      </div>
    </div>
  );
}
