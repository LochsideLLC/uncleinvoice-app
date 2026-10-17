import { ForgotPasswordForm } from "@/components/forgot-password-form";

export const metadata = { title: "Forgot your password — Uncle Invoice" };

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  // The login form passes along whatever was already typed, so nobody has to
  // type their address a second time to ask for a link.
  const { email } = await searchParams;
  return <ForgotPasswordForm email={email ?? ""} />;
}
