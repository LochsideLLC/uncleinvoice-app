import { redirect } from "next/navigation";
import { getRealSessionUser } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // The real signed-in account, not whoever is being previewed. Gating on the
  // previewed account locked an admin out of the admin area — including out of
  // the page that turns the preview off — the moment they viewed as a
  // non-admin.
  const user = await getRealSessionUser();
  if (!user) redirect("/login?next=/admin");
  if (!user.admin) redirect("/app");

  return <div className="mx-auto w-full max-w-6xl px-6 pb-16">{children}</div>;
}
