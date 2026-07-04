-- CreateTable
CREATE TABLE "Investigation" (
    "id" TEXT NOT NULL,
    "userLogin" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "repoPath" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Investigation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Investigation_userLogin_createdAt_idx" ON "Investigation"("userLogin", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Investigation_userLogin_caseId_key" ON "Investigation"("userLogin", "caseId");
