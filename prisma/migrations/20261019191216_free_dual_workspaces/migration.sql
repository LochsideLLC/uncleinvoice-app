-- DropIndex
DROP INDEX "uncleinvoice"."MagicLink_contractorId_idx";

-- AlterTable
ALTER TABLE "uncleinvoice"."User" ADD COLUMN     "bookkeeperOnboardedAt" TIMESTAMP(3),
ADD COLUMN     "contractorOnboardedAt" TIMESTAMP(3),
ADD COLUMN     "workspaceKind" TEXT NOT NULL DEFAULT 'contractor';
