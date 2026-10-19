"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updateWorkspaceKindAction } from "@/actions/account";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import type { WorkspaceKind } from "@/lib/workspace-kind";

/**
 * One dashboard, two modes, one atomic switch. The server renders BOTH
 * dashboards in a single pass, so flipping the toggle swaps theme and
 * content together with no server wait: the theme is pure CSS on a
 * workspace attribute and the content is already here. The choice persists
 * in the background and fresh data streams in silently underneath.
 */
export function WorkspaceDashboard({
  kind,
  contractor,
  bookkeeper,
}: {
  kind: WorkspaceKind;
  contractor: React.ReactNode;
  bookkeeper: React.ReactNode;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(kind);
  const [lastKind, setLastKind] = useState(kind);
  const [pending, setPending] = useState(false);

  // Server-confirmed value arrives after the background save + refresh.
  if (kind !== lastKind) {
    setLastKind(kind);
    setCurrent(kind);
  }

  // Paint the theme the moment the selection changes.
  useEffect(() => {
    document.body.dataset.workspace = current;
    document
      .querySelector("#app-workspace-scope")
      ?.setAttribute("data-workspace", current);
  }, [current]);

  function switchTo(next: WorkspaceKind) {
    if (next === current) return;
    setCurrent(next);
    setPending(true);
    updateWorkspaceKindAction(next).then(() => {
      router.refresh();
      setPending(false);
    });
  }

  return (
    <div className="space-y-8">
      <WorkspaceSwitcher active={current} pending={pending} onSelect={switchTo} />

      {/* Keyed by mode so the entrance animation replays on every switch. */}
      <div key={current} className="workspace-enter space-y-8">
        {current === "bookkeeper" ? bookkeeper : contractor}
      </div>
    </div>
  );
}
