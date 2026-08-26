-- AlterTable
ALTER TABLE "mobile_money_accounts" ADD COLUMN     "is_preapproved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "preapproved_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "status_code" INTEGER,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "request_body" JSONB,
    "duration" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_transactions" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "transaction_token" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'UGX',
    "sender_phone" TEXT NOT NULL,
    "receiver_phone" TEXT NOT NULL,
    "sender_id" TEXT,
    "receiver_id" TEXT,
    "carrier" "Carrier" NOT NULL,
    "carrier_transaction_id" TEXT,
    "status" "PaymentStatus" NOT NULL,
    "preapproved" BOOLEAN NOT NULL DEFAULT false,
    "failure_reason" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activity_logs_user_id_idx" ON "activity_logs"("user_id");

-- CreateIndex
CREATE INDEX "activity_logs_action_idx" ON "activity_logs"("action");

-- CreateIndex
CREATE INDEX "activity_logs_created_at_idx" ON "activity_logs"("created_at");

-- CreateIndex
CREATE INDEX "daily_transactions_payment_id_idx" ON "daily_transactions"("payment_id");

-- CreateIndex
CREATE INDEX "daily_transactions_reference_idx" ON "daily_transactions"("reference");

-- CreateIndex
CREATE INDEX "daily_transactions_transaction_token_idx" ON "daily_transactions"("transaction_token");

-- CreateIndex
CREATE INDEX "daily_transactions_created_at_idx" ON "daily_transactions"("created_at");

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
