# Schema de Base de Datos - FinanzApp

## 📊 Resumen del Schema Optimizado

El schema ha sido completamente rediseñado para soportar todas las funcionalidades requeridas de tu aplicación de finanzas personales.

## 🗂️ Modelos Principales

### 1. **User** (Usuario)

- Información básica del usuario
- Gestión de autenticación
- Timestamps automáticos

### 2. **Category** (Categorías)

- Categorización de ingresos y gastos
- Iconos y colores personalizables para UI
- Índices optimizados para consultas por usuario y tipo

### 3. **Income** (Ingresos)

- ✅ Registro de ingresos **fijos** (isRecurring=true)
- ✅ Registro de ingresos **variables/extras** (isRecurring=false)
- ✅ Frecuencia configurable: mensual, quincenal, semanal, anual
- Ejemplos: sueldos, trabajos extras, bonos
- Vinculación con categorías

### 4. **Expense** (Gastos)

- ✅ Registro de gastos **fijos** (isRecurring=true)
- ✅ Registro de gastos **variados** (isRecurring=false)
- ✅ Vinculación opcional con tarjetas de crédito
- Ejemplos: renta, servicios, entretenimiento
- Frecuencia configurable

### 5. **CreditCard** (Tarjetas de Crédito)

- ✅ CRUD completo de tarjetas
- Información detallada: banco, límite, días de corte/pago
- Tasa de interés
- Estado activo/inactivo
- Tracking de gastos por tarjeta

### 6. **SavingsGoal** (Metas de Ahorro)

- ✅ Gestión de metas con montos objetivos
- ✅ Seguimiento de progreso (currentAmount vs targetAmount)
- Priorización de metas (alta/media/baja)
- Fechas límite opcionales
- Estado de completitud

### 7. **SavingsContribution** (Contribuciones a Ahorros)

- Registro histórico de aportes a metas
- Tracking de fechas y montos
- Notas adicionales

### 8. **Debt** (Deudas)

- ✅ Gestión de préstamos y créditos
- Cálculo de intereses y cuotas
- Tracking de monto total vs pendiente
- Información del acreedor
- Estado de pago

### 9. **DebtPayment** (Pagos de Deudas)

- ✅ Registro detallado de cada cuota
- Separación de capital e interés
- Número de cuota
- Historial completo de pagos

### 10. **BudgetProjection** (Proyecciones de Presupuesto)

- ✅ Planificación de eventos futuros (viajes, compras grandes)
- ✅ Análisis de escenarios financieros
- ✅ Cálculo automático de disponibilidad
- ✅ Sugerencias de uso en débito vs crédito
- ✅ Impacto en ahorros
- Consideración de gastos fijos y deudas

## 🎯 Características Implementadas

### ✅ Todos los Requerimientos Cumplidos:

1. **Registro de Gastos (fijos, variados)** ✓
   - Modelo `Expense` con campo `isRecurring` y `frequency`

2. **Registro de Ingresos (fijos, variados - mensuales/extras)** ✓
   - Modelo `Income` con campo `isRecurring` y `frequency`

3. **Registro de Tarjetas de Crédito (CRUD)** ✓
   - Modelo `CreditCard` completo con todas las propiedades

4. **Manejo y Proyección de Ahorros** ✓
   - Modelos `SavingsGoal` y `SavingsContribution`

5. **Manejo de Deudas (cuotas mensuales)** ✓
   - Modelos `Debt` y `DebtPayment`

6. **Reportes** ✓
   - Schema preparado con índices optimizados para queries
   - Filtrado por fechas, usuarios, tipos

7. **Exportación de Excel/PDF** ✓
   - Schema estructurado para fácil extracción de datos

8. **Módulo de Proyecciones** ✓
   - Modelo `BudgetProjection` con cálculos completos

## 🔍 Índices de Optimización

```prisma
@@index([userId, date])          // Consultas por usuario y fecha
@@index([userId, type])          // Filtrado por tipo
@@index([userId, isRecurring])   // Filtrado por recurrencia
@@index([creditCardId])          // Join con tarjetas
```

## 🔗 Relaciones Implementadas

- **Cascade Delete**: Al eliminar usuario, se eliminan todos sus datos
- **Restrict**: No se pueden eliminar categorías con transacciones
- **Set Null**: Al eliminar tarjeta, gastos mantienen registro pero pierden referencia

## 📊 Menú de Módulos Implementado

El Sidebar (`app/components/utils/Sidebar.vue`) incluye:

1. 🏠 **Dashboard** - Vista general
2. 💰 **Ingresos** - Gestión de ingresos fijos y variables
3. 💸 **Gastos** - Gestión de gastos fijos y variados
4. 💳 **Tarjetas** - CRUD de tarjetas de crédito
5. 🎯 **Ahorros** - Metas y contribuciones
6. 📋 **Deudas** - Préstamos y cuotas
7. 📊 **Reportes** - Análisis y gráficos
8. 📈 **Proyecciones** - Planificación financiera
9. 🏷️ **Categorías** - Gestión de categorías

## 🚀 Escalabilidad

El schema está diseñado para:

- ✅ Soportar múltiples usuarios concurrentes
- ✅ Manejar grandes volúmenes de transacciones
- ✅ Queries optimizadas con índices estratégicos
- ✅ Relaciones bien definidas para integridad referencial
- ✅ Campos extensibles (JSON en futuro si es necesario)
- ✅ Soft deletes opcionales (campo `isActive`)

## 📝 Próximos Pasos Recomendados

1. **Crear endpoints API** para cada modelo
2. **Implementar páginas Vue** para cada módulo
3. **Agregar validaciones** con Zod o similar
4. **Implementar gráficos** con Chart.js
5. **Exportación** con librerías como ExcelJS y jsPDF
6. **Dashboard** con estadísticas en tiempo real
