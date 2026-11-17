-- CreateEnum
CREATE TYPE "CertificateOverrideAction" AS ENUM ('AUTHORIZED', 'BLOCKED');

-- CreateTable
CREATE TABLE "CertificateOverride" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "moduleNumber" INTEGER NOT NULL,
    "action" "CertificateOverrideAction" NOT NULL,
    "reason" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revokedById" TEXT,
    "revokedReason" TEXT,

    CONSTRAINT "CertificateOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CertificateOverride_studentId_moduleNumber_revokedAt_idx" ON "CertificateOverride"("studentId", "moduleNumber", "revokedAt");

-- AddForeignKey
ALTER TABLE "CertificateOverride" ADD CONSTRAINT "CertificateOverride_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificateOverride" ADD CONSTRAINT "CertificateOverride_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificateOverride" ADD CONSTRAINT "CertificateOverride_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
