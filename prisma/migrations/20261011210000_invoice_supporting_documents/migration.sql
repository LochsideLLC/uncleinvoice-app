-- Supporting documents attached to an invoice: the payer's own accounting record
-- for these payments, so the contractor can check the invoice against the books
-- it was seeded from before confirming it.
-- CreateTable
CREATE TABLE "uncleinvoice"."InvoiceAttachment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'source_record',
    "label" TEXT,
    "filename" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "uploadedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvoiceAttachment_invoiceId_idx" ON "uncleinvoice"."InvoiceAttachment"("invoiceId");

-- AddForeignKey
ALTER TABLE "uncleinvoice"."InvoiceAttachment"
    ADD CONSTRAINT "InvoiceAttachment_invoiceId_fkey"
    FOREIGN KEY ("invoiceId") REFERENCES "uncleinvoice"."Invoice"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
