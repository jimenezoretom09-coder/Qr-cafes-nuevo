-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "dinerId" TEXT,
ADD COLUMN     "dinerName" TEXT,
ADD COLUMN     "ticketId" TEXT;

-- AlterTable
ALTER TABLE "RestaurantProfile" ADD COLUMN     "accentColor" TEXT NOT NULL DEFAULT '#775a19',
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "primaryColor" TEXT NOT NULL DEFAULT '#1b1c1c';

-- AlterTable
-- Las mesas que ya existan reciben su codigo al azar antes de volver la columna obligatoria.
ALTER TABLE "RestaurantTable" ADD COLUMN     "publicToken" TEXT;
UPDATE "RestaurantTable" SET "publicToken" = md5(random()::text || id) WHERE "publicToken" IS NULL;
ALTER TABLE "RestaurantTable" ALTER COLUMN "publicToken" SET NOT NULL;

-- CreateTable
CREATE TABLE "OrderTicket" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "rejectReason" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seenAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "readyAt" TIMESTAMP(3),
    "pickedUpAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),

    CONSTRAINT "OrderTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceRequest" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "billScope" TEXT,
    "paymentHint" TEXT,
    "dinerId" TEXT,
    "dinerName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attendedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attendedAt" TIMESTAMP(3),

    CONSTRAINT "ServiceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "OrderTicket_status_idx" ON "OrderTicket"("status");

-- CreateIndex
CREATE INDEX "ServiceRequest_status_idx" ON "ServiceRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantTable_publicToken_key" ON "RestaurantTable"("publicToken");

-- AddForeignKey
ALTER TABLE "OrderTicket" ADD CONSTRAINT "OrderTicket_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "OrderTicket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "RestaurantTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

