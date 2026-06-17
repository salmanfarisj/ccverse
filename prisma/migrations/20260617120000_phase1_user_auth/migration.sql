-- Migration: phase1_user_auth
-- Phase 1 T1-1: User columns, all auth tables

-- CreateEnums
CREATE TYPE "KycStatus" AS ENUM ('NOT_STARTED', 'PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');
CREATE TYPE "KycDocumentType" AS ENUM ('PAN', 'GSTIN', 'PASSPORT', 'UTILITY_BILL', 'BANK_STATEMENT', 'INCORPORATION_CERT', 'OTHER');
CREATE TYPE "KycDocumentReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "BuyerKycStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');
CREATE TYPE "BuyerKycMethod" AS ENUM ('NONE', 'MANUAL');
CREATE TYPE "DefaultCurrency" AS ENUM ('INR', 'USD');

-- AlterEnum: replace PENDING_KYC/DELETED with SUSPENDED/BANNED/PENDING_VERIFICATION
BEGIN;
CREATE TYPE "UserStatus_new" AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED', 'PENDING_VERIFICATION');
ALTER TABLE "user" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "user" ALTER COLUMN "status" TYPE "UserStatus_new" USING ("status"::text::"UserStatus_new");
ALTER TYPE "UserStatus" RENAME TO "UserStatus_old";
ALTER TYPE "UserStatus_new" RENAME TO "UserStatus";
DROP TYPE "UserStatus_old";
ALTER TABLE "user" ALTER COLUMN "status" SET DEFAULT 'PENDING_VERIFICATION';
COMMIT;

-- AlterTable: User — add Phase 1 auth columns
ALTER TABLE "user" ADD COLUMN     "email_verified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "user" ADD COLUMN     "email_verified_at" TIMESTAMP(3);
ALTER TABLE "user" ADD COLUMN     "failed_login_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "user" ADD COLUMN     "last_login_ip" TEXT;
ALTER TABLE "user" ADD COLUMN     "locked_until" TIMESTAMP(3);
ALTER TABLE "user" ALTER COLUMN "password_hash" DROP NOT NULL;
ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'BUYER';
ALTER TABLE "user" ALTER COLUMN "status" SET DEFAULT 'PENDING_VERIFICATION';

-- AlterTable: BuyerProfile — add KYC and profile columns
ALTER TABLE "buyer_profile" ADD COLUMN "country" TEXT;
ALTER TABLE "buyer_profile" ADD COLUMN "default_currency" "DefaultCurrency" NOT NULL DEFAULT 'USD';
ALTER TABLE "buyer_profile" ADD COLUMN "kyc_method" "BuyerKycMethod" NOT NULL DEFAULT 'NONE';
ALTER TABLE "buyer_profile" ADD COLUMN "kyc_status" "BuyerKycStatus" NOT NULL DEFAULT 'NOT_REQUIRED';
ALTER TABLE "buyer_profile" ADD COLUMN "legal_name" TEXT;
ALTER TABLE "buyer_profile" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable: SellerProfile — add entity and KYC columns
ALTER TABLE "seller_profile" ADD COLUMN "authorized_signatory_email" TEXT;
ALTER TABLE "seller_profile" ADD COLUMN "authorized_signatory_name" TEXT;
ALTER TABLE "seller_profile" ADD COLUMN "bank_account_id" TEXT;
ALTER TABLE "seller_profile" ADD COLUMN "country" TEXT;
ALTER TABLE "seller_profile" ADD COLUMN "kyc_method" TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE "seller_profile" ADD COLUMN "kyc_review_notes" TEXT;
ALTER TABLE "seller_profile" ADD COLUMN "kyc_reviewed_at" TIMESTAMP(3);
ALTER TABLE "seller_profile" ADD COLUMN "kyc_reviewed_by" TEXT;
ALTER TABLE "seller_profile" ADD COLUMN "kyc_status" "KycStatus" NOT NULL DEFAULT 'NOT_STARTED';
ALTER TABLE "seller_profile" ADD COLUMN "legal_name" TEXT;
ALTER TABLE "seller_profile" ADD COLUMN "registration_no" TEXT;
ALTER TABLE "seller_profile" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL;

-- CreateTable: KycDocument
CREATE TABLE "kyc_document" (
    "id" TEXT NOT NULL,
    "subject_user_id" TEXT NOT NULL,
    "document_type" "KycDocumentType" NOT NULL,
    "s3_key" TEXT NOT NULL,
    "sha256" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploaded_by" TEXT NOT NULL,
    "review_status" "KycDocumentReviewStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "review_notes" TEXT,
    CONSTRAINT "kyc_document_pkey" PRIMARY KEY ("id")
);

-- CreateTable: BankAccount
CREATE TABLE "bank_account" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "account_holder" TEXT NOT NULL,
    "bank_name" TEXT NOT NULL,
    "account_no_last4" TEXT NOT NULL,
    "routing_or_ifsc" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bank_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable: EmailVerificationToken
CREATE TABLE "email_verification_token" (
    "token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    CONSTRAINT "email_verification_token_pkey" PRIMARY KEY ("token")
);

-- CreateTable: PasswordResetToken
CREATE TABLE "password_reset_token" (
    "token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "ip" TEXT,
    CONSTRAINT "password_reset_token_pkey" PRIMARY KEY ("token")
);

-- CreateIndex: unique bank_account_id on seller_profile (1:1 with BankAccount)
CREATE UNIQUE INDEX "seller_profile_bank_account_id_key" ON "seller_profile"("bank_account_id");

-- ForeignKeys
ALTER TABLE "seller_profile" ADD CONSTRAINT "seller_profile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "seller_profile" ADD CONSTRAINT "seller_profile_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "buyer_profile" ADD CONSTRAINT "buyer_profile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kyc_document" ADD CONSTRAINT "kyc_document_subject_user_id_fkey" FOREIGN KEY ("subject_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kyc_document" ADD CONSTRAINT "kyc_document_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bank_account" ADD CONSTRAINT "bank_account_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "email_verification_token" ADD CONSTRAINT "email_verification_token_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "password_reset_token" ADD CONSTRAINT "password_reset_token_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
