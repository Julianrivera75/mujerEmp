-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'CHAT_REPORT';

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "attachmentKey" TEXT,
ADD COLUMN     "attachmentName" TEXT,
ADD COLUMN     "attachmentSize" INTEGER,
ADD COLUMN     "attachmentType" TEXT;

-- CreateTable
CREATE TABLE "ChatBlock" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageReport" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reportedId" TEXT NOT NULL,
    "messageBody" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "MessageReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatBlock_blockedId_idx" ON "ChatBlock"("blockedId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatBlock_blockerId_blockedId_key" ON "ChatBlock"("blockerId", "blockedId");

-- CreateIndex
CREATE INDEX "MessageReport_reviewedAt_createdAt_idx" ON "MessageReport"("reviewedAt", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MessageReport_messageId_reporterId_key" ON "MessageReport"("messageId", "reporterId");

-- AddForeignKey
ALTER TABLE "ChatBlock" ADD CONSTRAINT "ChatBlock_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatBlock" ADD CONSTRAINT "ChatBlock_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageReport" ADD CONSTRAINT "MessageReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageReport" ADD CONSTRAINT "MessageReport_reportedId_fkey" FOREIGN KEY ("reportedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

