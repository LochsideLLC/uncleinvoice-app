-- Marks a login created on someone's behalf with a temporary password, so the
-- app can force a replacement before showing anything else.
ALTER TABLE "uncleinvoice"."User"
  ADD COLUMN "mustSetPassword" BOOLEAN NOT NULL DEFAULT false;
