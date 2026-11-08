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
  initialSection = "invoices",
  createAction,
  invoices,
  clients,
  bookkeeper,
}: {
  kind: WorkspaceKind;
  initialSection?: DashboardSection;
  createAction: React.ReactNode;
  invoices: React.ReactNode;
  clients: React.ReactNode;
  bookkeeper: React.ReactNode;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(kind);
  const [lastKind, setLastKind] = useState(kind);
  const [pending, setPending] = useState(false);
  const [section, setSection] = useState<DashboardSection>(initialSection);

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
    <div className="mobile-dashboard space-y-3 sm:space-y-4">
      {/* Single toolbar: mode switcher, section tabs, primary action. */}
      {/* On wide screens a 1fr / auto / 1fr grid puts the section tabs on the
          page's true centre line, whatever the widths of the switcher and the
          action beside them. Narrower screens wrap as before. */}
      <div
        className={
          isContractor
            ? "grid grid-cols-2 items-center gap-x-2 gap-y-1 sm:flex sm:flex-wrap sm:gap-x-4 sm:gap-y-2 lg:grid lg:grid-cols-[1fr_auto_1fr]"
            : "flex flex-wrap items-center gap-x-4 gap-y-2"
        }
      >
        <div className={isContractor ? "col-span-2 w-full sm:col-span-1 sm:w-60 sm:shrink-0 lg:w-full" : "w-60 shrink-0 sm:w-72"}>
          <WorkspaceSwitcher active={current} pending={pending} onSelect={switchTo} />
        </div>
        {isContractor ? (
          <>
            <div className="w-full min-w-0 lg:w-auto lg:justify-self-center">
              <SectionTabs tab={section} onChange={setSection} />
            </div>
            <div className="w-full min-w-0 sm:ml-auto sm:w-auto lg:justify-self-end">{createAction}</div>
          </>
        ) : null}
      </div>

      {/* Keyed by mode so the entrance animation replays on every switch. */}
      <div key={current} className="workspace-enter space-y-3 sm:space-y-4">
        {current === "bookkeeper" ? bookkeeper : section === "invoices" ? invoices : clients}
      </div>
    </div>
  );
}
