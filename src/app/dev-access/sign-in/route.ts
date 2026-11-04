import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { localDevAccessEnabled, DEV_ACCOUNT_EMAIL } from "@/lib/dev-access";

export async function POST(request: Request) {
  if (!localDevAccessEnabled()) return new Response("Not found", { status: 404 });
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host || new URL(origin).host !== host) {
    return new Response("Invalid origin", { status: 403 });
  }

  const user = await db.user.findUnique({ where: { email: DEV_ACCOUNT_EMAIL } });
  if (!user || user.archivedAt || user.admin) {
    return new Response("Local demo account is not ready", { status: 503 });
  }
  const membership = await db.workspaceMember.findFirst({
    where: { userId: user.id, workspaceId: "demo-sunrise" },
    select: { id: true },
  });
  if (!membership) return new Response("Local demo workspace is not ready", { status: 503 });

  await createSession(user.id);
  return NextResponse.redirect(new URL("/app?workspace=bookkeeper", origin), { status: 303 });
}
