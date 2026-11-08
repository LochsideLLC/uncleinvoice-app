-- Per-client default payment terms, preselected on new invoices.
ALTER TABLE "uncleinvoice"."Workspace" ADD COLUMN "defaultPaymentTerms" TEXT;
