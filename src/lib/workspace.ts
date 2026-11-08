import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function requireWorkspace(workspaceId: string) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const membership = await db.workspaceMember.findUnique({
    where: {
      workspaceId_userId: { workspaceId, userId: user.id },
    },
    include: { workspace: true },
  });
  if (!membership) {
    redirect("/app");
  }
  return { user, membership, workspace: membership.workspace };
}

export async function listWorkspaces(userId: string, includeArchived = false) {
  return db.workspaceMember.findMany({
    where: {
      userId,
      ...(includeArchived ? {} : { workspace: { archivedAt: null } }),
    },
    include: {
      workspace: {
        include: {
          _count: { select: { contractors: true, invoices: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}
