# API Endpoints - FinanzApp

## 📋 Resumen de Endpoints Implementados

### 🔐 Autenticación (`/api/auth`)

| Método | Endpoint             | Descripción             |
| ------ | -------------------- | ----------------------- |
| POST   | `/api/auth/register` | Registrar nuevo usuario |
| POST   | `/api/auth/login`    | Iniciar sesión          |
| GET    | `/api/auth/me`       | Obtener usuario actual  |

---

### 🏷️ Categorías (`/api/categories`)

| Método | Endpoint              | Descripción                   |
| ------ | --------------------- | ----------------------------- |
| GET    | `/api/categories`     | Listar categorías del usuario |
| POST   | `/api/categories`     | Crear nueva categoría         |
| DELETE | `/api/categories/:id` | Eliminar categoría            |

**Body para POST:**

```json
{
  "name": "Alimentación",
  "type": "expense",
  "icon": "🍔",
  "color": "#FF6B6B"
}
```

---

### 💰 Ingresos (`/api/incomes`)

| Método | Endpoint           | Descripción                         |
| ------ | ------------------ | ----------------------------------- |
| GET    | `/api/incomes`     | Listar ingresos (con filtros fecha) |
| POST   | `/api/incomes`     | Crear nuevo ingreso                 |
| DELETE | `/api/incomes/:id` | Eliminar ingreso                    |

**Query params para GET:**

- `from`: Fecha inicial (ISO string)
- `to`: Fecha final (ISO string)

**Body para POST:**

```json
{
  "amount": 5000,
  "description": "Salario mensual",
  "date": "2025-12-10",
  "isRecurring": true,
  "frequency": "monthly",
  "categoryId": 1,
  "notes": "Pago quincenal"
}
```

---

### 💸 Gastos (`/api/expenses`)

| Método | Endpoint            | Descripción                       |
| ------ | ------------------- | --------------------------------- |
| GET    | `/api/expenses`     | Listar gastos (con filtros fecha) |
| POST   | `/api/expenses`     | Crear nuevo gasto                 |
| DELETE | `/api/expenses/:id` | Eliminar gasto                    |

**Query params para GET:**

- `from`: Fecha inicial (ISO string)
- `to`: Fecha final (ISO string)

**Body para POST:**

```json
{
  "amount": 150.5,
  "description": "Compras del supermercado",
  "date": "2025-12-10",
  "isRecurring": false,
  "frequency": null,
  "categoryId": 2,
  "creditCardId": 1,
  "notes": "Compras semanales"
}
```

---

### 💳 Tarjetas de Crédito (`/api/credit-cards`)

| Método | Endpoint                | Descripción                 |
| ------ | ----------------------- | --------------------------- |
| GET    | `/api/credit-cards`     | Listar tarjetas del usuario |
| POST   | `/api/credit-cards`     | Crear nueva tarjeta         |
| PUT    | `/api/credit-cards/:id` | Actualizar tarjeta          |
| DELETE | `/api/credit-cards/:id` | Eliminar tarjeta            |

**Body para POST/PUT:**

```json
{
  "name": "Visa Gold",
  "bank": "Banco Nacional",
  "lastDigits": "4532",
  "creditLimit": 10000,
  "billingDay": 15,
  "paymentDay": 5,
  "interestRate": 24.5,
  "isActive": true
}
```

---

### 🎯 Ahorros (`/api/savings`)

| Método | Endpoint                      | Descripción            |
| ------ | ----------------------------- | ---------------------- |
| GET    | `/api/savings`                | Listar metas de ahorro |
| POST   | `/api/savings`                | Crear nueva meta       |
| POST   | `/api/savings/:id/contribute` | Agregar contribución   |
| DELETE | `/api/savings/:id`            | Eliminar meta          |

**Body para POST (crear meta):**

```json
{
  "name": "Viaje a Europa",
  "targetAmount": 50000,
  "currentAmount": 5000,
  "deadline": "2026-06-30",
  "priority": 1,
  "description": "Vacaciones de verano"
}
```

**Body para POST (contribuir):**

```json
{
  "amount": 1000,
  "notes": "Ahorro del mes de diciembre"
}
```

---

### 📋 Deudas (`/api/debts`)

| Método | Endpoint             | Descripción             |
| ------ | -------------------- | ----------------------- |
| GET    | `/api/debts`         | Listar deudas           |
| POST   | `/api/debts`         | Crear nueva deuda       |
| POST   | `/api/debts/:id/pay` | Registrar pago de cuota |
| DELETE | `/api/debts/:id`     | Eliminar deuda          |

**Body para POST (crear deuda):**

```json
{
  "name": "Préstamo Personal",
  "creditor": "Banco XYZ",
  "totalAmount": 100000,
  "remainingAmount": 80000,
  "interestRate": 15.5,
  "monthlyPayment": 5000,
  "startDate": "2025-01-01",
  "endDate": "2027-01-01"
}
```

**Body para POST (pagar cuota):**

```json
{
  "amount": 5000,
  "principal": 4200,
  "interest": 800,
  "paymentNumber": 12,
  "notes": "Cuota de diciembre"
}
```

---

### 📊 Proyecciones (`/api/budgets`)

| Método | Endpoint           | Descripción            |
| ------ | ------------------ | ---------------------- |
| GET    | `/api/budgets`     | Listar proyecciones    |
| POST   | `/api/budgets`     | Crear nueva proyección |
| DELETE | `/api/budgets/:id` | Eliminar proyección    |

**Query params para GET:**

- `startDate`: Fecha inicial (ISO string)
- `endDate`: Fecha final (ISO string)

**Body para POST:**

```json
{
  "name": "Viaje a Cancún",
  "totalBudget": 30000,
  "startDate": "2026-03-01",
  "endDate": "2026-03-15",
  "description": "Vacaciones de primavera",
  "expectedIncome": 10000,
  "fixedExpenses": 8000,
  "debtPayments": 5000,
  "availableAmount": 17000,
  "debitUsage": 15000,
  "creditUsage": 15000,
  "savingsImpact": -2000
}
```

---

## 🔒 Autenticación

Todos los endpoints (excepto `/api/auth/register` y `/api/auth/login`) requieren autenticación mediante JWT en cookie `session`.

## 📝 Respuestas de Error

```json
{
  "statusCode": 401,
  "message": "No autorizado"
}
```

```json
{
  "statusCode": 404,
  "message": "Recurso no encontrado"
}
```

## ✅ Endpoints Funcionales

Todos los endpoints han sido creados y están listos para ser consumidos desde el frontend.
