/*
  Warnings:

  - You are about to drop the column `verification_token` on the `mobile_money_accounts` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'requested';

-- AlterTable
ALTER TABLE "mobile_money_accounts" DROP COLUMN "verification_token",
ADD COLUMN     "balance" DECIMAL(12,2),
ADD COLUMN     "balance_updated_at" TIMESTAMP(3),
ADD COLUMN     "encrypted_pin" TEXT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "first_name" DROP NOT NULL,
ALTER COLUMN "last_name" DROP NOT NULL;
