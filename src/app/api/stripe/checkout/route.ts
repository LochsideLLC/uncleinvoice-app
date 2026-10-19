import { NextResponse } from "next/server";

/**
 * Subscription checkout is retired: both workspaces are free and no plan
 * requires payment. This route stays so old buttons and bookmarks get an
 * explanation instead of a 404. Stripe Connect (contractors receiving
 * customer payments) is a separate system and is untouched.
 */
export async function POST() {
  return NextResponse.json(
    { error: "Plans are free now — there is nothing to check out with." },
    { status: 410 },
  );
}
