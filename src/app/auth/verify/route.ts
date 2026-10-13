import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { consumeLoginToken } from "@/actions/auth";

/**
 * Magic sign-in links land here.
 *
 * This has to be a route handler, not a page. Signing the visitor in sets a
 * session cookie, and Next.js only allows that from a Server Action or a
 * Route Handler — a page that tries it throws, which is what used to make
 * every valid sign-in link return 500.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) redirect("/login?error=link_missing");

  // Signs the visitor in and redirects on success; returns an error otherwise.
  await consumeLoginToken(token);
  redirect("/login?error=link_invalid");
}
