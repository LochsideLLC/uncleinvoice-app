"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updateWorkspaceKindAction } from "@/actions/account";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import { SectionTabs, type DashboardSection } from "@/components/dashboard-tabs";
import type { WorkspaceKind } from "@/lib/workspace-kind";

/**
 * One dashboard, two modes, one atomic switch. The server renders BOTH
 * dashboards in a single pass, so flipping the toggle swaps theme and
 * content together with no server wait: the theme is pure CSS on a
 * workspace attribute and the content is already here. The choice persists
 * in the background and fresh data streams in silently underneath.
 *
 * Contractor mode packs the mode switcher, section tabs, and primary
 * action into one toolbar so invoices start near the top of the viewport.
 */
export function WorkspaceDashboard({
  kind,
  createAction,
  invoices,
  clients,
  bookkeeper,
}: {
  kind: WorkspaceKind;
  createAction: React.ReactNode;
  invoices: React.ReactNode;
  clients: React.ReactNode;
  bookkeeper: React.ReactNode;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(kind);
  const [lastKind, setLastKind] = useState(kind);
  const [pending, setPending] = useState(false);
  const [section, setSection] = useState<DashboardSection>("invoices");

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

  const isContractor = current === "contractor";

  return (
    <div className="space-y-4">
      {/* Single toolbar: mode switcher, section tabs, primary action. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="w-60 shrink-0 sm:w-72">
          <WorkspaceSwitcher active={current} pending={pending} onSelect={switchTo} />
        </div>
        {isContractor ? (
          <>
            <div className="flex min-w-0 flex-1 justify-start lg:justify-center">
              <SectionTabs tab={section} onChange={setSection} />
            </div>
            <div className="ml-auto shrink-0">{createAction}</div>
          </>
        ) : null}
      </div>

      {/* Keyed by mode so the entrance animation replays on every switch. */}
      <div key={current} className="workspace-enter space-y-4">
        {current === "bookkeeper" ? bookkeeper : section === "invoices" ? invoices : clients}
      </div>
    </div>
  );
}
