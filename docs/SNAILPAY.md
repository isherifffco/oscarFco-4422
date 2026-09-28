# SnailPay: pasarela de pagos simulada

SnailPay es un **mock** implementado en Express (`backend/src/modules/snailpay`). No se conecta con ningún
procesador real ni procesa información financiera real: todos los datos de tarjeta son ficticios.

- URL base (desarrollo): `http://localhost:3001/api/snailpay`
- Desde el frontend se consume a través del proxy de Vite: `/api/snailpay`

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/snailpay/charges` | Crea un cobro (recarga de saldo). |
| `GET` | `/api/snailpay/health` | `200 {"status":"ok"}` o `503 {"status":"unavailable"}` si la caída está simulada. |

## Solicitud: `POST /api/snailpay/charges`

Encabezados:

| Encabezado | Obligatorio | Descripción |
|---|---|---|
| `Content-Type: application/json` | Sí | Cuerpo JSON (máximo 10 KB). |
| `Idempotency-Key` | Recomendado | 8 a 64 caracteres `[A-Za-z0-9_-]`. Reintentar con la misma llave y el mismo cuerpo devuelve la respuesta original (encabezado `Idempotent-Replayed: true`) en lugar de cobrar dos veces. El frontend siempre lo envía. |

Cuerpo (se rechazan campos adicionales):

| Campo | Tipo | Regla |
|---|---|---|
| `card_number` | string | Exactamente 16 dígitos, sin espacios. |
| `expiration_date` | string | `MM/AA` con mes 01-12. No se compara contra la fecha actual para que los datos de prueba (`12/26`) sigan funcionando después de 2026. |
| `cvv` | string | Exactamente 3 dígitos. |
| `holder_name` | string | Nombre completo, no vacío, máximo 100 caracteres. |
| `transaction_amount` | number | Mayor que 0, máximo 2 decimales, hasta 1,000,000 (formato). |
| `payer.id` | string | Identificador del usuario registrado (UUID generado en el registro). |
| `payer.email` | string | Correo del usuario registrado. |

```json
{
  "card_number": "1234123412341234",
  "expiration_date": "12/26",
  "cvv": "543",
  "holder_name": "Ana Pérez López",
  "transaction_amount": 250.5,
  "payer": { "id": "d47b2a83-8fc3-48ec-89c1-ac2cd90dba2a", "email": "ana@example.com" }
}
```

## Respuesta

Todas las respuestas de cobro (éxito, rechazo, error de validación y error del sistema) tienen la misma forma:

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | string | Identificador de la operación: `chg_<uuid v4>`. |
| `status` | `approved` \| `rejected` \| `error` | Estado general. `rejected` = la operación no se aprobó por los datos o reglas de negocio; `error` = falla de SnailPay. |
| `status_detail` | string | Motivo específico (ver tabla de escenarios). |
| `transaction_amount` | number \| null | Monto solicitado (null si el enviado no era válido). |
| `currency_id` | `MXN` | Moneda. |
| `date_created` | string | Fecha ISO 8601 en UTC. |
| `authorization_code` | string \| null | 6 caracteres alfanuméricos. **Solo** existe cuando `status = approved`. |
| `reference` | string | `SNP-AAAAMMDD-XXXXXX`. Se genera siempre para rastrear el intento. |
| `payer_id` | string \| null | Identificador del usuario. |
| `payer_email` | string \| null | Correo del usuario. |
| `card` | object \| null | `{ number, cvv, expiration_date, holder_name }`. Se incluye por requerimiento del ejercicio (datos siempre ficticios). Es `null` cuando la solicitud es inválida. |
| `errors` | array (opcional) | Solo en `invalid_request`: `[{ "field": "cvv", "message": "..." }]`. |

Ejemplo de cobro aprobado (`201 Created`):

```json
{
  "id": "chg_1b0c7f1e-4d0a-4a53-9a55-2d3c7e9f4b21",
  "status": "approved",
  "status_detail": "accredited",
  "transaction_amount": 250.5,
  "currency_id": "MXN",
  "date_created": "2026-09-28T20:29:14.512Z",
  "authorization_code": "HTVHKL",
  "reference": "SNP-20260928-7F9ZPW",
  "payer_id": "d47b2a83-8fc3-48ec-89c1-ac2cd90dba2a",
  "payer_email": "ana@example.com",
  "card": { "number": "1234123412341234", "cvv": "543", "expiration_date": "12/26", "holder_name": "Ana Pérez López" }
}
```

## Escenarios y cómo reproducirlos

Salvo que se indique otra cosa: vencimiento `12/26`, CVV `543`, cualquier nombre no vacío y monto entre 0.01 y 10,000.

### Cobro exitoso

| Tarjeta | Vencimiento | CVV | Monto | HTTP | `status` | `status_detail` |
|---|---|---|---|---|---|---|
| `1234123412341234` | `12/26` | `543` | 0.01 – 10,000 | 201 | `approved` | `accredited` |

### Errores de transacción (el saldo no cambia)

| Cómo provocarlo | HTTP | `status` | `status_detail` | Mensaje al usuario |
|---|---|---|---|---|
| Tarjeta `1234123412341234` con CVV distinto de `543` | 402 | `rejected` | `cc_rejected_bad_filled_security_code` | El CVV no es correcto. |
| Tarjeta `1234123412341234` con vencimiento distinto de `12/26` | 402 | `rejected` | `cc_rejected_bad_filled_date` | La fecha de vencimiento no coincide. |
| Tarjeta `1234123412341234` con monto mayor a 10,000 | 402 | `rejected` | `cc_rejected_max_amount` | El monto supera el máximo por recarga. |
| Tarjeta `4000000000000002` | 402 | `rejected` | `cc_rejected_insufficient_amount` | Fondos insuficientes. |
| Tarjeta `4000000000000069` | 402 | `rejected` | `cc_rejected_card_disabled` | Tarjeta deshabilitada. |
| Tarjeta `4000000000000119` | 402 | `rejected` | `cc_rejected_high_risk` | Rechazo por prevención de fraude. |
| Cualquier otra tarjeta de 16 dígitos | 402 | `rejected` | `cc_rejected_unknown_card` | No reconocemos la tarjeta. |
| Datos con formato inválido (p. ej. CVV de 2 dígitos, monto 0, JSON mal formado) | 400 | `rejected` | `invalid_request` + `errors[]` | Lista de campos inválidos. |
| Misma `Idempotency-Key` con un cuerpo distinto | 409 | `rejected` | `idempotency_key_conflict` | Vuelve a intentarlo. |
| Misma `Idempotency-Key` mientras la primera solicitud sigue en proceso | 409 | `rejected` | `request_in_progress` | Espera unos segundos. |
| Más de `RATE_LIMIT_PER_MINUTE` (30) solicitudes por minuto e IP | 429 | `error` | `too_many_requests` | Espera un minuto. |

> En el frontend, el formulario valida el formato antes de enviar; para ver un `invalid_request` usa `curl`.

### Errores del sistema (nunca se aprueba ni se aplica la recarga)

| Cómo provocarlo | HTTP | `status` | `status_detail` |
|---|---|---|---|
| **Caída total:** iniciar el backend con `SNAILPAY_SIMULATE_OUTAGE=true` (todas las solicitudes, incluso con la tarjeta válida) | 503 | `error` | `service_unavailable` |
| **Falla puntual:** tarjeta `9999999999999999` | 500 | `error` | `internal_error` |
| **Procesador lento:** tarjeta `4444444444444444`. El servidor espera `SNAILPAY_SLOW_RESPONSE_MS` (15 s) y responde 504. El frontend aborta a los 10 s (`VITE_SNAILPAY_TIMEOUT_MS`) y muestra “SnailPay no respondió a tiempo”. | 504 | `error` | `processor_timeout` |
| Backend apagado o sin red | — | — | El frontend muestra “No pudimos conectar con SnailPay”. |

Activar la caída total:

```bash
SNAILPAY_SIMULATE_OUTAGE=true npm run dev -w backend
```

En PowerShell:

```powershell
$env:SNAILPAY_SIMULATE_OUTAGE="true"; npm run dev -w backend
```

También se puede escribir `SNAILPAY_SIMULATE_OUTAGE=true` en `backend/.env` (ver `backend/.env.example`) y reiniciar el backend.
Para verificarla: `GET /api/snailpay/health` responde `503`.

## Cómo decide el frontend si aplica una recarga

El saldo solo aumenta cuando **todas** estas condiciones se cumplen; cualquier otra respuesta se registra en el
historial pero no modifica el saldo (evita falsos cobros exitosos):

1. HTTP `201`, `status = approved` y `status_detail = accredited`.
2. `authorization_code` presente.
3. `transaction_amount`, `payer_id` y `payer_email` coinciden con lo enviado.
4. La respuesta cumple el esquema (validado con Zod).
5. Esa operación (`id`) no se había abonado antes.

## Ejemplos con curl

```bash
curl -i -X POST http://localhost:3001/api/snailpay/charges \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: demo-approved-0001" \
  -d '{"card_number":"1234123412341234","expiration_date":"12/26","cvv":"543","holder_name":"Ana Perez","transaction_amount":100,"payer":{"id":"user-1","email":"ana@example.com"}}'
```

```bash
curl -i -X POST http://localhost:3001/api/snailpay/charges \
  -H "Content-Type: application/json" \
  -d '{"card_number":"4000000000000002","expiration_date":"12/26","cvv":"543","holder_name":"Ana Perez","transaction_amount":100,"payer":{"id":"user-1","email":"ana@example.com"}}'
```

```bash
curl -i -X POST http://localhost:3001/api/snailpay/charges \
  -H "Content-Type: application/json" \
  -d '{"card_number":"12","expiration_date":"13/26","cvv":"5","holder_name":"","transaction_amount":0,"payer":{"id":"user-1","email":"ana@example.com"}}'
```

```bash
curl -i -X POST http://localhost:3001/api/snailpay/charges \
  -H "Content-Type: application/json" \
  -d '{"card_number":"9999999999999999","expiration_date":"12/26","cvv":"543","holder_name":"Ana Perez","transaction_amount":100,"payer":{"id":"user-1","email":"ana@example.com"}}'
```
