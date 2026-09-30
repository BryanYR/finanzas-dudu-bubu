import type { CreditCard } from '#types/tarjeta'

export interface InstallmentCost {
  monthlyPayment: number
  totalInterest: number
  totalToPay: number
  feePercent: number
  source: 'table' | 'tea' | 'none'
}

/**
 * Calcula el costo de una compra en cuotas con tarjeta usando:
 * 1. Tabla installmentFees de la tarjeta (exacta, del simulador del banco)
 * 2. Fórmula TEA como respaldo (anualidad / amortización francesa)
 * 3. División simple si la tarjeta no tiene tasa configurada
 *
 * Devuelve null si no aplica (sin tarjeta, 1 cuota o monto <= 0).
 */
export function computeInstallmentCost(
  card: CreditCard | null | undefined,
  amount: number,
  installments: number
): InstallmentCost | null {
  if (!card || installments <= 1 || amount <= 0) return null

  const n = Number(installments)
  const principal = Number(amount)

  // Opción 1: tabla de comisiones (datos exactos del banco)
  if (card.installmentFees) {
    const feePercent = card.installmentFees[String(n)]
    if (feePercent != null && feePercent > 0) {
      const totalInterest = (principal * feePercent) / 100
      const totalToPay = principal + totalInterest
      const monthlyPayment = totalToPay / n
      return { monthlyPayment, totalInterest, totalToPay, feePercent, source: 'table' }
    }
  }

  // Opción 2: TEA → TEM → fórmula de anualidad
  if (card.interestRate && card.interestRate > 0) {
    const tem = Math.pow(1 + card.interestRate / 100, 1 / 12) - 1
    const monthlyPayment =
      tem === 0 ? principal / n : (principal * tem) / (1 - Math.pow(1 + tem, -n))
    const totalToPay = monthlyPayment * n
    const totalInterest = totalToPay - principal
    const feePercent = (totalInterest / principal) * 100
    return { monthlyPayment, totalInterest, totalToPay, feePercent, source: 'tea' }
  }

  // Opción 3: sin tasa — división simple, sin interés
  return {
    monthlyPayment: principal / n,
    totalInterest: 0,
    totalToPay: principal,
    feePercent: 0,
    source: 'none',
  }
}
