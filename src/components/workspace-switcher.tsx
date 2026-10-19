"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateWorkspaceKindAction } from "@/actions/account";
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
 * Contractor / Bookkeeper switcher. Same account, both free, no re-login.
 *
 * Flips instantly: the theme is pure CSS on a workspace attribute, so the
 * click re-themes the whole page before the server round-trip finishes. The
 * account preference persists in the background and the dashboard data
 * refreshes underneath. Native buttons keep it keyboard accessible; the
 * active side uses the workspace accent with light text plus its icon and
 * pressed state, so the mode never depends on color alone.
 */
export function WorkspaceSwitcher({ active }: { active: WorkspaceKind }) {
  const router = useRouter();
  // The parent keys this component by the saved preference, so a confirmed
  // server value remounts and resyncs; local state only leads during flight.
  const [current, setCurrent] = useState(active);
  const [pending, startTransition] = useTransition();

  // Paint the theme the moment the selection changes — including the first
  // optimistic flip, before the server round-trip finishes. The confirmed
  // server value arrives via the active prop after refresh.
  useEffect(() => {
    document.body.dataset.workspace = current;
    document
      .querySelector("#app-workspace-scope")
      ?.setAttribute("data-workspace", current);
  }, [current]);

  // Reconcile in place when the server confirms (no remount key: remounting
  // on refresh duplicated the switcher instead of replacing it). Render-time
  // sync, not an effect, per the React docs pattern for previous-render info.
  const [lastActive, setLastActive] = useState(active);
  if (active !== lastActive) {
    setLastActive(active);
    setCurrent(active);
  }

  function switchTo(kind: WorkspaceKind) {
    if (kind === current) return;
    setCurrent(kind);
    startTransition(async () => {
      await updateWorkspaceKindAction(kind);
      router.refresh();
    });
  }

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
          const isActive = current === kind;
          return (
            <button
              key={kind}
              type="button"
              onClick={() => switchTo(kind)}
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
