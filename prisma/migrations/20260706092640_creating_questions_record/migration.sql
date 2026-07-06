-- CreateTable
CREATE TABLE "QuestionLog" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "repoPath" TEXT NOT NULL,
    "location" TEXT,
    "anchorKind" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuestionLog_createdAt_idx" ON "QuestionLog"("createdAt");
