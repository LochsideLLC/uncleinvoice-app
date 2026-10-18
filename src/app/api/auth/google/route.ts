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
import { asAccountType } from "@/lib/account-type";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const from = safeAuthReturnPath(url.searchParams.get("from"));
  if (!googleConfigured()) {
    return NextResponse.redirect(new URL(`${from}?error=missing_config`, url.origin));
  }

  const { verifier, challenge, state } = createGoogleOAuthChallenge();
  const redirectUri = googleCallbackUri();
  const payload = encodeGoogleOAuthState({
    state,
    verifier,
    next: url.searchParams.get("next") ?? "",
    from,
    accountType: from === "/signup" ? asAccountType(url.searchParams.get("accountType")) : "other",
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
