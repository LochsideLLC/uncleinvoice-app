-- AlterTable
ALTER TABLE "uncleinvoice"."OutboxEmail" ADD COLUMN     "bcc" TEXT,
ADD COLUMN     "cc" TEXT;

-- AlterTable
ALTER TABLE "uncleinvoice"."User" ADD COLUMN     "emailSignature" TEXT;
