-- Saved services per client business, reusable on new invoices.
CREATE TABLE "uncleinvoice"."ServiceItem" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "unitPrice" INTEGER NOT NULL,
  "taxable" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ServiceItem_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "uncleinvoice"."ServiceItem" ADD CONSTRAINT "ServiceItem_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "uncleinvoice"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Same default-deny posture as every other app table: no policies, app connects with full rights.
ALTER TABLE "uncleinvoice"."ServiceItem" ENABLE ROW LEVEL SECURITY;
