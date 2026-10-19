import { NextResponse } from "next/server";
import { getRealSessionUser } from "@/lib/auth";
import { removePushSubscription, savePushSubscription } from "@/lib/push";

function sameOrigin(request: Request) {
  return request.headers.get("origin") === new URL(request.url).origin;
}

async function body(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > 4096) throw new Error("Subscription is too large");
  const raw = await request.text();
  if (raw.length > 4096) throw new Error("Subscription is too large");
  return JSON.parse(raw);
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const user = await getRealSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  try {
    await savePushSubscription(user.id, await body(request));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Push setup failed" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const user = await getRealSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  try {
    await removePushSubscription(user.id, await body(request));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Push removal failed" }, { status: 400 });
  }
}
