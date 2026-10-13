-- A magic link can now point at a contractor instead of a single invoice,
-- so one link covers everything that contractor was paid.
ALTER TABLE "uncleinvoice"."MagicLink" ADD COLUMN "contractorId" TEXT;

ALTER TABLE "uncleinvoice"."MagicLink"
  ADD CONSTRAINT "MagicLink_contractorId_fkey"
  FOREIGN KEY ("contractorId") REFERENCES "uncleinvoice"."Contractor"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "MagicLink_contractorId_idx" ON "uncleinvoice"."MagicLink"("contractorId");
