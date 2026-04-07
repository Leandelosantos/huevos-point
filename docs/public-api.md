# Huevos Point — Public Read-Only API (`/api/public/v1`)

API REST de solo lectura diseñada para que **sistemas satélites** (ERPs externos, dashboards de BI, integraciones contables, mobile apps internas, etc.) consuman información alojada en Huevos Point de forma segura y performante.

> **Versión:** v1
> **Base URL:** `https://huevos-point-gcbg.vercel.app/api/public/v1`
> **Autenticación:** API Key (header `Authorization: Bearer <key>` o `x-api-key: <key>`)
> **Formato:** JSON
> **Solo lectura:** No expone endpoints de escritura. Para operar sobre la BD usá el panel principal.

---

## 1. Modelo de seguridad

### 1.1 API Keys

- Cada satélite recibe **una API key** generada desde el endpoint admin (`POST /api/admin/api-keys`).
- La clave **se muestra exactamente una vez** al momento de crearla. Solo se persiste su SHA-256.
- Cada clave está limitada a uno de dos scopes de aislamiento:
  - **Business scope** (`business_id`): permite ver datos de **todas las sucursales** que pertenecen a ese negocio.
  - **Tenant scope** (`tenant_id`): permite ver datos de **una única sucursal**.
- Cada clave tiene una lista de **scopes funcionales**:
  - `read:all` → wildcard
  - `read:tenants`
  - `read:products`
  - `read:sales`
  - `read:expenses`
  - `read:purchases`
  - `read:metrics`
- Cada clave tiene su propio **rate limit por minuto** (default: 60 req/min) y opcionalmente una fecha de expiración.

### 1.2 Rate limiting

Hay **dos capas** de límites combinadas:

| Capa | Ámbito | Default |
|------|--------|---------|
| IP-level (express-rate-limit) | por IP, sobre toda la API pública | 120 req/min |
| Per-key (sliding window) | por API key | 60 req/min (configurable por clave) |

Cuando se excede cualquiera de las dos, la respuesta es `429 Too Many Requests`.

### 1.3 Headers requeridos

```http
Authorization: Bearer hp_live_xxxxxxxxxxxxxxxxxxxxxxxxxxx
Accept: application/json
```

O bien:

```http
x-api-key: hp_live_xxxxxxxxxxxxxxxxxxxxxxxxxxx
Accept: application/json
```

---

## 2. Formato de respuesta

Toda respuesta sigue el contrato estándar del proyecto:

### 2.1 Éxito con paginación

```json
{
  "success": true,
  "data": [ /* ... registros ... */ ],
  "meta": {
    "total": 1234,
    "limit": 25,
    "offset": 0,
    "hasMore": true
  }
}
```

### 2.2 Éxito con dato simple

```json
{
  "success": true,
  "data": { /* ... */ }
}
```

### 2.3 Error

```json
{
  "success": false,
  "message": "API key inválida"
}
```

| Status | Significado |
|--------|-------------|
| 200    | OK |
| 400    | Parámetro inválido (ej: `from` en formato incorrecto) |
| 401    | Falta API key, key inválida, expirada o desactivada |
| 403    | API key sin scope para este endpoint |
| 429    | Rate limit excedido |
| 500    | Error interno |

---

## 3. Parámetros comunes

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `limit`   | int  | `25`    | Cantidad de registros por página (máx. `100`) |
| `offset`  | int  | `0`     | Desplazamiento para paginación |
| `from`    | date | —       | Filtro de fecha mínima `YYYY-MM-DD` |
| `to`      | date | —       | Filtro de fecha máxima `YYYY-MM-DD` |

---

## 4. Endpoints

### 4.1 `GET /ping`

Health check público (no requiere API key). Sirve para que el satélite verifique conectividad.

```bash
curl https://<host>/api/public/v1/ping
```

```json
{
  "success": true,
  "data": { "status": "ok", "api": "public/v1", "timestamp": "2026-04-06T18:30:00.000Z" }
}
```

---

### 4.2 `GET /tenants`

Lista de sucursales visibles para la API key.
**Scope requerido:** `read:tenants`

```bash
curl -H "Authorization: Bearer hp_live_..." \
  "https://<host>/api/public/v1/tenants?limit=10"
```

Respuesta:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Sucursal Centro",
      "slug": "sucursal-centro",
      "businessId": 1,
      "subscriptionStatus": "active",
      "createdAt": "2026-03-05T16:31:26.496Z"
    }
  ],
  "meta": { "total": 1, "limit": 10, "offset": 0, "hasMore": false }
}
```

---

### 4.3 `GET /products`

Lista de productos del catálogo, scoping por API key.
**Scope requerido:** `read:products`

| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `activeOnly` | bool | `true` | Cuando es `false` también devuelve productos soft-deleted |

```bash
curl -H "Authorization: Bearer hp_live_..." \
  "https://<host>/api/public/v1/products?limit=50&activeOnly=true"
```

Respuesta:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "tenantId": 1,
      "name": "Maple x30",
      "stockQuantity": "120.00",
      "unitPrice": "4500.00",
      "isActive": true,
      "createdAt": "2026-03-05T16:31:26.496Z",
      "updatedAt": "2026-04-06T10:12:33.998Z"
    }
  ],
  "meta": { "total": 4, "limit": 50, "offset": 0, "hasMore": false }
}
```

---

### 4.4 `GET /sales`

Lista de ventas con sus ítems incluidos (eager-loaded).
**Scope requerido:** `read:sales`

```bash
curl -H "Authorization: Bearer hp_live_..." \
  "https://<host>/api/public/v1/sales?from=2026-04-01&to=2026-04-30&limit=100"
```

Respuesta:

```json
{
  "success": true,
  "data": [
    {
      "id": 21,
      "tenantId": 1,
      "userId": 3,
      "totalAmount": "12500.00",
      "paymentMethod": "Efectivo",
      "paymentSplits": null,
      "saleDate": "2026-04-06",
      "source": "manual",
      "createdAt": "2026-04-06T13:45:12.000Z",
      "items": [
        {
          "id": 28,
          "productId": 1,
          "quantity": "2.00",
          "unitPrice": "4500.00",
          "subtotal": "9000.00",
          "discount": "0.00",
          "discountConcept": null
        }
      ]
    }
  ],
  "meta": { "total": 1, "limit": 100, "offset": 0, "hasMore": false }
}
```

---

### 4.5 `GET /expenses`

Lista de egresos.
**Scope requerido:** `read:expenses`

```bash
curl -H "Authorization: Bearer hp_live_..." \
  "https://<host>/api/public/v1/expenses?from=2026-04-01"
```

Respuesta:

```json
{
  "success": true,
  "data": [
    {
      "id": 3,
      "tenantId": 1,
      "userId": 2,
      "concept": "Combustible",
      "amount": "8500.00",
      "expenseDate": "2026-04-06",
      "createdAt": "2026-04-06T13:50:00.000Z"
    }
  ],
  "meta": { "total": 1, "limit": 25, "offset": 0, "hasMore": false }
}
```

---

### 4.6 `GET /purchases`

Lista de compras.
**Scope requerido:** `read:purchases`

> Nota: el binario de comprobante (`receipt_data`) **no** se incluye en este endpoint para evitar respuestas pesadas. Para obtener el comprobante hay que ingresar al panel principal.

```bash
curl -H "Authorization: Bearer hp_live_..." \
  "https://<host>/api/public/v1/purchases?from=2026-04-01"
```

Respuesta:

```json
{
  "success": true,
  "data": [
    {
      "id": 12,
      "tenantId": 1,
      "productId": 1,
      "userId": 2,
      "quantity": 60,
      "cost": "200000.00",
      "price": "4500.00",
      "marginAmount": "70000.00",
      "provider": "Granja San Pedro",
      "purchaseDate": "2026-04-05",
      "createdAt": "2026-04-05T11:00:00.000Z"
    }
  ],
  "meta": { "total": 1, "limit": 25, "offset": 0, "hasMore": false }
}
```

---

### 4.7 `GET /metrics`

Agrega ingresos, egresos y saldo neto en un rango de fechas.
**Scope requerido:** `read:metrics`

```bash
curl -H "Authorization: Bearer hp_live_..." \
  "https://<host>/api/public/v1/metrics?from=2026-04-01&to=2026-04-30"
```

Respuesta:

```json
{
  "success": true,
  "data": {
    "totalSales": 458200.50,
    "totalSalesCount": 21,
    "totalExpenses": 122000.00,
    "totalExpensesCount": 3,
    "netBalance": 336200.50
  }
}
```

---

## 5. Administración de API Keys (interno)

Estas rutas son solo para el panel de Huevos Point. Requieren JWT + rol `superadmin`.

### 5.1 `POST /api/admin/api-keys`

```json
{
  "name": "ERP Externo - Producción",
  "businessId": 1,
  "scopes": ["read:sales", "read:expenses", "read:metrics"],
  "rateLimitPerMin": 120,
  "expiresAt": "2027-04-06T00:00:00.000Z"
}
```

Respuesta (única vez con `rawKey`):

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "ERP Externo - Producción",
    "keyPrefix": "hp_live_AbC",
    "rawKey": "hp_live_AbCDeFgHiJkLmNoPqRsTuVwXyZ0123456789ABCD",
    "businessId": 1,
    "tenantId": null,
    "scopes": ["read:sales","read:expenses","read:metrics"],
    "rateLimitPerMin": 120,
    "expiresAt": "2027-04-06T00:00:00.000Z",
    "createdAt": "2026-04-06T18:00:00.000Z"
  },
  "message": "API key creada. Guardá rawKey en un lugar seguro: no podrá volver a verse."
}
```

> Reglas: o bien `businessId` o bien `tenantId` (no ambos). Scopes deben pertenecer al set válido.

### 5.2 `GET /api/admin/api-keys`

Lista todas las keys (sin el hash).

### 5.3 `DELETE /api/admin/api-keys/:id`

Revoca una key (`is_active = false`). Las invocaciones futuras fallarán con `401`.

---

## 6. Schema de la tabla `api_keys`

```sql
CREATE TABLE api_keys (
  id                  SERIAL PRIMARY KEY,
  name                VARCHAR(120) NOT NULL,
  key_prefix          VARCHAR(12)  NOT NULL,
  key_hash            VARCHAR(255) NOT NULL UNIQUE,   -- SHA-256 hex
  business_id         INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
  tenant_id           INTEGER REFERENCES tenants(id)    ON DELETE CASCADE,
  scopes              TEXT[] NOT NULL DEFAULT ARRAY['read:all']::TEXT[],
  is_active           BOOLEAN NOT NULL DEFAULT true,
  rate_limit_per_min  INTEGER NOT NULL DEFAULT 60,
  last_used_at        TIMESTAMPTZ,
  expires_at          TIMESTAMPTZ,
  created_by          INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT api_keys_scope_check CHECK (business_id IS NOT NULL OR tenant_id IS NOT NULL)
);

CREATE INDEX api_keys_key_hash_idx ON api_keys (key_hash);
CREATE INDEX api_keys_business_idx ON api_keys (business_id) WHERE is_active = true;
CREATE INDEX api_keys_tenant_idx   ON api_keys (tenant_id)   WHERE is_active = true;
CREATE INDEX api_keys_prefix_idx   ON api_keys (key_prefix);
```

---

## 7. Cliente de ejemplo (Node.js)

```js
const BASE = 'https://<host>/api/public/v1';
const KEY  = process.env.HUEVOS_POINT_API_KEY;

async function get(path) {
  const r = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${KEY}` },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

const ventas = await get('/sales?from=2026-04-01&to=2026-04-30&limit=100');
console.log(ventas.data, ventas.meta);
```

---

## 8. Cliente de ejemplo (Python)

```python
import os, requests

BASE = "https://<host>/api/public/v1"
KEY  = os.environ["HUEVOS_POINT_API_KEY"]

r = requests.get(
    f"{BASE}/metrics",
    params={"from": "2026-04-01", "to": "2026-04-30"},
    headers={"Authorization": f"Bearer {KEY}"},
    timeout=10,
)
r.raise_for_status()
print(r.json()["data"])
```

---

## 9. Convención para nuevos endpoints

> **Regla del proyecto:** cada vez que se crea una nueva tabla o se agregan datos relevantes a la base de datos, **se debe crear un endpoint correspondiente en `/api/public/v1`**. Esta directiva está documentada en el `CLAUDE.md` raíz del proyecto.

Para sumar un endpoint nuevo:

1. Agregar la lectura en `server/src/modules/public/public.repository.js` usando `resolveTenantIds + tenantScopeClause`.
2. Agregar el método de servicio en `public.service.js` con validación de pagination/dates.
3. Agregar el handler en `public.controller.js`.
4. Definir el scope nuevo en `apiKeys.service.js` (`VALID_SCOPES`) y montar la ruta en `public.routes.js` con `requireScope('read:<recurso>')`.
5. Documentar el endpoint en este archivo (sección 4).
6. Agregar tests unitarios en `server/src/__tests__/unit/public.service.test.js`.

---

## 10. Changelog

| Fecha | Versión | Cambio |
|-------|---------|--------|
| 2026-04-06 | v1.0 | Versión inicial: tenants, products, sales, expenses, purchases, metrics |
