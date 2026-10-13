import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSession, safeNext } from "@/lib/auth";
import {
  GOOGLE_OAUTH_COOKIE,
  decodeGoogleOAuthState,
  exchangeGoogleCode,
  fetchGoogleProfile,
  findOrCreateGoogleUser,
  sameOAuthValue,
} from "@/lib/google-oauth";

function fail(from: string, code: string): never {
  redirect(`${from}?error=${code}`);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const jar = await cookies();
  const stored = decodeGoogleOAuthState(jar.get(GOOGLE_OAUTH_COOKIE)?.value);
  const from = stored?.from ?? "/login";

  jar.delete(GOOGLE_OAUTH_COOKIE);

  if (url.searchParams.get("error") === "access_denied") {
    fail(from, "denied");
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state || !stored || !sameOAuthValue(state, stored.state)) {
    fail(from, "invalid");
  }

  let accessToken: string | null = null;
  try {
    accessToken = await exchangeGoogleCode(code, stored.verifier, stored.redirectUri);
  } catch {
    fail(from, "failed");
  }
  if (!accessToken) {
    fail(from, "failed");
  }

  let profile: { email: string; name: string } | null = null;
  try {
    profile = await fetchGoogleProfile(accessToken);
  } catch {
    fail(from, "failed");
  }
  if (!profile) {
    fail(from, "no_email");
  }

  const user = await findOrCreateGoogleUser(profile);
  await createSession(user.id);
  redirect(safeNext(stored.next));
}
