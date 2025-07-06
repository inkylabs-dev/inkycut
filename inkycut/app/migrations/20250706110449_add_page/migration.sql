-- CreateTable
CREATE TABLE "Page" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "libraryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "llmNotes" TEXT,
    "orderIndex" INTEGER NOT NULL,
    "videoFileId" TEXT,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Page_libraryId_orderIndex_idx" ON "Page"("libraryId", "orderIndex");

-- AddForeignKey
ALTER TABLE "Page" ADD CONSTRAINT "Page_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "Library"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Page" ADD CONSTRAINT "Page_videoFileId_fkey" FOREIGN KEY ("videoFileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;
