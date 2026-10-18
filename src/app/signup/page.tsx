import { SignupForm } from "@/components/signup-form";
import { googleAuthErrorMessage, googleConfigured } from "@/lib/google-oauth";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; accountType?: string }>;
}) {
  const { error, accountType } = await searchParams;
  return (
    <SignupForm
      error={googleAuthErrorMessage(error) ?? undefined}
      googleEnabled={googleConfigured()}
      initialAccountType={accountType === "bookkeeper" || accountType === "contractor" ? accountType : undefined}
    />
  );
}
