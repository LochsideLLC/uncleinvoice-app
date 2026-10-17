import { redirect } from "next/navigation";
import { findResetToken } from "@/actions/auth";
import { ResetPasswordForm } from "@/components/reset-password-form";

export const metadata = { title: "Choose a new password — Uncle Invoice" };

/**
 * A page, not a route handler, because nothing here sets a cookie: the link
 * only opens the form. The token is spent when the form is submitted, so a
 * link preview or a mail scanner that fetches the URL does not burn it.
 *
 * It stays in the path rather than a query string for the same reason the
 * sign-in link does — see src/app/auth/verify/[token]/route.ts.
 */
export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const found = await findResetToken(token);
  if (!found) redirect("/login?error=reset_invalid");

  return <ResetPasswordForm token={token} email={found.email} />;
}
