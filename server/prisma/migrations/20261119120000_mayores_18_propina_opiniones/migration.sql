-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN     "isAdult" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "RestaurantProfile" ADD COLUMN     "googleReviewUrl" TEXT,
ADD COLUMN     "tipSuggestionPercent" INTEGER NOT NULL DEFAULT 10;

-- AlterTable
ALTER TABLE "ServiceRequest" ADD COLUMN     "tipPercent" INTEGER;

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "dinerId" TEXT NOT NULL,
    "dinerName" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Feedback_createdAt_idx" ON "Feedback"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Feedback_orderId_dinerId_key" ON "Feedback"("orderId", "dinerId");

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "RestaurantTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

