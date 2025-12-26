# 📋 Sistema de Cuotas Programadas para Deudas

## 🎯 Objetivo

Implementar un sistema escalable para rastrear cuotas individuales de deudas con sus fechas de vencimiento, estado de pago, y manejo de pagos adelantados integrado con el módulo de planificación de pagos.

## 🏗️ Arquitectura

### Modelo de Base de Datos

#### DebtInstallment (Cuota Programada)

```prisma
model DebtInstallment {
  id                Int      @id @default(autoincrement())
  installmentNumber Int      // Número de cuota (1, 2, 3...)
  dueDate           DateTime // Fecha de vencimiento
  amount            Float    // Monto total de la cuota
  principal         Float    // Capital programado
  interest          Float    // Interés programado
  insurance         Float    // Seguro (opcional)
  status            String   // "pending" | "paid" | "overdue" | "advanced"
  debtId            Int
  debtPaymentId     Int?     // Vinculación con el pago realizado
  
  debt        Debt
  debtPayment DebtPayment?
}
```

#### Estados de Cuota

- **`pending`**: Cuota pendiente de pago, aún no vencida
- **`paid`**: Cuota pagada en o después de su fecha de vencimiento
- **`overdue`**: Cuota vencida no pagada
- **`advanced`**: Cuota pagada **antes** de su fecha de vencimiento ⚡

## 🔄 Flujo de Trabajo

### 1. Creación de Deuda

Cuando creas una nueva deuda:

```typescript
POST /api/debts
{
  "name": "Préstamo Personal",
  "totalAmount": 12000,
  "monthlyPayment": 1050,
  "totalInstallments": 12,
  "paymentDayOfMonth": 2,
  "interestRate": 15,
  "startDate": "2024-01-01"
}
```

**El sistema automáticamente**:
1. Crea la deuda
2. Genera 12 cuotas programadas
3. Calcula para cada cuota:
   - Fecha de vencimiento (día 2 de cada mes)
   - Capital e interés usando amortización
   - Estado inicial: `pending`

### 2. Pago de Cuota

Cuando realizas un pago:

```typescript
POST /api/debts/{id}/pay
{
  "amount": 1050,
  "principal": 900,
  "interest": 150,
  "date": "2024-12-25",
  "paymentNumber": 1,
  "installmentIds": [123] // Opcional: especifica qué cuota(s) estás pagando
}
```

**El sistema**:
1. Registra el pago en `DebtPayment`
2. Vincula el pago con la(s) cuota(s)
3. Determina el estado:
   - Si `fecha_pago < fecha_vencimiento` → `advanced` ⚡
   - Si `fecha_pago >= fecha_vencimiento` → `paid`
4. Actualiza el saldo restante de la deuda
5. Marca la deuda como pagada si `remainingAmount <= 0`

### 3. Consulta de Cuotas

Ver todas las cuotas de una deuda:

```typescript
GET /api/debts/{id}/installments
```

Retorna:
```typescript
[
  {
    "id": 123,
    "installmentNumber": 1,
    "dueDate": "2024-02-02",
    "amount": 1050,
    "principal": 900,
    "interest": 150,
    "status": "advanced", // ⚡ Pagada adelantada!
    "debtPayment": {
      "id": 456,
      "date": "2024-01-25",
      "amount": 1050
    }
  },
  {
    "installmentNumber": 2,
    "dueDate": "2024-03-02",
    "status": "pending" // Próxima cuota a pagar
  }
]
```

## 🎯 Integración con Planificación de Pagos

### Antes (sin cuotas programadas)
- ❌ Calculaba la fecha manualmente
- ❌ No sabía si ya pagaste
- ❌ No podía detectar pagos adelantados

### Ahora (con cuotas programadas)
```typescript
GET /api/payment-plan/suggestions
```

Retorna sugerencias que incluyen:
```typescript
{
  "id": "debt-5-installment-125",
  "type": "debt",
  "name": "Préstamo Personal - Cuota 2/12",
  "amount": 1050,
  "dueDate": "2024-03-02",
  "priority": "high", // Porque vence pronto
  "reason": "Vence esta semana",
  "installmentNumber": 2,
  "installmentId": 125
}
```

✅ **Sabe exactamente**:
- Cuál es la siguiente cuota a pagar
- Si ya adelantaste el pago de enero
- Fecha exacta de vencimiento
- No te sugiere pagar cuotas ya pagadas

## 💡 Casos de Uso

### Caso 1: Pago Adelantado (Tu escenario)

**Situación**: Tienes un crédito que pagas el día 2 de cada mes. Hoy es 25 de diciembre y pagas la cuota de enero adelantado.

```typescript
// 1. Realizar pago adelantado
POST /api/debts/5/pay
{
  "amount": 1050,
  "date": "2024-12-25"
}

// El sistema automáticamente:
// - Detecta que 25/12 < 02/01 (fecha de vencimiento)
// - Marca la cuota como "advanced" ⚡
// - Vincula el pago con la cuota

// 2. Al consultar planificación el 27 de diciembre
GET /api/payment-plan/suggestions

// Resultado:
// ✅ NO aparece la cuota de enero (ya está pagada)
// ✅ Aparece la cuota de febrero como próximo pago
{
  "name": "Préstamo Personal - Cuota 2/12",
  "dueDate": "2024-02-02",
  "status": "pending"
}
```

### Caso 2: Pago Múltiple

Quieres pagar 2 cuotas de una vez:

```typescript
POST /api/debts/5/pay
{
  "amount": 2100,
  "installmentIds": [125, 126] // Cuota 2 y 3
}

// El sistema:
// - Marca ambas cuotas como pagadas/adelantadas
// - Actualiza el saldo
// - La próxima sugerencia será la cuota #4
```

### Caso 3: Cuota Vencida

No pagaste a tiempo:

```typescript
// El sistema automáticamente:
// - Detecta cuotas con dueDate < now y status = "pending"
// - Las marca como "overdue"
// - En planificación aparecen con prioridad "urgent" 🚨

GET /api/payment-plan/suggestions
{
  "priority": "urgent",
  "reason": "🚨 VENCIDA - Paga inmediatamente"
}
```

## 📊 Visualización en el Frontend

### Componente: DebtInstallmentsModal

Muestra tabla completa de cuotas con:
- ✅ Número de cuota
- ✅ Fecha de vencimiento
- ✅ Monto, capital, interés
- ✅ Estado visual con colores
- ✅ Fecha de pago (si ya se pagó)
- ✅ Indicador ⚡ para pagos adelantados

Uso:
```vue
<DebtInstallmentsModal
  :show="showModal"
  :debtId="selectedDebt.id"
  :debtName="selectedDebt.name"
  @close="showModal = false"
/>
```

## 🔧 Migración de Deudas Existentes

Para deudas creadas antes del sistema de cuotas:

```bash
npx tsx prisma/generate-installments.ts
```

Este script:
1. Busca deudas sin cuotas
2. Genera cuotas retroactivas
3. Vincula pagos existentes con sus cuotas
4. Marca cuotas como pagadas/adelantadas según corresponda

## 📈 Ventajas

### Escalabilidad
- ✅ Soporta cualquier número de cuotas
- ✅ Cualquier frecuencia de pago
- ✅ Fácil agregar nuevos campos (seguros, penalidades, etc.)

### Precisión
- ✅ Fechas exactas de vencimiento
- ✅ Historial completo de pagos
- ✅ Detección automática de pagos adelantados

### Integración
- ✅ Planificación de pagos inteligente
- ✅ Dashboard con métricas precisas
- ✅ Reportes detallados

## 🚀 Próximas Mejoras

1. **Recordatorios automáticos**
   - Email/notificación 3 días antes del vencimiento

2. **Penalidades por mora**
   - Calcular intereses adicionales en cuotas vencidas

3. **Reestructuración de deuda**
   - Recalcular cuotas pendientes si renegocías

4. **Exportar a Excel**
   - Tabla de amortización completa

## 📝 Notas Técnicas

### Cálculo de Intereses

El sistema usa **amortización francesa** (cuota fija):
```typescript
const monthlyRate = annualRate / 100 / 12
const interestAmount = remainingBalance * monthlyRate
const principalAmount = monthlyPayment - interestAmount
```

### Índices de Base de Datos

Para rendimiento óptimo:
```prisma
@@unique([debtId, installmentNumber])
@@index([debtId, status])
@@index([dueDate, status])
```

### Actualización de Estados

Los estados se actualizan:
- Al consultar cuotas (`installments.get.ts`)
- Al pagar una cuota (`pay.post.ts`)
- En sugerencias de pago (`suggestions.get.ts`)

## 🆘 Troubleshooting

**Problema**: Las cuotas no se generaron automáticamente
- **Solución**: Ejecuta `npx tsx prisma/generate-installments.ts`

**Problema**: El estado no se actualiza
- **Solución**: Las APIs automáticamente actualizan estados vencidos al consultarlas

**Problema**: Pagos no se vinculan con cuotas
- **Solución**: Asegúrate de pasar `installmentIds` en el body del pago, o el sistema asignará a la próxima cuota pendiente

## 📞 Soporte

Para más información, revisa:
- [Schema de Base de Datos](./prisma/schema.prisma)
- [API de Deudas](./server/api/debts/)
- [Tipos TypeScript](./app/types/deuda.ts)
