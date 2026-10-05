-- CreateTable
CREATE TABLE "CardInstallmentPlan" (
    "id" SERIAL NOT NULL,
    "description" TEXT NOT NULL,
    "totalInstallments" INTEGER NOT NULL,
    "installmentAmount" DECIMAL(12,2) NOT NULL,
    "firstDueDate" TIMESTAMP(3) NOT NULL,
    "principal" DECIMAL(12,2),
    "interestRate" DOUBLE PRECISION,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "creditCardId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CardInstallmentPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CardInstallmentPlan_creditCardId_isActive_idx" ON "CardInstallmentPlan"("creditCardId", "isActive");

-- CreateIndex
CREATE INDEX "CardInstallmentPlan_userId_idx" ON "CardInstallmentPlan"("userId");

-- AddForeignKey
ALTER TABLE "CardInstallmentPlan" ADD CONSTRAINT "CardInstallmentPlan_creditCardId_fkey" FOREIGN KEY ("creditCardId") REFERENCES "CreditCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardInstallmentPlan" ADD CONSTRAINT "CardInstallmentPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
