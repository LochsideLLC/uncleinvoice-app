import { AuthCard } from "@/components/auth-card";
import { googleAuthErrorMessage, googleConfigured } from "@/lib/google-oauth";
import { isClaimTokenShape } from "@/lib/invoice-claim";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; claim?: string; workspace?: string }>;
}) {
  const { error, claim, workspace } = await searchParams;
  return (
    <AuthCard
      initialMode="signup"
      error={googleAuthErrorMessage(error) ?? undefined}
      googleEnabled={googleConfigured()}
      claim={isClaimTokenShape(claim) ? claim : undefined}
      workspace={workspace === "bookkeeper" ? "bookkeeper" : undefined}
    />
  );
}
