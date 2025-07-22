-- CreateTable
CREATE TABLE "SharedProject" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "s3Key" TEXT NOT NULL,

    CONSTRAINT "SharedProject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SharedProject_s3Key_key" ON "SharedProject"("s3Key");
