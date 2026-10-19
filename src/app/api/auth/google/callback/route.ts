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
import { consumeInvoiceClaim } from "@/lib/invoice-claim";

/**
 * Where to send the visitor, as an absolute URL.
 *
 * Every redirect out of this route has to be absolute. The host's Next.js
 * adapter copies the request's query string onto a relative redirect, and
 * this request's query string carries Google's authorization `code` — which
 * then sat in the address bar, in history, and in outgoing referrers. The
 * magic sign-in route hit the same thing; see
 * src/app/auth/verify/[token]/route.ts for the longer note.
 *
 * Built against APP_URL rather than the request's own origin, because behind
 * the host's proxy that origin is the per-deploy hostname, and the session
 * cookie is set for the real domain.
 */
function publicOrigin(request: Request) {
  const configured = process.env.APP_URL?.trim();
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      // fall through to the request's own origin
    }
  }
  return new URL(request.url).origin;
}

function absolute(origin: string, path: string) {
  return new URL(path, origin).toString();
}

function fail(origin: string, from: string, code: string): never {
  redirect(absolute(origin, `${from}?error=${code}`));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = publicOrigin(request);
  const jar = await cookies();
  const stored = decodeGoogleOAuthState(jar.get(GOOGLE_OAUTH_COOKIE)?.value);
  const from = stored?.from ?? "/login";

  jar.delete(GOOGLE_OAUTH_COOKIE);

  if (url.searchParams.get("error") === "access_denied") {
    fail(origin, from, "denied");
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state || !stored || !sameOAuthValue(state, stored.state)) {
    fail(origin, from, "invalid");
  }

  let accessToken: string | null = null;
  try {
    accessToken = await exchangeGoogleCode(code, stored.verifier, stored.redirectUri);
  } catch {
    fail(origin, from, "failed");
  }
  if (!accessToken) {
    fail(origin, from, "failed");
  }

  let profile: { email: string; name: string } | null = null;
  try {
    profile = await fetchGoogleProfile(accessToken);
  } catch {
    fail(origin, from, "failed");
  }
  if (!profile) {
    fail(origin, from, "no_email");
  }

  const { user, created } = await findOrCreateGoogleUser(profile, stored.accountType);
  // Google is a separate door into the same account, so archiving has to be
  // checked here too, not only on the password and link routes.
  if (user.archivedAt) {
    fail(origin, from, "archived");
  }
  await createSession(user.id);
  // A guest-claim signup lands on its invoice, never on /app. An invalid,
  // spent, or foreign claim is ignored and the visitor gets the normal
  // destination below.
  if (stored.claim) {
    const claimed = await consumeInvoiceClaim(stored.claim, user.id);
    if (claimed) {
      redirect(absolute(origin, claimed.to));
    }
  }
  if (created && stored.from === "/login") {
    redirect(absolute(origin, "/app/onboarding"));
  }
  if (created && user.accountType === "bookkeeper") {
    redirect(absolute(origin, "/app/plans?welcome=bookkeeper"));
  }
  redirect(absolute(origin, safeNext(stored.next)));
}
