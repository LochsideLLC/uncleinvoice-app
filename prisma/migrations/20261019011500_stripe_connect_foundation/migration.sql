-- Safe defaults keep all existing invoices out of online collection until an
-- authenticated owner opts in. This migration does not enable live payments.
ALTER TABLE "uncleinvoice"."User"
  ADD COLUMN "timeZone" TEXT NOT NULL DEFAULT 'America/Chicago';

ALTER TABLE "uncleinvoice"."Invoice"
  ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'usd',
  ADD COLUMN "collectionMode" TEXT NOT NULL DEFAULT 'documentation',
  ADD COLUMN "onlinePaymentEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "firstViewedAt" TIMESTAMP(3),
  ADD COLUMN "lastViewedAt" TIMESTAMP(3),
  ADD COLUMN "approximateViewCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "uncleinvoice"."InvoiceEvent"
  ADD COLUMN "source" TEXT NOT NULL DEFAULT 'app',
  ADD COLUMN "dedupeKey" TEXT,
  ADD COLUMN "metadata" JSONB;

CREATE UNIQUE INDEX "InvoiceEvent_dedupeKey_key"
  ON "uncleinvoice"."InvoiceEvent"("dedupeKey");
CREATE INDEX "InvoiceEvent_invoiceId_createdAt_idx"
  ON "uncleinvoice"."InvoiceEvent"("invoiceId", "createdAt");

CREATE TABLE "uncleinvoice"."StripeConnectedAccount" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "stripeAccountId" TEXT NOT NULL,
  "apiVersion" TEXT NOT NULL DEFAULT 'v2',
  "dashboardType" TEXT NOT NULL,
  "feesCollector" TEXT NOT NULL,
  "lossesCollector" TEXT NOT NULL,
  "requirementsCollector" TEXT NOT NULL,
  "cardPaymentsStatus" TEXT,
  "chargesEnabled" BOOLEAN NOT NULL DEFAULT false,
  "payoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
  "detailsSubmitted" BOOLEAN NOT NULL DEFAULT false,
  "requirements" JSONB,
  "disabledReason" TEXT,
  "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "disconnectedAt" TIMESTAMP(3),
  "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StripeConnectedAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StripeConnectedAccount_userId_key"
  ON "uncleinvoice"."StripeConnectedAccount"("userId");
CREATE UNIQUE INDEX "StripeConnectedAccount_stripeAccountId_key"
  ON "uncleinvoice"."StripeConnectedAccount"("stripeAccountId");

CREATE TABLE "uncleinvoice"."HostedInvoiceAccess" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "lastAccessAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HostedInvoiceAccess_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HostedInvoiceAccess_tokenHash_key"
  ON "uncleinvoice"."HostedInvoiceAccess"("tokenHash");
CREATE INDEX "HostedInvoiceAccess_invoiceId_idx"
  ON "uncleinvoice"."HostedInvoiceAccess"("invoiceId");

CREATE TABLE "uncleinvoice"."InvoicePayment" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "refundedAmount" INTEGER NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL,
  "paymentMethodCategory" TEXT,
  "externalReference" TEXT,
  "stripeAccountId" TEXT,
  "stripePaymentIntentId" TEXT,
  "stripeChargeId" TEXT,
  "failureCode" TEXT,
  "failureMessage" TEXT,
  "initiatedAt" TIMESTAMP(3),
  "succeededAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "disputedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InvoicePayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InvoicePayment_stripePaymentIntentId_key"
  ON "uncleinvoice"."InvoicePayment"("stripePaymentIntentId");
CREATE UNIQUE INDEX "InvoicePayment_externalReference_key"
  ON "uncleinvoice"."InvoicePayment"("externalReference");
CREATE UNIQUE INDEX "InvoicePayment_stripeChargeId_key"
  ON "uncleinvoice"."InvoicePayment"("stripeChargeId");
CREATE INDEX "InvoicePayment_invoiceId_createdAt_idx"
  ON "uncleinvoice"."InvoicePayment"("invoiceId", "createdAt");
CREATE INDEX "InvoicePayment_stripeAccountId_idx"
  ON "uncleinvoice"."InvoicePayment"("stripeAccountId");

CREATE TABLE "uncleinvoice"."CheckoutAttempt" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "connectedAccountId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "activeKey" TEXT,
  "stripeCheckoutSessionId" TEXT,
  "stripePaymentIntentId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'creating',
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CheckoutAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CheckoutAttempt_idempotencyKey_key"
  ON "uncleinvoice"."CheckoutAttempt"("idempotencyKey");
CREATE UNIQUE INDEX "CheckoutAttempt_activeKey_key"
  ON "uncleinvoice"."CheckoutAttempt"("activeKey");
CREATE UNIQUE INDEX "CheckoutAttempt_stripeCheckoutSessionId_key"
  ON "uncleinvoice"."CheckoutAttempt"("stripeCheckoutSessionId");
CREATE UNIQUE INDEX "CheckoutAttempt_stripePaymentIntentId_key"
  ON "uncleinvoice"."CheckoutAttempt"("stripePaymentIntentId");
CREATE INDEX "CheckoutAttempt_invoiceId_status_idx"
  ON "uncleinvoice"."CheckoutAttempt"("invoiceId", "status");
CREATE INDEX "CheckoutAttempt_connectedAccountId_idx"
  ON "uncleinvoice"."CheckoutAttempt"("connectedAccountId");

CREATE TABLE "uncleinvoice"."StripeConnectEvent" (
  "id" TEXT NOT NULL,
  "stripeEventId" TEXT NOT NULL,
  "connectedAccountId" TEXT,
  "stripeAccountId" TEXT,
  "eventType" TEXT NOT NULL,
  "objectId" TEXT,
  "livemode" BOOLEAN NOT NULL,
  "eventCreatedAt" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'received',
  "attemptCount" INTEGER NOT NULL DEFAULT 1,
  "processingStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processingError" TEXT,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StripeConnectEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StripeConnectEvent_stripeEventId_key"
  ON "uncleinvoice"."StripeConnectEvent"("stripeEventId");
CREATE INDEX "StripeConnectEvent_stripeAccountId_eventCreatedAt_idx"
  ON "uncleinvoice"."StripeConnectEvent"("stripeAccountId", "eventCreatedAt");

CREATE TABLE "uncleinvoice"."Notification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "invoiceId" TEXT,
  "eventType" TEXT NOT NULL,
  "dedupeKey" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "inAppVisible" BOOLEAN NOT NULL DEFAULT true,
  "readAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Notification_dedupeKey_key"
  ON "uncleinvoice"."Notification"("dedupeKey");
CREATE INDEX "Notification_userId_readAt_createdAt_idx"
  ON "uncleinvoice"."Notification"("userId", "readAt", "createdAt");

CREATE TABLE "uncleinvoice"."NotificationPreference" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "inApp" BOOLEAN NOT NULL DEFAULT true,
  "push" BOOLEAN NOT NULL DEFAULT false,
  "email" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificationPreference_userId_eventType_key"
  ON "uncleinvoice"."NotificationPreference"("userId", "eventType");

CREATE TABLE "uncleinvoice"."NotificationDelivery" (
  "id" TEXT NOT NULL,
  "notificationId" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "destinationHash" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "attemptedAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "errorCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificationDelivery_notificationId_channel_destinationHash_key"
  ON "uncleinvoice"."NotificationDelivery"("notificationId", "channel", "destinationHash");
CREATE INDEX "NotificationDelivery_status_createdAt_idx"
  ON "uncleinvoice"."NotificationDelivery"("status", "createdAt");

CREATE TABLE "uncleinvoice"."PushSubscription" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "endpointHash" TEXT NOT NULL,
  "subscriptionCiphertext" BYTEA NOT NULL,
  "encryptionIv" BYTEA NOT NULL,
  "encryptionTag" BYTEA NOT NULL,
  "invalidAt" TIMESTAMP(3),
  "lastUsedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PushSubscription_endpointHash_key"
  ON "uncleinvoice"."PushSubscription"("endpointHash");
CREATE INDEX "PushSubscription_userId_invalidAt_idx"
  ON "uncleinvoice"."PushSubscription"("userId", "invalidAt");

CREATE TABLE "uncleinvoice"."UsageCounter" (
  "id" TEXT NOT NULL,
  "operation" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "scopeKey" TEXT NOT NULL,
  "windowStart" TIMESTAMP(3) NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UsageCounter_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UsageCounter_operation_scope_scopeKey_windowStart_key"
  ON "uncleinvoice"."UsageCounter"("operation", "scope", "scopeKey", "windowStart");

ALTER TABLE "uncleinvoice"."StripeConnectedAccount"
  ADD CONSTRAINT "StripeConnectedAccount_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "uncleinvoice"."User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "uncleinvoice"."HostedInvoiceAccess"
  ADD CONSTRAINT "HostedInvoiceAccess_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "uncleinvoice"."Invoice"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "uncleinvoice"."InvoicePayment"
  ADD CONSTRAINT "InvoicePayment_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "uncleinvoice"."Invoice"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "uncleinvoice"."CheckoutAttempt"
  ADD CONSTRAINT "CheckoutAttempt_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "uncleinvoice"."Invoice"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "uncleinvoice"."CheckoutAttempt"
  ADD CONSTRAINT "CheckoutAttempt_connectedAccountId_fkey"
  FOREIGN KEY ("connectedAccountId") REFERENCES "uncleinvoice"."StripeConnectedAccount"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "uncleinvoice"."StripeConnectEvent"
  ADD CONSTRAINT "StripeConnectEvent_connectedAccountId_fkey"
  FOREIGN KEY ("connectedAccountId") REFERENCES "uncleinvoice"."StripeConnectedAccount"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "uncleinvoice"."Notification"
  ADD CONSTRAINT "Notification_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "uncleinvoice"."User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "uncleinvoice"."Notification"
  ADD CONSTRAINT "Notification_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "uncleinvoice"."Invoice"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "uncleinvoice"."NotificationPreference"
  ADD CONSTRAINT "NotificationPreference_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "uncleinvoice"."User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "uncleinvoice"."NotificationDelivery"
  ADD CONSTRAINT "NotificationDelivery_notificationId_fkey"
  FOREIGN KEY ("notificationId") REFERENCES "uncleinvoice"."Notification"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "uncleinvoice"."PushSubscription"
  ADD CONSTRAINT "PushSubscription_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "uncleinvoice"."User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Supabase's anon/authenticated roles have no policy path into this custom-auth
-- schema. Prisma uses the server-side postgres role, which bypasses RLS. Every
-- browser-facing read and write must still check the application session.
DO $$
DECLARE item RECORD;
BEGIN
  FOR item IN SELECT tablename FROM pg_tables WHERE schemaname = 'uncleinvoice' LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'uncleinvoice', item.tablename);
  END LOOP;
END $$;
