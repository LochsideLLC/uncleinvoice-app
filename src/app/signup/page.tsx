import { SignupForm } from "@/components/signup-form";
import { googleAuthErrorMessage, googleConfigured } from "@/lib/google-oauth";
import { isClaimTokenShape } from "@/lib/invoice-claim";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; claim?: string }>;
}) {
  const { error, claim } = await searchParams;
  return (
    <SignupForm
      error={googleAuthErrorMessage(error) ?? undefined}
      googleEnabled={googleConfigured()}
      claim={isClaimTokenShape(claim) ? claim : undefined}
    />
  );
}
