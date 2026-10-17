-- Two paid tiers, held on the person rather than on the client workspace.
--
-- Additive with a default, so every existing account lands on "free" and a
-- deployment still running the old code is unaffected.
ALTER TABLE "uncleinvoice"."User" ADD COLUMN "plan" TEXT NOT NULL DEFAULT 'free';
ALTER TABLE "uncleinvoice"."User" ADD COLUMN "planSetAt" TIMESTAMP(3);
