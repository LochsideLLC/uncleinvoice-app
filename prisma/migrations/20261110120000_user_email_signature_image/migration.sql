ALTER TABLE "uncleinvoice"."User"
  ADD COLUMN "emailSignatureType" TEXT NOT NULL DEFAULT 'text',
  ADD COLUMN "emailSignatureImage" TEXT;
