# 📋 Guía: Sistema de Gestión de Deudas

## Cómo Registrar Pagos Mensuales

### 1. **Registrar un Pago Normal**

1. Ve a la página de **Deudas** en el menú lateral
2. Localiza la deuda que quieres pagar
3. Haz clic en el botón verde 💰 **"Registrar pago"**
4. El sistema abrirá un modal con:
   - **Información de la deuda**: nombre, acreedor, saldo pendiente
   - **Monto del pago**: Pre-llenado con la cuota mensual sugerida
   - **División automática**: El sistema calcula cuánto va a capital y cuánto a intereses
   - **Fecha**: Por defecto la fecha actual, pero puedes cambiarla
   - **Número de cuota**: Se incrementa automáticamente

5. Haz clic en **"Registrar Pago"**

### 2. **Cómo Funciona el Cálculo Automático**

El sistema divide cada pago en dos partes:

**Intereses del período:**

```
Interés mensual = (Saldo pendiente × Tasa anual %) / 12
```

**Capital (Principal):**

```
Capital = Monto del pago - Intereses
```

**Ejemplo:**

- Saldo pendiente: $5,000
- Tasa de interés: 12% anual (1% mensual)
- Pago: $300

Cálculo:

- Interés = $5,000 × 0.01 = $50
- Capital = $300 - $50 = $250
- **Nuevo saldo = $5,000 - $250 = $4,750**

---

## Cómo Adelantar Cuotas

### Ventajas de Adelantar Pagos:

✅ Reduces el saldo más rápido  
✅ Pagas menos intereses totales  
✅ Terminas la deuda antes de tiempo  
✅ El excedente va directo al capital

### Opciones para Adelantar:

#### **Opción 1: Pago Mayor a la Cuota**

1. En el modal de pago, ingresa un monto **mayor** a la cuota sugerida
2. El sistema calcula:
   - Los intereses del período (igual)
   - El resto va **todo al capital**

**Ejemplo:**

- Cuota normal: $300
- Tú pagas: $500 (adelanto de $200)
- Intereses: $50 (fijo según saldo)
- Capital: $450 ($200 más que lo normal)
- **Reduces el saldo $200 extra**

#### **Opción 2: Múltiples Pagos en el Mes**

Puedes registrar más de un pago por mes:

1. Registra el pago mensual normal (Cuota #1)
2. Si tienes dinero extra, registra otro pago:
   - Usa el mismo mes en la fecha
   - Marca como Cuota #2, #3, etc.
   - Todo el monto (menos intereses proporcionales) va al capital

#### **Opción 3: Pago Total (Liquidación)**

Para liquidar completamente:

1. Ve al modal de pago
2. Ingresa el **saldo pendiente exacto** (o más)
3. Registra el pago
4. El sistema:
   - Calcula los intereses del período
   - Aplica el resto al capital
   - **Marca la deuda como "Pagada" automáticamente**
   - El saldo pendiente queda en $0

---

## Ver Historial de Pagos

### Acceder al Historial:

1. En la tabla de deudas, haz clic en el botón azul 📄 **"Ver historial"**
2. El modal muestra:

**Panel Superior:**

- Total original de la deuda
- Saldo pendiente actual
- Total pagado hasta ahora
- Número de cuotas pagadas

**Tarjetas de Resumen:**

- 💚 **Capital Pagado**: Cuánto has reducido del préstamo
- 🧡 **Intereses Pagados**: Cuánto has pagado en intereses
- 💙 **Total Pagado**: Suma de capital + intereses

**Lista de Pagos:**
Cada pago registrado muestra:

- Número de cuota
- Fecha del pago
- División: Capital / Interés / Total
- Notas (si las agregaste)

---

## Casos de Uso Comunes

### 📌 Caso 1: Pago Mensual Regular

```
Mes 1: Pago $300 → Capital $250, Interés $50
Mes 2: Pago $300 → Capital $252.50, Interés $47.50
Mes 3: Pago $300 → Capital $255.02, Interés $44.98
(El interés disminuye cada mes porque el saldo baja)
```

### 📌 Caso 2: Pago Doble (Adelanto)

```
Mes 1: Pago $600 → Capital $550, Interés $50
(Adelantaste casi 2 cuotas completas)
Mes 2: Los intereses serán menores porque el saldo bajó más
```

### 📌 Caso 3: Pago Extra a Mitad de Mes

```
Cuota #1 (día 5): Pago $300 → Capital $250
Cuota #2 (día 15): Pago $200 → Capital $198, Interés $2
(El interés es proporcional al tiempo)
```

### 📌 Caso 4: Liquidación Anticipada

```
Saldo: $2,000
Pagas: $2,020
Interés del período: $20
Capital: $2,000
Resultado: Deuda PAGADA ✅
```

---

## Validaciones del Sistema

### ✅ El sistema NO permite:

- Pagos de $0 o negativos
- Pagos menores a los intereses generados (quedaría deuda infinita)
- Eliminar una deuda sin confirmación

### ✅ El sistema SÍ permite:

- Pagar cualquier monto mayor a los intereses
- Múltiples pagos en el mismo mes
- Cambiar la fecha de un pago (para registros históricos)
- Agregar notas a cada pago
- Ver el progreso visual con barra de porcentaje

---

## Tips y Mejores Prácticas

1. **Registra pagos apenas los hagas**: No esperes a fin de mes
2. **Usa las notas**: Anota de dónde salió el dinero extra
3. **Revisa el historial**: Para ver cómo progresas
4. **Adelanta cuando puedas**: Incluso $50 extra hace diferencia
5. **Compara intereses**: Paga primero las deudas con mayor tasa

---

## Próximas Funcionalidades

En desarrollo:

- 📊 Gráfico de progreso de cada deuda
- 📅 Recordatorios de pago próximos
- 🔔 Notificaciones cuando se acerca la fecha de pago
- 📈 Comparación de escenarios (qué pasa si adelanto X cantidad)
- 📑 Reporte de intereses pagados (para declaraciones)
- 💸 Proyección de fecha de liquidación según pagos extras
