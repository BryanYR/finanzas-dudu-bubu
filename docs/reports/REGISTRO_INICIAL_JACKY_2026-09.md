# Registro inicial de la cuenta de Jacky — al 30/09/2026

Snapshot al **30 de setiembre de 2026**, para la cuenta `damar08011991@gmail.com` (Jacky Damar, usuario id 1). Fuente: su Excel `CUENTAS 2026 BUBU.xlsx`, pestañas **SETIEMBRE** a **DICIEMBRE** (y AGOSTO-P como referencia).

**Estado: ✅ cargado en la app el 30/09/2026.** Antes la cuenta estaba vacía: solo tenía las 5 categorías de ingreso del seed. Quedaron cargados:

- 18 categorías.
- 7 ingresos, que suman S/ 6,562.40.
- 13 gastos, que suman S/ 2,233.48.
- 2 tarjetas, con 8 recibos.
- 3 deudas.

No se registraron la comida de octubre ni los aportes proyectados de oct/nov: se registran cuando ocurran.

Este documento lista **todo lo que hay que registrar** para que la app refleje lo que ella lleva en el Excel, módulo por módulo y en el orden recomendado.

---

## 0. Antes de empezar: problema con las categorías de ingreso

El seed creó las categorías de ingreso con `type: 'INCOME'` (en mayúsculas), pero la app espera `'income'` (en minúsculas):

- El formulario de ingresos filtra con `cat.type === 'income'` ([IncomeFormModal.vue:115](../../app/components/ingresos/IncomeFormModal.vue#L115)).
- La validación solo acepta `'income' | 'expense'` ([validation.ts:62](../../server/utils/validation.ts#L62)).

Con eso, **ninguna de sus 5 categorías va a aparecer al crear un ingreso.** Hay dos formas de arreglarlo:

1. **Desde la app:** crear las categorías de nuevo en `/categorias` (se guardan bien en minúsculas) y borrar las viejas.
2. **Desde la BD (mejor):** `UPDATE "Category" SET type = 'income' WHERE type = 'INCOME';` y corregir `prisma/seed.ts` para que use `'income'`. Esto también afecta a las categorías de Bryan.

## 1. Categorías de gasto (crear en `/categorias`)

Ella no tiene ninguna categoría de gasto. Estas cubren todo lo que aparece en el Excel:

| Categoría          | Para qué se usa                                              |
| ------------------ | ------------------------------------------------------------ |
| Vivienda           | Alquiler del cuarto                                          |
| Juntas             | Junta de cumpleaños (las otras dos van en deudas, sección 5) |
| Servicios          | Celular, ChatGPT, Spotify                                    |
| Cuidado personal   | Maquillaje, skin care, shampoos, vitaminas, parches, cremas  |
| Salud              | Medicamentos ginecológicos                                   |
| Educación          | Universidad (por temporadas, no es mensual)                  |
| Supermercado       | Plaza Vea, Mass                                              |
| Comida y delivery  | PedidosYa, comida del mes                                    |
| Transporte         | RedBus                                                       |
| Tecnología y hogar | Celular (equipo), audífonos, secadora, extractor             |
| Compras online     | Temu, GithBeauty                                             |
| Préstamos          | Pago de préstamos (si no se usa el módulo de deudas)         |

Para ingresos, además de **Salario** y **Otros Ingresos** (ya existen), conviene crear **Aporte familiar**, para lo que le dan Bryan, su mamá o su papá.

## 2. Ingresos (`/ingresos`)

### Sueldo (fijo)

Trabaja para el Estado: le pagan según el cronograma del MEF, más o menos una semana antes de fin de mes. En la columna "FECHA DE PAGO" del Excel están las fechas exactas:

| Mes | Fecha de pago del sueldo |
| --- | ------------------------ |
| Set | 18/09/2026               |
| Oct | 21/10/2026               |
| Nov | 19/11/2026               |
| Dic | 17/12/2026               |

**Registrar:**

| Campo       | Valor                                         |
| ----------- | --------------------------------------------- |
| Descripción | Sueldo                                        |
| Monto       | S/ 2,900.00                                   |
| Fecha       | 18/09/2026                                    |
| Categoría   | Salario                                       |
| Recurrente  | Sí, `monthly`                                 |
| Notas       | Cronograma MEF, ~1 semana antes de fin de mes |

> La app repite el ingreso mensual el mismo día del mes de la fecha original (el 18). Como el día real cambia (17–21), el sueldo puede aparecer unos días antes o después. Si eso molesta, la alternativa es registrarlo cada mes como ingreso no recurrente, con la fecha real.

### Aguinaldo de diciembre (extra)

En diciembre el Excel pone un ingreso de S/ 3,200, o sea S/ 300 más que el sueldo. Es el aguinaldo navideño del sector público.

| Descripción        | Monto     | Fecha      | Categoría      | Recurrente |
| ------------------ | --------- | ---------- | -------------- | ---------- |
| Aguinaldo navideño | S/ 300.00 | 17/12/2026 | Otros Ingresos | No         |

### Aportes recibidos en setiembre (extra, ya recibidos)

Salen del cuadro "SALDO" de la pestaña SETIEMBRE. Es la plata que juntó para pagar los recibos del 15/10:

| Descripción          | Monto       | Categoría       | Nota                                                     |
| -------------------- | ----------- | --------------- | -------------------------------------------------------- |
| Aporte Bryan         | S/ 800.00   | Aporte familiar |                                                          |
| Aporte Bryan (extra) | S/ 2,000.00 | Aporte familiar | En el Excel figura como "PRESTAMO BRYAN"; no se devuelve |
| Aporte mamá          | S/ 500.00   | Aporte familiar |                                                          |
| Aporte papá          | S/ 35.00    | Aporte familiar |                                                          |
| Techy                | S/ 27.40    | Otros Ingresos  | Amiga del trabajo; se lo prestó hace poco                |

Fecha sugerida: **29/09/2026**. Ese día Bryan registró en su cuenta el gasto "Entregado a Jacky" por S/ 2,800 (800 + 2,000), así que la fecha cuadra entre las dos cuentas.

> **Techy:** lo de Techy va como ingreso. Si más adelante Jacky le devuelve la plata, se registra como gasto ese día (por ejemplo, "Devolución a Techy"). No hace falta crear una deuda por S/ 27.40.

### Aportes proyectados (registrar recién cuando lleguen)

| Para pagar los recibos del | Bryan | Mamá |
| -------------------------- | ----- | ---- |
| 15/11                      | 900   | 300  |
| 15/12                      | 900   | 300  |

En la pestaña OCTUBRE los S/ 900 de Bryan aparecen como "PRESTAMO", pero van como ingreso en **Aporte familiar**: no se devuelven.

## 3. Gastos fijos (`/gastos`, recurrentes)

En setiembre todos están marcados **PAGADO**. Se registran con fecha de setiembre para que cuenten en ese mes y se repitan desde ahí.

| Descripción       | Monto         | Categoría | Método  | Frecuencia | Fecha sugerida |
| ----------------- | ------------- | --------- | ------- | ---------- | -------------- |
| Alquiler cuarto   | S/ 300.00     | Vivienda  | `debit` | `monthly`  | 18/09/2026     |
| Celular (plan)    | S/ 35.00      | Servicios | `debit` | `monthly`  | 21/09/2026     |
| ChatGPT           | S/ 20.00      | Servicios | `debit` | `monthly`  | 21/09/2026     |
| Spotify           | S/ 32.90      | Servicios | `debit` | `monthly`  | 30/09/2026     |
| **Total mensual** | **S/ 387.90** |           |         |            |                |

> **Fecha:** el celular y ChatGPT se pagan el **21** de cada mes, y Spotify el **30**. Spotify no está en el Excel; lo paga con débito. El alquiler se paga el día que cobra el sueldo; puse el 18, que fue la fecha de setiembre. Como la fecha del sueldo cambia cada mes, el alquiler va a aparecer el 18 aunque ese mes cobre otro día.
>
> **Método:** ChatGPT no aparece en la lista de consumos de las tarjetas, así que asumo que lo paga con débito. Si lo paga con tarjeta, hay que registrarlo con `credit` y la tarjeta correspondiente.
>
> **Juntas:** ya no van aquí. Las dos ya las cobró, así que lo que queda por pagar es una deuda con fecha de fin (sección 5). Un gasto recurrente seguiría apareciendo después de diciembre, porque la app no tiene fecha de fin para los recurrentes.

### Cuota de setiembre de las juntas (ya pagada)

La cuota 9/12 de setiembre se registra como gasto normal, para que cuente en ese mes:

| Descripción                    | Monto     | Fecha      | Categoría | Método  |
| ------------------------------ | --------- | ---------- | --------- | ------- |
| Junta Migraciones (cuota 9/12) | S/ 400.00 | 18/09/2026 | Juntas    | `debit` |
| Junta Shirly (cuota 9/12)      | S/ 200.00 | 18/09/2026 | Juntas    | `debit` |

### Gastos variables (no recurrentes)

| Descripción               | Monto     | Fecha      | Categoría         | Método  |
| ------------------------- | --------- | ---------- | ----------------- | ------- |
| Junta cumpleaños Tío Rafa | S/ 50.00  | 17/10/2026 | Juntas            | `debit` |
| Comida                    | S/ 200.00 | octubre    | Comida y delivery | `debit` |

La comida de S/ 200 solo aparece en la pestaña OCTUBRE. Lo mejor es registrar lo que gaste realmente, compra por compra, con "Registro rápido".

**Universidad:** se paga por temporadas, no todos los meses. Cada vez que toque pagar, se registra como gasto puntual en la categoría Educación. Si se paga con tarjeta, va como `credit` con la tarjeta que use. La del 31/08 ya está en la sección 4.4.

## 4. Tarjetas de crédito (`/tarjetas`)

Usa dos: la **Ripley**, que es suya, y la **SIP**, que **es de su papá** y ella usa de vez en cuando. Las dos vencen el **día 15**.

> En AGOSTO-P la tarjeta del papá aparece como "TARJETA OH" y desde SETIEMBRE como "TARJETA SIP". Es la misma tarjeta: la SIP la emite **Financiera OH**, igual que la de Bryan.

### Cómo manejar la tarjeta del papá

Lo que importa para las finanzas de Jacky no es la tarjeta, sino **lo que ella le debe pagar cada mes por sus propias compras**. Por eso:

**Recomendado: registrarla como tarjeta en su cuenta, pero solo con la parte de ella.**

- Nombre: **"SIP (papá)"**, para que quede claro que no es suya.
- Los **recibos** (4.2) llevan solo la suma de sus cuotas. Es lo que ya hace en el Excel: las listas de SIP tienen solo sus compras (maquillaje, vitaminas, universidad, etc.).
- `carriedBalance` (4.3) = solo sus cuotas pendientes. Los consumos del papá no se registran.
- `creditLimit`: **S/ 10,000**. Ojo: el "disponible" que muestre la app no descuenta lo que use su papá, así que el disponible real en el banco puede ser menor.
- Las compras nuevas que haga con esa tarjeta se registran como gasto `credit` con la tarjeta "SIP (papá)", igual que con la Ripley.
- Cuando pague el recibo, da igual si le paga al banco o le transfiere a su papá: en los dos casos se marca el recibo como pagado.

Así la SIP aparece en `/planificacion` el día 15 junto a la Ripley, y el dashboard muestra bien cuánto debe ella.

**Alternativa descartada: registrarlo como deuda con su papá (`Debt`).** No sirve porque el módulo de deudas espera una cuota fija y un número fijo de cuotas, y aquí el monto cambia cada mes y crece con cada compra nueva. Habría que editar la deuda cada mes.

> Si en algún momento el papá le pide a Jacky que pague consumos de él, eso no va en la tarjeta: se registra como gasto aparte ("Ayuda papá").

### 4.1 Crear las tarjetas

| Campo            | SIP (papá)                        | Ripley                    |
| ---------------- | --------------------------------- | ------------------------- |
| `name`           | SIP (papá)                        | Ripley                    |
| `bank`           | Financiera OH                     | Banco Ripley              |
| `lastDigits`     | 0908                              | 1782                      |
| `creditLimit`    | 10,000.00                         | 4,000.00                  |
| `billingDay`     | 18                                | 18                        |
| `paymentDay`     | 15                                | 15                        |
| `interestRate`   | 73.04 (igual que la SIP de Bryan) | dejar vacío si no se sabe |
| `carriedBalance` | ver 4.3 (solo lo de ella)         | ver 4.3                   |

Los días de corte y pago son los mismos de la SIP de Bryan: **corte el 18, pago el 15**. La SIP termina en **0908** y la Ripley en **1782**.

### 4.2 Recibos mensuales (`CreditCardStatement`) — lo más importante

Desde que existen los recibos, la app muestra como "monto a pagar" el **recibo pendiente más próximo**, no el cálculo por gastos. Estos montos salen directo del Excel:

| Vence      | SIP             | Ripley        | Total tarjetas | Pestaña del Excel |
| ---------- | --------------- | ------------- | -------------- | ----------------- |
| 15/10/2026 | **S/ 1,963.44** | **S/ 303.13** | S/ 2,266.57    | SETIEMBRE         |
| 15/11/2026 | S/ 1,102.09     | S/ 517.46     | S/ 1,619.55    | OCTUBRE           |
| 15/12/2026 | S/ 1,102.09     | S/ 450.45     | S/ 1,552.54    | NOVIEMBRE         |
| 15/01/2027 | S/ 1,072.07     | S/ 169.15     | S/ 1,241.22    | DICIEMBRE         |

Proyección para después de lo que cubre el Excel, a partir de las cuotas que siguen corriendo (incluye desgravamen; es estimado):

| Vence      | SIP (estimado) | Ripley (estimado) | Qué queda                                                                            |
| ---------- | -------------- | ----------------- | ------------------------------------------------------------------------------------ |
| 15/02/2027 | ~S/ 623.30     | ~S/ 118.70        | SIP: Chailom 9/12, Shampoos/Medicamentos/Maquillaje 6/6, Plaza Vea. Ripley: Saga 6/6 |
| 15/03/2027 | ~S/ 453.01     | —                 | Chailom 10/12 + Plaza Vea                                                            |
| 15/04/2027 | ~S/ 453.01     | —                 | Chailom 11/12 + Plaza Vea 6/6                                                        |
| 15/05/2027 | ~S/ 397.01     | —                 | Chailom 12/12 (última)                                                               |

Ninguno de estos recibos está pagado todavía. El del 15/10 se paga con lo que juntó en setiembre (ver sección 6).

### 4.3 Cuotas en curso y `carriedBalance`

`carriedBalance` es el saldo usado que **no** está registrado como gasto en la app: las cuotas de compras viejas. Lo mejor es poner el "saldo utilizado" que muestra la app del banco. Si no se tiene a mano, este es el estimado, sumando las cuotas que faltan desde el recibo del 15/10 (estos montos incluyen intereses, así que el saldo de capital del banco va a salir un poco menor):

**SIP — cuotas que faltan (desde el recibo 15/10):**

| Compra                            | Fecha | Total    | Cuota  | Va en (15/10) | Faltan | Pendiente    |
| --------------------------------- | ----- | -------- | ------ | ------------- | ------ | ------------ |
| Chailom Proyectos (pase a cuotas) | 24/04 | 3,695.00 | 392.01 | 5/12          | 8      | 3,136.08     |
| Audífonos                         | 20/06 | 299.00   | 119.22 | 3/3           | 1      | 119.22       |
| Vitaminas cabello                 | 26/06 | 500.00   | 107.72 | 3/6           | 4      | 430.88       |
| Vitaminas                         | 26/06 | 580.00   | 125.10 | 3/6           | 4      | 500.40       |
| Parches ojos                      | 27/06 | 196.50   | 42.24  | 3/6           | 4      | 168.96       |
| Skin nuevo                        | 26/06 | 289.80   | 62.43  | 3/6           | 4      | 249.72       |
| Maquillaje nuevo                  | 29/06 | 715.05   | 111.28 | 3/6           | 4      | 445.12       |
| Shampoos                          | 25/07 | 252.00   | 54.47  | 2/6           | 5      | 272.35       |
| Medicamentos ginecológicos        | 25/07 | 334.00   | 72.20  | 2/6           | 5      | 361.00       |
| Maquillaje nuevo                  | 27/07 | 202.65   | 43.62  | 2/6           | 5      | 218.10       |
| **Subtotal cuotas viejas**        |       |          |        |               |        | **5,901.83** |

**Ripley — cuotas que faltan (desde el recibo 15/10):**

| Compra                             | Fecha | Total    | Cuota  | Va en (15/10) | Faltan | Pendiente    |
| ---------------------------------- | ----- | -------- | ------ | ------------- | ------ | ------------ |
| Celular                            | 10/02 | 2,813.00 | 281.30 | 8/10          | 3      | 843.90       |
| Skin nuevo                         | 30/06 | 273.10   | 50.45  | 3/6           | 4      | 201.80       |
| Secadora                           | 02/08 | 189.00   | 67.01  | 2/3           | 2      | 134.02       |
| Saga cremas de cuerpo y delineador | 03/08 | 563.00   | 103.70 | 2/6           | 5      | 518.50       |
| Devolución (abono)                 | —     | —        | —      | 15/10         | —      | −214.33      |
| **Total**                          |       |          |        |               |        | **1,483.89** |

**Valores sugeridos:**

- **SIP** `carriedBalance` ≈ **S/ 5,901.83**, más las compras de agosto y setiembre de la tabla 4.4 si **no** se registran como gastos.
- **Ripley** `carriedBalance` ≈ **S/ 1,483.89**.

> No hay que crear una deuda (`Debt`) por el "pase a cuotas" de Chailom: sus cuotas ya están dentro de los recibos de la SIP y se contarían dos veces. Es el mismo criterio que se usó con el traslado de saldo de la SIP de Bryan.

### 4.4 Compras recientes con tarjeta (registrar como gasto `credit`)

Son compras nuevas del ciclo agosto–setiembre. Conviene registrarlas como gastos para que aparezcan en su historial y en las categorías. Si se registran, **no** se suman al `carriedBalance`.

| Fecha      | Descripción             | Monto  | Cuotas | Cuota | Tarjeta | Categoría          |
| ---------- | ----------------------- | ------ | ------ | ----- | ------- | ------------------ |
| 25/08/2026 | Mass (Cuasapi)          | 82.10  | 1      | —     | SIP     | Supermercado       |
| 31/08/2026 | Universidad             | 641.13 | 1      | —     | SIP     | Educación          |
| 06/09/2026 | Extractor (DigitalPerú) | 42.80  | 1      | —     | SIP     | Tecnología y hogar |
| 06/09/2026 | PedidosYa               | 32.10  | 1      | —     | SIP     | Comida y delivery  |
| 15/09/2026 | GithBeauty              | 79.45  | 3      | 30.02 | SIP     | Compras online     |
| 18/09/2026 | Plaza Vea               | 318.00 | 6      | 56.00 | SIP     | Supermercado       |

> Las compras de agosto (Mass y Universidad) caen fuera del ciclo actual. Igual se pueden registrar para tener el historial, marcadas como `isPaidOff` cuando se pague el recibo del 15/10.

## 5. Deudas (`/deudas`)

### Préstamo Tío Rafa (confirmado en el Excel)

| Campo               | Valor             |
| ------------------- | ----------------- |
| `name`              | Préstamo Tío Rafa |
| `creditor`          | Tío Rafa          |
| `totalAmount`       | 3,000.00          |
| `remainingAmount`   | 3,000.00          |
| `interestRate`      | 0                 |
| `monthlyPayment`    | 600.00            |
| `totalInstallments` | 5                 |
| `paymentDayOfMonth` | 6                 |
| `startDate`         | 06/09/2026        |

La app genera las cuotas automáticamente: **06/10, 06/11, 06/12, 06/01/2027 y 06/02/2027**, de S/ 600 cada una. El Excel solo llega hasta la cuota 4 (diciembre); la 5.ª cae en febrero de 2027.

### Juntas (ya cobradas, faltan las cuotas 10 a 12 de 12)

Ya recibió el pozo de las dos juntas, así que lo que le queda por pagar es en la práctica una deuda sin interés. Se cargan solo las 3 cuotas que faltan (la 9/12 de setiembre ya va como gasto en la sección 3):

| Campo               | Junta Migraciones                 | Junta Shirly                      |
| ------------------- | --------------------------------- | --------------------------------- |
| `name`              | Junta Migraciones                 | Junta Shirly                      |
| `creditor`          | Junta Migraciones                 | Shirly                            |
| `totalAmount`       | 1,200.00                          | 600.00                            |
| `remainingAmount`   | 1,200.00                          | 600.00                            |
| `interestRate`      | 0                                 | 0                                 |
| `monthlyPayment`    | 400.00                            | 200.00                            |
| `totalInstallments` | 3                                 | 3                                 |
| `paymentDayOfMonth` | 18                                | 18                                |
| `startDate`         | 18/09/2026                        | 18/09/2026                        |
| Notas               | Junta ya cobrada; cuotas 10–12/12 | Junta ya cobrada; cuotas 10–12/12 |

Las cuotas quedan el **18/10, 18/11 y 18/12**, y terminan en diciembre, que es justo donde termina el Excel. Desde enero 2027 se le liberan **S/ 600 al mes**.

> Puse el día 18 porque las paga con el sueldo. Si tienen un día fijo, se cambia `paymentDayOfMonth`.

Los "PRESTAMO" de Bryan (S/ 2,000 en setiembre y S/ 900 en octubre) **no** van aquí: no se devuelven, así que se registran como ingreso (sección 2).

## 6. Cómo se ve el flujo mes a mes (verificación del Excel)

Su ciclo: **con el sueldo del mes M paga lo que vence en M+1**: las tarjetas el día 15 y Tío Rafa el día 6. Los gastos fijos los paga en el mismo mes en que cobra.

| Pestaña | Ingreso     | Tarjetas | Fijos | Tío Rafa | Otros             | Total gastos | Resultado del mes               |
| ------- | ----------- | -------- | ----- | -------- | ----------------- | ------------ | ------------------------------- |
| SET     | 2,900       | 2,266.57 | 955   | 600      | 50 (junta cumpl.) | 3,871.57     | 🔴 −971.57                      |
| OCT     | 2,900 + 900 | 1,619.55 | 955   | 600      | 200 (comida)      | **3,374.55** | 🟢 **+425.45** (Excel: +625.45) |
| NOV     | 2,900       | 1,552.54 | 955   | 600      | —                 | 3,107.54     | 🔴 −207.54                      |
| DIC     | 3,200       | 1,241.22 | 955   | 600      | —                 | 2,796.22     | 🟢 +403.78                      |

"Fijos" (S/ 955) = alquiler, celular y ChatGPT (S/ 355) más las juntas (S/ 600). El Excel no incluye Spotify (S/ 32.90 al mes), así que cada resultado mensual baja S/ 32.90: setiembre −1,004.47, octubre +392.55, noviembre −240.44 y diciembre +370.88. En enero 2027, sin las juntas, los fijos bajan a S/ 387.90.

**Setiembre, con los aportes (cuadro "SALDO" del Excel):** juntó S/ 3,862.40 (500 que le quedaban del sueldo, 800 de Bryan, 500 de su mamá, 2,000 extra de Bryan, 35 de su papá y 27.40 de Techy) para pagar S/ 2,866.57 (SIP 1,963.44, Ripley 303.13 y Tío Rafa #1 600). Le quedan **S/ 995.83**, o **S/ 945.83** si se descuenta la junta de cumpleaños del 17/10, que no está en ese cuadro.

### Errores y detalles encontrados en el Excel

1. **OCTUBRE, el total no incluye la comida.** La suma de la celda E38 da 3,174.55, pero con la comida (S/ 200) el total es **3,374.55**. El saldo real del mes es **+425.45**, no +625.45.
2. **Plaza Vea, numeración de cuotas.** En OCTUBRE dice 1/6, en NOVIEMBRE 3/6 y en DICIEMBRE 4/6. Debería ser 1/6, **2/6 y 3/6**. El monto no cambia (S/ 56), pero la última cuota cae el **15/04/2027**, no en marzo.
3. **Fechas copiadas en "PENDIENTES POR PAGAR".** En las pestañas OCTUBRE y NOVIEMBRE las fechas dicen 15/10 y 06/10. Deberían decir 15/11 y 06/11 (OCTUBRE) y 15/12 y 06/12 (NOVIEMBRE). Los montos sí están bien.
4. **NOVIEMBRE, el cuadro de saldo** muestra "FALTA −47.46", pero en realidad **sobran** S/ 47.46: junta 2,200 y debe pagar 2,152.54.
5. **Ripley de setiembre:** los dos abonos (−99.43 y −114.90 = −214.33) compensan casi exactamente el cobro "NO SE PROCESÓ DEVOLUCIÓN DE COMPRA" de S/ 214.43 de agosto. Hay una diferencia de S/ 0.10.

Revisé todos los totales de tarjetas (SIP y Ripley, de set a dic) sumando cuota por cuota, y **coinciden con el Excel**.

## 7. Datos confirmados

Ya resuelto (30/09):

- La SIP es la tarjeta de su papá: Financiera OH, termina en 0908, línea de S/ 10,000.
- La Ripley termina en 1782 y tiene una línea de S/ 4,000.
- Las dos tarjetas tienen corte el 18 y pago el 15.
- Los S/ 2,000 y S/ 900 de Bryan y los S/ 27.40 de Techy van como ingreso.
- La universidad se paga por temporadas.
- Las juntas ya están cobradas y van en la cuota 9/12.
- El celular y ChatGPT se pagan el 21, Spotify el 30 y el alquiler el día que cobra.

- Spotify: S/ 32.90 con débito.

No queda nada pendiente: ya se puede cargar todo.

## Orden recomendado de carga

1. Arreglar el `type` de las categorías de ingreso (sección 0).
2. Crear las categorías de gasto y "Aporte familiar" (sección 1).
3. Crear el ingreso recurrente del sueldo, el aguinaldo y los aportes de setiembre (sección 2).
4. Crear los gastos fijos recurrentes y la cuota 9/12 de setiembre de las juntas (sección 3).
5. Crear las tarjetas "SIP (papá)" y Ripley (sección 4.1).
6. Cargar los 4 recibos de cada tarjeta, del 15/10 al 15/01 (sección 4.2).
7. Registrar las compras recientes con tarjeta y ajustar el `carriedBalance` (secciones 4.3 y 4.4).
8. Crear las deudas: préstamo de Tío Rafa, Junta Migraciones y Junta Shirly (sección 5).
9. Revisar `/planificacion` y el dashboard: el 06/10 debería mostrar la cuota 1 de Tío Rafa, el 15/10 S/ 2,266.57 en tarjetas y el 18/10 las juntas (S/ 600).
