-- AlterTable
ALTER TABLE "ClassSession" ADD COLUMN "groupId" TEXT;

-- CreateIndex
CREATE INDEX "ClassSession_groupId_idx" ON "ClassSession"("groupId");
