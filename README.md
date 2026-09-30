# Caracol Derby

Aplicación web de apuestas **simuladas** en carreras de caracoles. Permite registrarse, iniciar sesión, consultar un
dashboard con estadísticas del día y recargar saldo a través de **SnailPay**, una pasarela de pagos simulada construida
en Express.

- **Frontend:** React 19 + TypeScript + Vite, Tailwind CSS 4, Recharts, React Router, React Hook Form + Zod.
- **Backend:** Express 5 + TypeScript, Zod, Helmet, CORS, express-rate-limit.
- **Persistencia:** LocalStorage (usuario, sesión, saldo e historial de recargas).
- **Pruebas:** Vitest, Testing Library y Supertest.

> Todos los datos (carreras, apuestas y tarjetas) son ficticios. SnailPay no procesa pagos reales.

## Requisitos

- Node.js **20.19 o superior** (probado con Node 24).
- npm 10 o superior.

## Instalación y ejecución

```bash
npm install
```

```bash
npm run dev
```

`npm run dev` levanta ambos servicios con `concurrently`:

| Servicio | URL |
|---|---|
| Frontend (Vite) | http://localhost:5173 |
| API / SnailPay (Express) | http://localhost:3001 |

En desarrollo el frontend llama a `/api/...` y Vite lo redirige al backend (proxy), por lo que no se requiere configurar CORS.

También se pueden ejecutar por separado, en dos terminales:

```bash
npm run dev -w backend
```

```bash
npm run dev -w frontend
```

### Variables de entorno (opcionales)

Los valores por defecto funcionan sin configurar nada. Para cambiarlos, copia los ejemplos:

- `backend/.env.example` → `backend/.env`: `PORT`, `CORS_ORIGIN`, `SNAILPAY_SIMULATE_OUTAGE`, `SNAILPAY_SLOW_RESPONSE_MS`, `RATE_LIMIT_PER_MINUTE`.
- `frontend/.env.example` → `frontend/.env`: `VITE_API_BASE_URL`, `VITE_SNAILPAY_TIMEOUT_MS`.

Si cambias el puerto del backend, arranca Vite con `VITE_API_PROXY_TARGET=http://localhost:<puerto>`.

### Build de producción

```bash
npm run build
```

Genera `backend/dist` y `frontend/dist`. En producción Express sirve también el frontend, así que basta con:

```bash
NODE_ENV=production npm start
```

y abrir http://localhost:3001 (API y aplicación en el mismo origen).

## Despliegue

La aplicación se despliega como **un solo servicio web Node en [Render](https://render.com)** usando el blueprint
[`render.yaml`](render.yaml):

1. En Render: **New → Blueprint** y seleccionar este repositorio.
2. Render ejecuta `npm ci --include=dev && npm run build` y luego `npm start`; el health check es `/api/health`.
3. Express sirve el API en `/api/*` y el build de React para cualquier otra ruta (fallback a `index.html` para
   React Router). Al ser el mismo origen no hace falta CORS ni configurar la URL del API.

Variables relevantes (ya definidas en el blueprint): `NODE_ENV=production`, `TRUST_PROXY=1` (el rate limit usa la IP
real detrás del balanceador) y `SNAILPAY_SIMULATE_OUTAGE` (cambiarla a `true` desde el panel de Render simula la
caída de SnailPay).

Limitaciones del plan gratuito: el servicio se suspende tras ~15 minutos sin tráfico y la primera visita puede tardar
alrededor de un minuto; al reiniciarse se pierde el almacén de idempotencia en memoria. Los datos de cada usuario
viven en el LocalStorage de su navegador, por lo que quien evalúa solo necesita registrarse en la app.

## Propuesta de base de datos

Cómo se conectaría la aplicación a PostgreSQL (entidades, relaciones y cambios en frontend y backend):
**[docs/BASE_DE_DATOS.md](docs/BASE_DE_DATOS.md)**.

## Pruebas

```bash
npm test
```

Ejecuta las pruebas del backend y del frontend. Por separado: `npm test -w backend` y `npm test -w frontend`.
Verificaciones estáticas: `npm run typecheck` y `npm run lint`.

| Área | Qué se prueba |
|---|---|
| Backend – API (Supertest) | Cada escenario de SnailPay (aprobado, rechazos, validación, 500, 503, 504), contrato de respuesta, idempotencia, rate limit, JSON mal formado, 404 y el servido del frontend en producción (fallback de la SPA). |
| Backend – unidades | Reglas de decisión, generación de respuestas, TTL del almacén de idempotencia, carga de configuración. |
| Frontend – servicios | Hash de contraseñas, registro/login/logout, bloqueo por intentos fallidos, expiración de sesión, datos corruptos en LocalStorage, saldo en centavos, no abonar dos veces la misma operación. |
| Frontend – cliente SnailPay | Aprobación, rechazo, error del sistema, respuesta no JSON, respuestas inconsistentes (monto/pagador/código), error de red, timeout y cancelación. |
| Frontend – simulación | 6 caracoles, 6 carreras, suma de victorias = 6, apuestas coherentes con los ganadores, determinismo. |
| Frontend – integración | Rutas protegidas, registro completo, recarga aprobada/rechazada/con error y persistencia tras recargar, cierre de sesión. |

## Funcionalidades

- **Registro** con nombre completo, correo, contraseña y confirmación (validaciones en tiempo real).
- **Inicio y cierre de sesión**; la sesión persiste al recargar y expira a las 8 horas.
- **Rutas protegidas:** el dashboard solo es accesible con sesión activa; login y registro redirigen al dashboard si ya hay sesión.
- **Dashboard:** nombre del usuario, saldo, indicadores del día, dona de apuestas ganadas/perdidas, barras de victorias por caracol, tabla de resultados por carrera e historial de recargas.
- **Recarga con SnailPay:** formulario con validaciones y formato automático, mensajes claros para cada resultado, timeout de 10 s y protección contra envíos dobles.
- Sincronización de sesión y saldo entre pestañas.

## SnailPay

La documentación completa del contrato y la forma de reproducir cada respuesta está en
**[docs/SNAILPAY.md](docs/SNAILPAY.md)**. Resumen:

| Tarjeta | Resultado |
|---|---|
| `1234 1234 1234 1234`, vence `12/26`, CVV `543` | Aprobado (201, `accredited`) |
| La misma tarjeta con otro CVV / otra fecha / monto > 10,000 | Rechazado (402) |
| `4000 0000 0000 0002` / `0069` / `0119` | Fondos insuficientes / tarjeta deshabilitada / fraude (402) |
| `9999 9999 9999 9999` | Error interno (500) |
| `4444 4444 4444 4444` | Sin respuesta a tiempo (el frontend aborta a los 10 s) |
| Backend con `SNAILPAY_SIMULATE_OUTAGE=true` | Servicio no disponible (503) para cualquier tarjeta |

En el formulario de recarga hay un panel “Datos de prueba” con estas tarjetas y un botón para autocompletar la aprobada.

## Estructura

```
.
├── backend/
│   ├── src/
│   │   ├── config/env.ts              # Variables de entorno validadas con Zod
│   │   ├── middleware/                # Logger (sin cuerpos), errores y servido de la SPA
│   │   ├── modules/snailpay/          # Router, reglas, esquemas, escenarios, idempotencia
│   │   ├── app.ts                     # createApp(config): Helmet, CORS, rutas
│   │   └── index.ts                   # Arranque del servidor
│   └── tests/                         # Pruebas de API y unitarias
├── frontend/
│   └── src/
│       ├── components/                # UI reutilizable (Button, TextField, Modal, Alert, Card)
│       ├── features/
│       │   ├── auth/                  # Registro, login, sesión, contexto y páginas
│       │   ├── dashboard/             # Página y componentes del dashboard / gráficas
│       │   ├── races/                 # Caracoles y simulación de la jornada
│       │   ├── snailpay/              # Cliente HTTP, mensajes, formulario de recarga
│       │   └── wallet/                # Saldo e historial en LocalStorage
│       ├── lib/                       # Storage tipado, hash, dinero, PRNG con semilla
│       ├── routes/                    # Rutas públicas y protegidas
│       └── test/                      # Configuración y utilidades de pruebas
├── docs/
│   ├── SNAILPAY.md                    # Contrato del API y escenarios
│   └── BASE_DE_DATOS.md               # Propuesta de base de datos
└── render.yaml                        # Blueprint de despliegue en Render
```

## Decisiones técnicas

### Contraseñas y sesión

- La contraseña **nunca se guarda en texto plano**. Se deriva con **PBKDF2-HMAC-SHA256** (Web Crypto API), sal
  aleatoria de 16 bytes por usuario y 600,000 iteraciones (recomendación OWASP). Se guarda
  `{ algorithm, iterations, salt, hash }` para poder migrar el algoritmo en el futuro.
- La verificación compara en tiempo constante. Si el correo no existe se calcula un hash igualmente, para no
  revelar por tiempo de respuesta qué correos están registrados, y el mensaje de error es genérico.
- Tras 5 intentos fallidos el inicio de sesión se bloquea 60 segundos.
- La sesión guarda `userId`, un token aleatorio de 32 bytes y la fecha de expiración (8 h). Nunca contiene la contraseña.
- **Limitación conocida:** al ser una simulación 100 % local, cualquier script con acceso al origen puede leer o
  modificar LocalStorage. En un sistema real la autenticación y el saldo vivirían en el servidor (hash con
  Argon2id/bcrypt, cookie `HttpOnly` + `Secure` + `SameSite`), y el cliente nunca decidiría su propio saldo.

### LocalStorage

| Llave | Contenido |
|---|---|
| `caracolDerby:users` | Usuarios por correo normalizado (id, nombre, correo, hash de contraseña, fecha de alta). |
| `caracolDerby:session` | Sesión activa. |
| `caracolDerby:wallet:<userId>` | Saldo en centavos e historial de recargas (incluye la respuesta completa de SnailPay con tarjeta y CVV ficticios, como pide el requerimiento). |
| `caracolDerby:loginThrottle` | Intentos fallidos por correo. |

Todo lo que se lee de LocalStorage se valida con Zod; si está corrupto o manipulado se ignora en lugar de romper la app.
Saldo e historial se escriben en una sola operación para que no se desincronicen.

### Saldo y pagos

- El saldo se maneja en **centavos enteros** para evitar errores de punto flotante.
- Solo se abona una respuesta aprobada **coherente** (HTTP 201, `accredited`, código de autorización, mismo monto
  y mismo pagador); cualquier otra cosa no modifica el saldo. Una misma operación no se abona dos veces.
- Cada recarga envía una `Idempotency-Key`. Si hay timeout o error de red y el usuario reintenta con los mismos
  datos, se reutiliza la llave para que el servidor no pueda cobrar dos veces.
- El botón de pago se deshabilita mientras hay una solicitud en curso y el diálogo no se puede cerrar a medias.
- El backend nunca registra cuerpos de solicitud (contienen datos de tarjeta), limita el tamaño del JSON (10 KB),
  rechaza campos no esperados, aplica rate limit y usa Helmet y CORS restringido.

### Datos simulados

- **Carreras:** 6 caracoles con una habilidad base; en cada una de las 6 carreras del día el tiempo de cada caracol
  depende de su habilidad y de una variación aleatoria (±20 %). Gana el menor tiempo. La gráfica de barras cuenta
  las victorias, por lo que siempre suman 6.
- **Apuestas:** en cada carrera el usuario apuesta a 1 o 2 caracoles distintos; una apuesta se gana solo si ese
  caracol ganó la carrera. La dona resume esas apuestas.
- Se usa un generador pseudoaleatorio **con semilla** (fecha, y fecha + usuario para las apuestas): los datos no
  cambian al recargar, las carreras son iguales para todos los usuarios y cambian cada día. Las apuestas simuladas
  no afectan el saldo.

## Problemas conocidos / límites

- Autenticación y saldo son locales por diseño del ejercicio (ver “Contraseñas y sesión”).
- El almacén de idempotencia de SnailPay vive en memoria: se pierde al reiniciar el backend.
- La fecha de vencimiento no se compara contra la fecha actual (para que `12/26` siga funcionando).
- Si el procesador responde después del timeout del cliente, el cliente no conoce el resultado final; en este mock
  la tarjeta de timeout nunca aprueba, y en un sistema real se consultaría el estado de la operación por su llave.
- La interfaz está en español y no tiene modo oscuro.
