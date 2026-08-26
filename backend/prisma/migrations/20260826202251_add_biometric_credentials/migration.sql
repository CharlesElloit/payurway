-- CreateTable
CREATE TABLE "biometric_credentials" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "credential_id" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "device_name" TEXT,
    "device_type" TEXT NOT NULL,
    "counter" BIGINT NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "biometric_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "biometric_credentials_credential_id_key" ON "biometric_credentials"("credential_id");

-- CreateIndex
CREATE INDEX "biometric_credentials_user_id_idx" ON "biometric_credentials"("user_id");

-- CreateIndex
CREATE INDEX "biometric_credentials_credential_id_idx" ON "biometric_credentials"("credential_id");

-- AddForeignKey
ALTER TABLE "biometric_credentials" ADD CONSTRAINT "biometric_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
