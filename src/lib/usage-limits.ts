import "server-only";

import { db } from "@/lib/db";
import { createToken } from "@/lib/crypto";
export { cappedInteger } from "@/lib/quota-policy";

function utcDayStart(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

async function consumeLimit(args: {
  operation: string;
  scope: "global" | "user" | "invoice";
  scopeKey: string;
  limit: number;
  increment?: number;
  windowStart: Date;
}) {
  const increment = args.increment ?? 1;
  if (!Number.isInteger(increment) || increment < 1 || increment > args.limit) return false;
  const rows = await db.$queryRaw<Array<{ count: number }>>`
    INSERT INTO "uncleinvoice"."UsageCounter"
      ("id", "operation", "scope", "scopeKey", "windowStart", "count", "createdAt", "updatedAt")
    VALUES
      (${createToken()}, ${args.operation}, ${args.scope}, ${args.scopeKey}, ${args.windowStart}, ${increment}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("operation", "scope", "scopeKey", "windowStart")
    DO UPDATE SET
      "count" = "UsageCounter"."count" + ${increment},
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE "UsageCounter"."count" <= ${args.limit - increment}
    RETURNING "count"
  `;
  return rows.length === 1;
}

type LimitArgs = Omit<Parameters<typeof consumeLimit>[0], "windowStart">;

export function consumeDailyLimit(args: LimitArgs) {
  return consumeLimit({ ...args, windowStart: utcDayStart() });
}

export function consumeMonthlyLimit(args: LimitArgs) {
  const now = new Date();
  return consumeLimit({ ...args, windowStart: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)) });
}
