-- AlterTable
ALTER TABLE "User" ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "termsVersion" TEXT,
ADD COLUMN     "isMinor" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "guardianName" TEXT,
ADD COLUMN     "guardianContact" TEXT,
ADD COLUMN     "guardianConsentAt" TIMESTAMP(3),
ADD COLUMN     "anonymizedAt" TIMESTAMP(3);
