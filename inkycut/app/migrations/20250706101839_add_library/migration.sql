-- CreateTable
CREATE TABLE "Library" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "llmNotes" TEXT,
    "type" TEXT NOT NULL DEFAULT 'cutscene',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "manifestFileId" TEXT,

    CONSTRAINT "Library_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Library" ADD CONSTRAINT "Library_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Library" ADD CONSTRAINT "Library_manifestFileId_fkey" FOREIGN KEY ("manifestFileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;
