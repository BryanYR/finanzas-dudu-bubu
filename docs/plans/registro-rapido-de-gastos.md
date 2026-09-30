# Registro rápido de gastos

## Problema

Registrar un gasto hoy exige abrir el navegador, entrar a `/gastos`, abrir el modal `ExpenseFormModal` y llenar 6–8 campos (monto, fecha, descripción, categoría, método, tarjeta, cuotas, recurrente, notas). En el momento del pago eso es demasiado lento, así que los gastos se registran tarde o se olvidan — sobre todo los consumos con tarjeta de crédito, que luego descuadran el recibo.

Usuarios actuales: 2 (Bryan en Samsung/Android, su esposa en iPhone). App desplegada en Vercel.

## Objetivo

1. Registrar un gasto en **≤ 5 segundos** desde el celular.
2. Que los gastos con tarjeta **entren solos** (desde los correos del banco) y solo haya que confirmarlos.
3. Dejar una arquitectura con **un único punto de entrada** para gastos, de modo que agregar canales (Telegram, WhatsApp, correo, atajos) no duplique lógica — base para una eventual versión comercial en Perú.

## Descartado (por ahora)

- **Google Forms**: segunda fuente de datos, requiere Apps Script para sincronizar, no conoce categorías/tarjetas/cuotas. No es más rápido que un formulario propio.
- **WhatsApp para 2 usuarios**: la Cloud API de Meta exige verificación de negocio, número dedicado y plantillas aprobadas; las librerías no oficiales (Baileys, whatsapp-web.js) necesitan un proceso persistente (no corren en Vercel serverless) y arriesgan baneo del número. Se retoma en la fase 5.

---

## Fase 1 — PWA + pantalla de registro rápido

### 1.1 Instalable en ambos teléfonos

- `public/manifest.webmanifest` con `display: standalone`, `start_url: /`, `theme_color`, iconos 192/512 (`any` y `maskable`) y **`shortcuts`** → "Registrar gasto" (`/gastos/rapido`).
- `app.head` en `nuxt.config.ts`: `<link rel="manifest">`, `theme-color`, `apple-touch-icon` (180×180), `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `apple-mobile-web-app-title`, `viewport-fit=cover` para safe areas.
- Sin service worker en esta fase: Chrome ya no lo exige para instalar y iOS nunca lo exigió. Evita problemas de caché con SSR + cookie de sesión. Se evalúa `@vite-pwa/nuxt` en 1.4.

Diferencias por plataforma:

|                         | Android (Samsung)                                                                | iPhone                                                                                                                                                      |
| ----------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Instalar                | Chrome/Samsung Internet → menú → "Instalar app" / "Agregar a pantalla de inicio" | **Solo Safari** → Compartir → "Agregar a pantalla de inicio"                                                                                                |
| Atajo "Registrar gasto" | Mantener presionado el ícono → aparece el shortcut del manifest                  | No soporta `shortcuts`; se usa el botón "+" de la barra inferior. Opcional: agregar una segunda entrada a la pantalla de inicio estando en `/gastos/rapido` |
| Sesión                  | Comparte cookies con Chrome                                                      | La app instalada tiene **su propio almacén de cookies** → hay que iniciar sesión una vez dentro de la app                                                   |

### 1.2 Sesión que no estorbe

- Cookie `token`: `sameSite: 'strict'` → `'lax'`. Con `strict`, algunos lanzamientos desde el ícono (sobre todo iOS standalone) llegan sin cookie y mandan a `/login`. `lax` sigue bloqueando POST cross-site (protección CSRF equivalente para esta app, que no tiene GET con efectos).
- Duración 7 d → 30 d (JWT y `maxAge`). Con 2 usuarios conocidos el riesgo es bajo y evita re-login semanal. Para la versión comercial se reemplaza por refresh tokens (fase 5).

### 1.3 Página `/gastos/rapido`

Formulario mínimo, pensado para una mano:

- **Monto** grande con teclado numérico (`inputmode="decimal"`), autofocus.
- **Categoría**: chips con las categorías de gasto ordenadas por uso en los últimos 90 días (las 8 más usadas visibles, "Más…" despliega el resto).
- **Medio de pago**: chips Efectivo / Débito / cada tarjeta de crédito activa (un toque = método + tarjeta). Se recuerda el último usado (localStorage, por dispositivo).
- **Descripción** opcional; si se deja vacía se guarda el nombre de la categoría (el backend exige `description`).
- Fecha = hoy (Lima). Botón "Ayer" y selector de fecha plegado.
- Cuotas: solo si el medio es tarjeta; plegado, por defecto 1. El cálculo de interés se extrae de `ExpenseFormModal` a `app/utils/installmentCost.ts` para reutilizarlo.
- Al guardar: toast "✓ S/ 45.00 · Comida · BCP", el formulario se limpia y queda listo para el siguiente. Enlace "Deshacer" (DELETE) durante unos segundos.
- Reutiliza `POST /api/expenses` tal cual — sin cambios de backend.

Acceso:

- Botón "+" central en la barra inferior móvil del layout (`app/layouts/default.vue`) → `/gastos/rapido`.
- Botón "Registro rápido" en `/gastos`.

### 1.4 (Opcional) Offline

Service worker con `@vite-pwa/nuxt` que cachee el shell de `/gastos/rapido`, y una cola en IndexedDB para POST fallidos que se reintenta al volver la conexión. Útil en el metro / sótanos; se hace solo si la fase 1 se usa de verdad.

---

## Fase 2 — Tokens de API + servicio único de ingesta

Requisito para todo canal que no sea el navegador (bots, webhooks, atajos).

- Modelo `ApiToken { id, userId, name, tokenHash, lastUsedAt, revokedAt, createdAt }`. Se guarda el hash SHA-256; el token en claro se muestra una sola vez.
- `server/utils/auth.ts`: `requireUser` acepta también `Authorization: Bearer <token>`.
- Pantalla en ajustes para crear/revocar tokens.
- `server/services/expenseIngestService.ts`: recibe `{ source, rawText?, amount?, merchant?, cardHint?, date?, userId }`, resuelve categoría/tarjeta con reglas y crea un `Expense` confirmado o un **gasto pendiente**.
- Modelo `ExpenseDraft` (o `Expense.status = 'pending'`, decidir en la fase) + bandeja "Por confirmar" en `/gastos`.
- Reglas de categorización por usuario: `CategoryRule { keyword → categoryId }`, alimentadas automáticamente cuando el usuario corrige una categoría.

**Atajos del celular** (bonus de esta fase): Atajos de iOS y HTTP Shortcuts/MacroDroid en Android llaman a `POST /api/ingest` con el token.

## Fase 3 — Bot de Telegram

- `server/api/bot/telegram.post.ts` (webhook, validado con `X-Telegram-Bot-Api-Secret-Token`).
- Vinculación: `/start <código>` generado en la app → guarda `telegramChatId` en `User`. Mensajes de chats no vinculados se ignoran.
- Mensaje `45 almuerzo bcp` → `expenseIngestService` → respuesta con botones inline: Deshacer / Cambiar categoría / Cuotas.
- Parser: regex (monto + palabras clave + alias de tarjeta). LLM (Claude Haiku) solo como respaldo si el regex no encuentra categoría.

## Fase 4 — Correos de consumo del banco → pendientes

- Gmail: filtro por remitente (BCP, Interbank, BBVA, Scotiabank, CMR/Falabella, Ripley, Diners…) → reenvío a una dirección de entrada (Cloudflare Email Routing + Worker, o Postmark Inbound).
- `server/api/ingest/email.post.ts` con secreto compartido → parser por banco (`server/services/bankParsers/<banco>.ts`) → `ExpenseDraft` con monto, comercio, fecha y tarjeta (por últimos 4 dígitos).
- Deduplicación por (tarjeta, monto, fecha/hora, comercio) para no duplicar con lo que se registró a mano.
- Yape/Plin en Android: MacroDroid lee la notificación y llama a `/api/ingest`. En iPhone no hay acceso a notificaciones; se cubre con el correo de Yape si llega, o registro rápido.

## Fase 5 — Versión comercial (Perú)

- **WhatsApp Cloud API** (directo con Meta o vía BSP: Twilio, 360dialog). Las conversaciones iniciadas por el usuario dentro de la ventana de 24 h no tienen costo; los recordatorios salientes usan plantillas pagadas. Es solo otro adaptador sobre `expenseIngestService`.
- **Hogares**: modelo `Household` + `HouseholdMember`; los datos pasan de `userId` a `householdId` (con `createdById` para auditoría). Diseñar antes de tener clientes: es la migración más cara.
- **Auth**: refresh tokens / sesiones revocables, recuperación de contraseña, verificación de correo.
- **Infra**: rate limit en Upstash Redis (el actual es en memoria y no sirve en serverless multi-instancia), cola para webhooks (QStash / Vercel Queues), monitoreo (Sentry).
- **Cobro**: Culqi o Mercado Pago (Yape y tarjetas locales), plan free vs. premium (ingesta automática como diferenciador).
- **Legal**: política de privacidad y registro de bancos de datos según Ley 29733 (Protección de Datos Personales) y su reglamento.
- Biblioteca de parsers de bancos peruanos como ventaja frente a apps genéricas.

---

## Orden y alcance

| Fase                            | Esfuerzo                     | Cambios de schema     |
| ------------------------------- | ---------------------------- | --------------------- |
| 1 PWA + registro rápido         | 1 fin de semana              | No                    |
| 2 Tokens + ingesta + pendientes | 2–3 días                     | Sí                    |
| 3 Telegram                      | 1 día                        | `User.telegramChatId` |
| 4 Correos del banco             | 2–4 días (depende de bancos) | No (usa fase 2)       |
| 5 Comercial                     | semanas                      | Sí (hogares)          |
