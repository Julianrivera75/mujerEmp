-- CreateEnum
CREATE TYPE "CertificateRuleType" AS ENUM ('MIN_ATTENDANCE_PERCENT', 'MIN_ATTENDED_DAYS');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'CERTIFICATE_AVAILABLE';

-- CreateTable
CREATE TABLE "CertificateModuleRule" (
    "id" TEXT NOT NULL,
    "moduleNumber" INTEGER NOT NULL,
    "ruleType" "CertificateRuleType" NOT NULL DEFAULT 'MIN_ATTENDANCE_PERCENT',
    "threshold" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CertificateModuleRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CertificateIssuance" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "moduleNumber" INTEGER NOT NULL,
    "verificationCode" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "studentNumber" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "downloadCount" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "CertificateIssuance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CertificateModuleRule_moduleNumber_key" ON "CertificateModuleRule"("moduleNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CertificateIssuance_verificationCode_key" ON "CertificateIssuance"("verificationCode");

-- CreateIndex
CREATE INDEX "CertificateIssuance_studentId_idx" ON "CertificateIssuance"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "CertificateIssuance_studentId_moduleNumber_key" ON "CertificateIssuance"("studentId", "moduleNumber");

-- AddForeignKey
ALTER TABLE "CertificateIssuance" ADD CONSTRAINT "CertificateIssuance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Reglas iniciales por módulo: el Módulo 1 es la excepción (basta una asistencia); los demás
-- heredan el 80% que ya exigía la constante global CERTIFICATE_MIN_ATTENDANCE_PERCENT.
INSERT INTO "CertificateModuleRule" (id, "moduleNumber", "ruleType", threshold, "updatedAt") VALUES
  (gen_random_uuid()::text, 1, 'MIN_ATTENDED_DAYS', 1, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 2, 'MIN_ATTENDANCE_PERCENT', 80, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 3, 'MIN_ATTENDANCE_PERCENT', 80, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 4, 'MIN_ATTENDANCE_PERCENT', 80, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 5, 'MIN_ATTENDANCE_PERCENT', 80, CURRENT_TIMESTAMP);
