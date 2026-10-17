-- Archive an account instead of deleting it.
--
-- Additive and nullable on purpose: every existing row stays as it is, and a
-- deployment still running the old code is unaffected by the new column.
ALTER TABLE "uncleinvoice"."User" ADD COLUMN "archivedAt" TIMESTAMP(3);
