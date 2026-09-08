-- AlterTable
ALTER TABLE "CreditCard" ADD COLUMN     "installmentFees" JSONB;

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "installmentAmount" DOUBLE PRECISION,
ADD COLUMN     "totalWithInterest" DOUBLE PRECISION;
