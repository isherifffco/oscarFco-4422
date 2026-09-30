# Propuesta de base de datos

Hoy toda la información vive en LocalStorage y el cliente decide su propio saldo. Con una base de datos, el
**servidor pasa a ser la fuente de verdad** de usuarios, sesiones, saldo y pagos; el navegador solo muestra datos.

## Tecnología

- **PostgreSQL** (servicio administrado como Neon, Supabase o Render Postgres): relacional, transacciones ACID
  (indispensables para dinero), llaves foráneas, restricciones `CHECK`/`UNIQUE` y tipo `jsonb`.
- **Prisma** (o Drizzle) como ORM tipado en TypeScript, con migraciones versionadas en el repositorio.
- Cadena de conexión en la variable de entorno `DATABASE_URL`; pruebas contra una base efímera (Testcontainers).

## Entidades

| Tabla | Campos principales | Notas |
|---|---|---|
| `users` | `id` (uuid, PK), `full_name`, `email` (único, en minúsculas), `password_hash`, `created_at` | Hash con Argon2id en el servidor. |
| `sessions` | `id` (PK), `user_id` (FK), `token_hash`, `expires_at`, `revoked_at` | Se guarda el hash del token; el token viaja en cookie `HttpOnly`, `Secure`, `SameSite=Lax`. |
| `wallets` | `user_id` (PK y FK), `balance_cents` (`bigint`, `CHECK >= 0`), `currency`, `updated_at` | Saldo actual en centavos. |
| `payments` | `id` (PK, id de SnailPay), `user_id` (FK), `idempotency_key`, `amount_cents`, `status`, `status_detail`, `authorization_code`, `reference`, `card_last4`, `created_at` | `UNIQUE (user_id, idempotency_key)`. Un intento por fila, aprobado o no. |
| `wallet_movements` | `id` (PK), `user_id` (FK), `payment_id` (FK, nulo), `bet_id` (FK, nulo), `type` (`top_up`, `bet`, `payout`), `amount_cents` (con signo), `balance_after_cents`, `created_at` | Libro contable inmutable: explica cada cambio del saldo. `UNIQUE (payment_id)` impide abonar dos veces un pago. |
| `snails` | `id` (PK), `name`, `speed_rating` | Catálogo de los 6 caracoles. |
| `races` | `id` (PK), `race_date`, `number` (1-6), `starts_at`, `winner_snail_id` (FK) | `UNIQUE (race_date, number)`. |
| `race_results` | `race_id` (FK), `snail_id` (FK), `position`, `time_ms` | PK compuesta `(race_id, snail_id)`; `UNIQUE (race_id, position)`. |
| `bets` | `id` (PK), `user_id` (FK), `race_id` (FK), `snail_id` (FK), `amount_cents`, `status` (`pending`, `won`, `lost`), `payout_cents`, `created_at` | Las apuestas ganadas o perdidas salen de aquí. |

## Relaciones

- `users` 1–1 `wallets`; `users` 1–N `sessions`, `payments`, `wallet_movements` y `bets`.
- `payments` 1–0..1 `wallet_movements` (solo los aprobados generan un movimiento).
- `races` 1–N `race_results` N–1 `snails`; `races` 1–N `bets` N–1 `snails`.
- Las gráficas del dashboard se vuelven consultas: victorias = `COUNT(*)` de `races` agrupado por `winner_snail_id`
  en el día; apuestas ganadas/perdidas = `COUNT(*)` de `bets` del usuario agrupado por `status`.

## Reglas clave

- **Recarga atómica:** en una sola transacción se inserta el `payment`, el `wallet_movement` y se actualiza
  `wallets.balance_cents`. Si algo falla no se aplica nada.
- **Nunca guardar número completo de tarjeta ni CVV** (norma PCI DSS); solo los últimos 4 dígitos. El requisito
  del ejercicio de guardarlos existe únicamente porque son datos ficticios.
- La llave de idempotencia única evita cobros duplicados aunque el cliente reintente.

## Cambios necesarios

**Backend**

- Módulo `auth`: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`,
  con Argon2id, cookie de sesión y bloqueo por intentos (tabla o Redis).
- Módulo `wallet`: `GET /api/wallet` (saldo) y `GET /api/wallet/movements` (historial).
- `POST /api/wallet/top-ups`: el backend llama a SnailPay de servidor a servidor y, si aprueba, abona en la
  transacción descrita. El cliente ya no envía `payer_id`: se toma de la sesión.
- `GET /api/dashboard`: estadísticas del día desde la base de datos; un proceso programado genera las carreras.
- Capa de repositorios (acceso a datos) separada de las rutas, middleware de autenticación y protección CSRF.

**Frontend**

- Sustituir `authService` y `walletService` (LocalStorage) por clientes HTTP con la **misma interfaz**, por lo que
  páginas y componentes casi no cambian; eliminar el hash de contraseñas del navegador.
- Usar TanStack Query para cargar y refrescar saldo, historial y estadísticas.
- LocalStorage queda solo para preferencias de interfaz; la sesión la maneja la cookie `HttpOnly`.
