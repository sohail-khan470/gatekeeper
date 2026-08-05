-- CreateTable
CREATE TABLE "Message" (
    "id" SERIAL NOT NULL,
    "content" VARCHAR(500) NOT NULL,
    "author" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Message_createdAt_idx" ON "Message"("createdAt");
