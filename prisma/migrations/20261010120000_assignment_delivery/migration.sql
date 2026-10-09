-- CreateEnum
CREATE TYPE "DeliveryType" AS ENUM ('FILE', 'LINK', 'TEXT', 'FILE_OR_LINK', 'ANY');

-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN     "allowLate" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "deliveryType" "DeliveryType" NOT NULL DEFAULT 'FILE_OR_LINK',
ADD COLUMN     "notesRequired" BOOLEAN NOT NULL DEFAULT true;

