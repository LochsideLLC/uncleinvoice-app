import { NextResponse } from "next/server";
import {
  GOOGLE_OAUTH_COOKIE,
  buildGoogleAuthUrl,
  createGoogleOAuthChallenge,
  encodeGoogleOAuthState,
  googleCallbackUri,
  googleConfigured,
  safeAuthReturnPath,
} from "@/lib/google-oauth";
import { isClaimTokenShape } from "@/lib/invoice-claim";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const from = safeAuthReturnPath(url.searchParams.get("from"));
  if (!googleConfigured()) {
    return NextResponse.redirect(new URL(`${from}?error=missing_config`, url.origin));
  }

  const { verifier, challenge, state } = createGoogleOAuthChallenge();
  const redirectUri = googleCallbackUri();
  const rawClaim = url.searchParams.get("claim");
  const payload = encodeGoogleOAuthState({
    state,
    verifier,
    next: url.searchParams.get("next") ?? "",
    from,
    // Signup no longer asks who you are: every new Google account starts as
    // "other". The role question moved to post-signup onboarding, and
    // bookkeeper is a free workspace under /app/plans.
    accountType: "other",
    claim: isClaimTokenShape(rawClaim) ? rawClaim : "",
    workspace: url.searchParams.get("workspace") === "bookkeeper" ? "bookkeeper" : "",
    redirectUri,
  });

  const response = NextResponse.redirect(
    buildGoogleAuthUrl({ state, challenge, redirectUri }),
  );
  response.cookies.set(GOOGLE_OAUTH_COOKIE, payload, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  });
  return response;
}
