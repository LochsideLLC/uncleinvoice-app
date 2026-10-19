import { setWorkspaceKindAction } from "@/actions/account";
import { WORKSPACE_LABEL, type WorkspaceKind } from "@/lib/workspace-kind";

/** Contractor / Bookkeeper switcher. Same account, both free, no re-login. */
export function WorkspaceSwitcher({ active }: { active: WorkspaceKind }) {
  return (
    <div className="flex justify-center print:hidden">
      <div
        className="flex rounded-2xl p-1"
        role="group"
        aria-label="Workspace"
        style={{
          background: "var(--paper-2)",
          boxShadow: "inset 0 1px 4px rgba(42,31,22,0.18), inset 0 0 0 1px rgba(42,31,22,0.08)",
        }}
      >
        {(["contractor", "bookkeeper"] as const).map((kind) => (
          <form key={kind} action={setWorkspaceKindAction}>
            <input type="hidden" name="workspace" value={kind} />
            <button
              type="submit"
              aria-pressed={active === kind}
              className="rounded-xl px-6 py-2 text-sm font-semibold transition-all"
              style={
                active === kind
                  ? {
                      background: "var(--paper)",
                      color: "var(--ink)",
                      boxShadow: "0 1px 3px rgba(42,31,22,0.18), 0 0 0 1px rgba(42,31,22,0.07)",
                    }
                  : { color: "var(--muted)" }
              }
            >
              {WORKSPACE_LABEL[kind]}
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
