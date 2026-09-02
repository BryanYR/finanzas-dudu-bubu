import { z } from 'zod'

// ─── Helper ────────────────────────────────────────────────────────────────

/**
 * Valida el body con un schema Zod y lanza un error 400 con el primer mensaje
 * de error si la validación falla.
 * Compatible con Zod v4 (usa .issues en lugar de .errors).
 */
export function validateBody<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.issues[0]?.message ?? 'Datos inválidos',
    })
  }
  return result.data
}

// ─── Helpers internos ──────────────────────────────────────────────────────

// Fecha opcional: string ISO o vacío → undefined
const optionalDate = z.iso.datetime({ offset: true }).optional().or(z.literal('').transform(() => undefined))

// Fecha opcional nullable
const optionalDateNullable = z.iso.datetime({ offset: true }).optional().nullable().or(z.literal('').transform(() => null))

// ─── Auth ──────────────────────────────────────────────────────────────────

export const RegisterSchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(100, 'El nombre es demasiado largo'),
  email: z.string().trim().email('El correo no es válido').max(255, 'El correo es demasiado largo'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(128, 'La contraseña es demasiado larga')
    .refine((v) => /[A-Z]/.test(v), 'La contrasena debe contener al menos una letra mayuscula')
    .refine((v) => /[0-9]/.test(v), 'La contrasena debe contener al menos un numero'),
})

export const LoginSchema = z.object({
  email: z.string().trim().email('El correo no es válido'),
  password: z.string().min(1, 'La contraseña es requerida'),
})

// ─── Categories ────────────────────────────────────────────────────────────

export const CategorySchema = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido').max(100, 'El nombre es demasiado largo'),
  type: z.enum(['income', 'expense'], { error: 'El tipo debe ser "income" o "expense"' }),
  icon: z.string().trim().max(100).optional(),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'El color debe ser un hex válido (ej: #FF5733)')
    .optional()
    .or(z.literal('').transform(() => undefined)),
})

// ─── Incomes ───────────────────────────────────────────────────────────────

export const IncomeSchema = z.object({
  amount: z
    .number('El monto debe ser un número')
    .positive('El monto debe ser positivo')
    .max(999_999_999, 'El monto es demasiado grande'),
  description: z.string().trim().min(1, 'La descripción es requerida').max(255, 'La descripción es demasiado larga'),
  date: optionalDate,
  isRecurring: z.boolean().optional().default(false),
  frequency: z.enum(['monthly', 'biweekly', 'weekly', 'annual']).optional().nullable(),
  notes: z.string().trim().max(1000, 'Las notas son demasiado largas').optional().nullable(),
  categoryId: z.number('La categoria debe ser un numero').int().positive('La categoria es requerida'),
})

// ─── Expenses ──────────────────────────────────────────────────────────────

export const ExpenseSchema = z.object({
  amount: z
    .number('El monto debe ser un número')
    .positive('El monto debe ser positivo')
    .max(999_999_999, 'El monto es demasiado grande'),
  description: z.string().trim().min(1, 'La descripción es requerida').max(255, 'La descripción es demasiado larga'),
  date: optionalDate,
  isRecurring: z.boolean().optional().default(false),
  frequency: z.enum(['monthly', 'biweekly', 'weekly', 'annual']).optional().nullable(),
  notes: z.string().trim().max(1000, 'Las notas son demasiado largas').optional().nullable(),
  categoryId: z.number('La categoria debe ser un numero').int().positive('La categoria es requerida'),
  paymentMethod: z.enum(['cash', 'debit', 'credit']).optional().default('cash'),
  creditCardId: z.number().int().positive().optional().nullable(),
})

// ─── Credit Cards ──────────────────────────────────────────────────────────

export const CreditCardSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido').max(100, 'El nombre es demasiado largo'),
  bank: z.string().trim().min(1, 'El banco es requerido').max(100, 'El banco es demasiado largo'),
  lastDigits: z.string().regex(/^\d{4}$/, 'Los últimos 4 dígitos deben ser exactamente 4 números'),
  creditLimit: z
    .number('El límite debe ser un número')
    .positive('El límite debe ser positivo')
    .max(999_999_999, 'El límite es demasiado grande'),
  billingDay: z
    .number('El día de corte debe ser un número')
    .int()
    .min(1, 'El día debe ser entre 1 y 31')
    .max(31, 'El día debe ser entre 1 y 31'),
  paymentDay: z
    .number('El día de pago debe ser un número')
    .int()
    .min(1, 'El día debe ser entre 1 y 31')
    .max(31, 'El día debe ser entre 1 y 31'),
  interestRate: z
    .number('La tasa debe ser un número')
    .min(0, 'La tasa no puede ser negativa')
    .max(100, 'La tasa no puede superar el 100%'),
  isActive: z.boolean().optional().default(true),
})

export const CreditCardPaymentSchema = z.object({
  amount: z.number('El monto debe ser un número').positive('El monto debe ser positivo'),
  date: optionalDate,
  categoryId: z.number('La categoria debe ser un numero').int().positive('La categoria es requerida'),
})

// ─── Savings ───────────────────────────────────────────────────────────────

export const SavingsGoalSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido').max(100, 'El nombre es demasiado largo'),
  targetAmount: z
    .number('El monto objetivo debe ser un número')
    .positive('El monto objetivo debe ser positivo')
    .max(999_999_999, 'El monto es demasiado grande'),
  currentAmount: z.number('El monto actual debe ser un número').min(0, 'El monto actual no puede ser negativo').optional().default(0),
  deadline: optionalDateNullable,
  priority: z.number().int().min(1).max(3).optional().default(1),
  description: z.string().trim().max(500, 'La descripción es demasiado larga').optional().nullable(),
})

export const SavingsContributionSchema = z.object({
  amount: z
    .number('El monto debe ser un número')
    .positive('El monto debe ser positivo')
    .max(999_999_999, 'El monto es demasiado grande'),
  notes: z.string().trim().max(500, 'Las notas son demasiado largas').optional().nullable(),
})

// ─── Debts ─────────────────────────────────────────────────────────────────

export const DebtSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido').max(100, 'El nombre es demasiado largo'),
  creditor: z.string().trim().min(1, 'El acreedor es requerido').max(100, 'El acreedor es demasiado largo'),
  totalAmount: z
    .number('El monto total debe ser un número')
    .positive('El monto total debe ser positivo')
    .max(999_999_999, 'El monto es demasiado grande'),
  remainingAmount: z.number('El monto restante debe ser un número').min(0, 'El monto restante no puede ser negativo').optional(),
  interestRate: z
    .number('La tasa de interés debe ser un número')
    .min(0, 'La tasa no puede ser negativa')
    .max(100, 'La tasa no puede superar el 100%'),
  monthlyPayment: z.number('La cuota mensual debe ser un número').positive('La cuota mensual debe ser positiva'),
  totalInstallments: z
    .number('El número de cuotas debe ser un número')
    .int()
    .min(1, 'Debe haber al menos 1 cuota')
    .max(600, 'El número de cuotas es demasiado grande')
    .optional()
    .default(12),
  paymentDayOfMonth: z
    .number('El día de pago debe ser un número')
    .int()
    .min(1, 'El día debe ser entre 1 y 28')
    .max(28, 'El día debe ser entre 1 y 28 para evitar problemas en meses cortos')
    .optional()
    .default(15),
  startDate: z.iso.datetime({ offset: true }),
  endDate: optionalDateNullable,
})

export const DebtPaymentSchema = z.object({
  amount: z.number('El monto debe ser un número').positive('El monto debe ser positivo'),
  principal: z.number('El capital debe ser un número').min(0, 'El capital no puede ser negativo'),
  interest: z.number('El interés debe ser un número').min(0, 'El interés no puede ser negativo'),
  insurance: z.number('El seguro debe ser un número').min(0, 'El seguro no puede ser negativo').optional().default(0),
  date: optionalDate,
  paymentNumber: z.number('El numero de pago debe ser un numero').int().positive(),
  notes: z.string().trim().max(500, 'Las notas son demasiado largas').optional().nullable(),
  installmentIds: z.array(z.number().int().positive()).optional(),
})

// ─── Budgets ───────────────────────────────────────────────────────────────

export const BudgetSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido').max(100, 'El nombre es demasiado largo'),
  totalBudget: z.number('El presupuesto debe ser un número').positive('El presupuesto debe ser positivo'),
  startDate: z.iso.datetime({ offset: true }),
  endDate: z.iso.datetime({ offset: true }),
  description: z.string().trim().max(500).optional().nullable(),
  expectedIncome: z.number().min(0).optional().default(0),
  fixedExpenses: z.number().min(0).optional().default(0),
  debtPayments: z.number().min(0).optional().default(0),
  availableAmount: z.number().min(0).optional().default(0),
  debitUsage: z.number().min(0).optional().default(0),
  creditUsage: z.number().min(0).optional().default(0),
  savingsImpact: z.number().min(0).optional().default(0),
})
