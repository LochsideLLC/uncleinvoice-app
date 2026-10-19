"use client";

import { useEffect } from "react";
import type { WorkspaceKind } from "@/lib/workspace-kind";

/**
 * Paints the page background in the active workspace theme. The dashboard
 * itself themes through data-workspace on the app container (server
 * rendered, so first paint is already correct); this covers the full-bleed
 * body around it and updates the moment the saved preference changes.
 */
export function WorkspaceTheme({ kind }: { kind: WorkspaceKind }) {
  useEffect(() => {
    document.body.dataset.workspace = kind;
    return () => {
      delete document.body.dataset.workspace;
    };
  }, [kind]);
  return null;
}
