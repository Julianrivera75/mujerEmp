-- Corrige mayúsculas y espacios antes de descartar valores que no pertenecen al dominio
UPDATE "User" SET "role" = upper(trim("role")) WHERE upper(trim("role")) IN ('ADMIN', 'MENTOR', 'STUDENT');
UPDATE "User" SET "status" = upper(trim("status")) WHERE upper(trim("status")) IN ('ACTIVO', 'INACTIVO');
UPDATE "ClassSession" SET "status" = upper(trim("status")) WHERE upper(trim("status")) IN ('PROGRAMADA', 'FINALIZADA', 'CANCELADA');
UPDATE "ClassResource" SET "type" = upper(trim("type")) WHERE upper(trim("type")) IN ('YOUTUBE', 'DOCUMENT', 'LINK');
UPDATE "Submission" SET "fileType" = upper(trim("fileType")) WHERE upper(trim("fileType")) IN ('PDF', 'DOC', 'IMAGE', 'LINK');

-- Los valores que aún no pertenecen al dominio se normalizan antes de convertir las columnas a enum
UPDATE "User" SET "role" = 'STUDENT' WHERE "role" NOT IN ('ADMIN', 'MENTOR', 'STUDENT');
UPDATE "User" SET "status" = 'ACTIVO' WHERE "status" NOT IN ('ACTIVO', 'INACTIVO');
UPDATE "ClassSession" SET "status" = 'PROGRAMADA' WHERE "status" NOT IN ('PROGRAMADA', 'FINALIZADA', 'CANCELADA');
UPDATE "ClassResource" SET "type" = 'LINK' WHERE "type" NOT IN ('YOUTUBE', 'DOCUMENT', 'LINK');
UPDATE "Submission" SET "fileType" = NULL WHERE "fileType" IS NOT NULL AND "fileType" NOT IN ('PDF', 'DOC', 'IMAGE', 'LINK');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MENTOR', 'STUDENT');
CREATE TYPE "UserStatus" AS ENUM ('ACTIVO', 'INACTIVO');
CREATE TYPE "ClassStatus" AS ENUM ('PROGRAMADA', 'FINALIZADA', 'CANCELADA');
CREATE TYPE "ResourceType" AS ENUM ('YOUTUBE', 'DOCUMENT', 'LINK');
CREATE TYPE "FileType" AS ENUM ('PDF', 'DOC', 'IMAGE', 'LINK');

-- Conversión de columnas de texto a enum
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role" USING ("role"::"Role");
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'STUDENT';

ALTER TABLE "User" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "status" TYPE "UserStatus" USING ("status"::"UserStatus");
ALTER TABLE "User" ALTER COLUMN "status" SET DEFAULT 'ACTIVO';

ALTER TABLE "ClassSession" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "ClassSession" ALTER COLUMN "status" TYPE "ClassStatus" USING ("status"::"ClassStatus");
ALTER TABLE "ClassSession" ALTER COLUMN "status" SET DEFAULT 'PROGRAMADA';

ALTER TABLE "ClassResource" ALTER COLUMN "type" TYPE "ResourceType" USING ("type"::"ResourceType");
ALTER TABLE "Submission" ALTER COLUMN "fileType" TYPE "FileType" USING ("fileType"::"FileType");

-- Revocación de sesiones
ALTER TABLE "User" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- Fecha de inscripción
ALTER TABLE "ClassEnrollment" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- La nota siempre está entre 1.0 y 5.0
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_grade_range" CHECK ("grade" IS NULL OR ("grade" >= 1 AND "grade" <= 5));

-- Intentos de inicio de sesión
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoginAttempt_key_createdAt_idx" ON "LoginAttempt"("key", "createdAt");
CREATE INDEX "ClassSession_mentorId_idx" ON "ClassSession"("mentorId");
CREATE INDEX "ClassSession_monthKey_idx" ON "ClassSession"("monthKey");
CREATE INDEX "ClassSession_dateStart_idx" ON "ClassSession"("dateStart");
CREATE INDEX "ClassEnrollment_studentId_idx" ON "ClassEnrollment"("studentId");
CREATE INDEX "Attendance_studentId_idx" ON "Attendance"("studentId");
CREATE INDEX "Attendance_joinedAt_idx" ON "Attendance"("joinedAt");
CREATE INDEX "Assignment_classId_idx" ON "Assignment"("classId");
CREATE INDEX "Assignment_creatorId_idx" ON "Assignment"("creatorId");
CREATE INDEX "Submission_studentId_idx" ON "Submission"("studentId");
CREATE INDEX "ClassResource_classId_idx" ON "ClassResource"("classId");

-- Mentora y creadora ya no se eliminan en cascada
ALTER TABLE "ClassSession" DROP CONSTRAINT "ClassSession_mentorId_fkey";
ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Assignment" DROP CONSTRAINT "Assignment_creatorId_fkey";
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
