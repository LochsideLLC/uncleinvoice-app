import "server-only";

import { db } from "@/lib/db";

/**
 * Free dual workspaces: one account, two modes.
 *
 * `User.workspaceKind` is the active mode ("contractor" or "bookkeeper") and
 * is remembered between visits. `contractorOnboardedAt` /
 * `bookkeeperOnboardedAt` are independent access flags: entering one mode
 * never closes the other, and re-entering never duplicates anything.
 *
 * This is deliberately NOT the `Workspace` table. Those rows are client
 * businesses (customers you bill, books you keep). The kind here is which
 * half of the app the person is looking at right now.
 */
export const WORKSPACE_KINDS = ["contractor", "bookkeeper"] as const;
export type WorkspaceKind = (typeof WORKSPACE_KINDS)[number];

export function asWorkspaceKind(value?: string | null): WorkspaceKind {
  return value === "bookkeeper" ? "bookkeeper" : "contractor";
}

export const WORKSPACE_LABEL: Record<WorkspaceKind, string> = {
  contractor: "Contractor",
  bookkeeper: "Bookkeeper",
};

/** Enter a mode: remember it and stamp first access. Idempotent. */
export async function enterWorkspace(userId: string, kind: WorkspaceKind) {
  const flag = kind === "bookkeeper" ? "bookkeeperOnboardedAt" : "contractorOnboardedAt";
  return db.user.update({
    where: { id: userId },
    data: {
      workspaceKind: kind,
      [flag]: new Date(),
    },
  });
}
