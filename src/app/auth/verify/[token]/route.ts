import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { consumeLoginToken } from "@/actions/auth";

/**
 * Magic sign-in links land here: /auth/verify/<token>.
 *
 * Three things about this route are deliberate.
 *
 * It is a route handler, not a page. Signing the visitor in sets a session
 * cookie, and Next.js only allows that from a Server Action or a Route
 * Handler — a page that tries it throws, which is what used to make every
 * valid sign-in link return 500.
 *
 * The token travels in the path rather than in a query string, because the
 * host's Next.js adapter copies the request's query string onto whatever the
 * route redirects to. With ?token=… the spent token followed the visitor to
 * /app and sat in the address bar, in history, and in outgoing referrers.
 *
 * The redirect is built against APP_URL, not the request origin. Behind the
 * host's proxy the request origin is the per-deploy hostname, so redirecting
 * there would bounce the visitor onto a *.netlify.app URL where the session
 * cookie, set for the real domain, does not apply.
 */
function publicOrigin(request: NextRequest) {
  const configured = process.env.APP_URL?.trim();
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      // fall through to the request's own origin
    }
  }
  return request.nextUrl.origin;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const origin = publicOrigin(request);
  const fail = (code: string) =>
    NextResponse.redirect(new URL(`/login?error=${code}`, origin));

  if (!token) return fail("link_missing");

  const result = await consumeLoginToken(token);
  if (result?.to) {
    return NextResponse.redirect(new URL(result.to, origin));
  }
  return fail("link_invalid");
}
