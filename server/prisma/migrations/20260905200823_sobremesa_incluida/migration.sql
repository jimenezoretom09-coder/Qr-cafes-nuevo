-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN     "includesDrink" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isIncludedDrink" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "isIncluded" BOOLEAN NOT NULL DEFAULT false;
