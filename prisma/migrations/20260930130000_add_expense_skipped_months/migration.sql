-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "skippedMonths" TEXT[] DEFAULT ARRAY[]::TEXT[];
