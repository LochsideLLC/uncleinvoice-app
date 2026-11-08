import { redirect } from "next/navigation";

/** Keep old client URLs working while the work queue becomes the landing page. */
export default async function WorkspaceHomePage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  redirect(`/app/w/${workspaceId}/contractors`);
}
