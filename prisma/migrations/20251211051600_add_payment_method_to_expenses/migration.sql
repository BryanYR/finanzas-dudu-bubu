-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "paymentMethod" TEXT NOT NULL DEFAULT 'cash';

-- CreateIndex
CREATE INDEX "Expense_userId_paymentMethod_idx" ON "Expense"("userId", "paymentMethod");
