-- CreateEnum
CREATE TYPE "DeliveryRequirement" AS ENUM ('NONE', 'OPTIONAL', 'REQUIRED');

-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN     "fileRequirement" "DeliveryRequirement" NOT NULL DEFAULT 'OPTIONAL',
ADD COLUMN     "linkRequirement" "DeliveryRequirement" NOT NULL DEFAULT 'OPTIONAL',
ADD COLUMN     "maxFiles" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "textRequirement" "DeliveryRequirement" NOT NULL DEFAULT 'REQUIRED';

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "fileKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "fileNames" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "linkUrl" TEXT;


-- Relleno: lo que ya pedían las tareas existentes (deliveryType + notesRequired) pasa a los requisitos nuevos.
UPDATE "Assignment" SET
  "fileRequirement" = (CASE "deliveryType"
    WHEN 'FILE' THEN 'REQUIRED' WHEN 'LINK' THEN 'NONE' WHEN 'TEXT' THEN 'NONE' ELSE 'OPTIONAL' END)::"DeliveryRequirement",
  "linkRequirement" = (CASE "deliveryType"
    WHEN 'LINK' THEN 'REQUIRED' WHEN 'FILE' THEN 'NONE' WHEN 'TEXT' THEN 'NONE' ELSE 'OPTIONAL' END)::"DeliveryRequirement",
  "textRequirement" = (CASE
    WHEN "deliveryType" = 'TEXT' THEN 'REQUIRED'
    WHEN "notesRequired" THEN 'REQUIRED'
    ELSE 'OPTIONAL' END)::"DeliveryRequirement";
