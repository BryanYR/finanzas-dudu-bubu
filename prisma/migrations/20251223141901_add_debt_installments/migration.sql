-- CreateTable
CREATE TABLE "DebtInstallment" (
    "id" SERIAL NOT NULL,
    "installmentNumber" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "principal" DOUBLE PRECISION NOT NULL,
    "interest" DOUBLE PRECISION NOT NULL,
    "insurance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "debtId" INTEGER NOT NULL,
    "debtPaymentId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DebtInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DebtInstallment_debtId_status_idx" ON "DebtInstallment"("debtId", "status");

-- CreateIndex
CREATE INDEX "DebtInstallment_dueDate_status_idx" ON "DebtInstallment"("dueDate", "status");

-- CreateIndex
CREATE UNIQUE INDEX "DebtInstallment_debtId_installmentNumber_key" ON "DebtInstallment"("debtId", "installmentNumber");

-- AddForeignKey
ALTER TABLE "DebtInstallment" ADD CONSTRAINT "DebtInstallment_debtId_fkey" FOREIGN KEY ("debtId") REFERENCES "Debt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebtInstallment" ADD CONSTRAINT "DebtInstallment_debtPaymentId_fkey" FOREIGN KEY ("debtPaymentId") REFERENCES "DebtPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
