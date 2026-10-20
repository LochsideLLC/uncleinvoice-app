import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { asWorkspaceKind } from "@/lib/workspace-kind";
import { WorkspaceTheme } from "@/components/workspace-theme";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const kind = asWorkspaceKind(user.workspaceKind);

  return (
    <div id="app-workspace-scope" data-workspace={kind} className="mx-auto w-full max-w-[80rem] px-4 pb-16 sm:px-6">
      <WorkspaceTheme kind={kind} />
      {children}
    </div>
  );
}
