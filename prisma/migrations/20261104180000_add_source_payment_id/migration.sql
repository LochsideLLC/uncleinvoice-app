ALTER TABLE "uncleinvoice"."Invoice"
ADD COLUMN "sourcePaymentId" TEXT;

CREATE UNIQUE INDEX "Invoice_workspaceId_sourcePaymentId_key"
ON "uncleinvoice"."Invoice"("workspaceId", "sourcePaymentId");
