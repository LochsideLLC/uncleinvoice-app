import { AuthCard } from "@/components/auth-card";
import { googleAuthErrorMessage, googleConfigured } from "@/lib/google-oauth";
import { isClaimTokenShape } from "@/lib/invoice-claim";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; claim?: string; workspace?: string }>;
}) {
  const { next, error, claim, workspace } = await searchParams;
  return (
    <AuthCard
      initialMode="signin"
      next={next ?? ""}
      error={googleAuthErrorMessage(error) ?? undefined}
      googleEnabled={googleConfigured()}
      claim={isClaimTokenShape(claim) ? claim : undefined}
      workspace={workspace === "bookkeeper" ? "bookkeeper" : undefined}
    />
  );
}
