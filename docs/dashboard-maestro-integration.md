# Dashboard Maestro — Integración con Huevos Point

Sistema satélite independiente de administración superadmin del SaaS Huevos Point.
Comparte la misma base de datos PostgreSQL (Supabase) y el mismo `JWT_SECRET`.

---

## Arquitectura de la conexión

```
┌─────────────────────────────┐   API pública (solo lectura)    ┌──────────────────────────┐
│     Dashboard Maestro       │ ── GET /api/public/v1/sales ──► │   App Huevos Point       │
│  (panel superadmin)         │ ── GET /api/public/v1/expenses► │   (app de negocios)      │
│  dashboard-maestro.vercel   │ ── GET /api/public/v1/metrics ► │   huevos-point.vercel    │
│                             │                                  │                          │
│  JWT auto-login ───────────────────────────────────────────►  │  /auto-login?token=...   │
└─────────────────────────────┘                                  └──────────────────────────┘
           │                                                               │
           └──────────────── PostgreSQL Supabase (DB compartida) ─────────┘
```

---

## Cómo el Dashboard Maestro consume datos

Todas las lecturas de ventas, egresos, compras y métricas se hacen via la API pública REST de Huevos Point (`/api/public/v1`). **No hay queries directas a las tablas** desde el Dashboard Maestro.

La autenticación usa una API key (`hp_live_...`) con scope `read:all`, creada desde Huevos Point en `POST /api/admin/api-keys`.

### Endpoints consumidos

| Endpoint | Descripción |
|----------|-------------|
| `GET /api/public/v1/sales?from=YYYY-MM-DD&to=YYYY-MM-DD` | Ventas con ítems, paginado |
| `GET /api/public/v1/expenses?from=...&to=...` | Egresos |
| `GET /api/public/v1/metrics?from=...&to=...` | Totales agregados |
| `GET /api/public/v1/tenants` | Lista de sucursales (para sincronía) |

---

## Variables de entorno que necesita el Dashboard Maestro

```env
HP_API_BASE_URL=https://huevos-point-gcbg.vercel.app/api/public/v1
HP_API_KEY=hp_live_...   # generada desde POST /api/admin/api-keys
```

La key debe tener:
- `businessId`: ID del negocio correspondiente (no `tenantId`)
- `scopes`: `["read:all"]`

---

## Auto-login cross-app

El Dashboard Maestro puede ingresar a cualquier sucursal en la app de negocios sin contraseña:

1. El Dashboard llama a `GET /api/tenants/:id/access-token` en su propio backend
2. El backend genera un JWT firmado con el mismo `JWT_SECRET` que usa Huevos Point
3. El frontend abre `window.open("https://huevos-point.vercel.app/auto-login?token=...&tenant=:id", "_blank")`
4. Huevos Point recibe el token en `/auto-login`, lo valida via `POST /api/auth/auto-login` y hace login automático

### Formato exacto del JWT payload

```json
{
  "id": 1,
  "username": "leanSuper",
  "fullName": "Leandro Superadmin",
  "role": "superadmin",
  "tenants": [
    { "id": 2, "name": "Sucursal Roosevelt" },
    { "id": 3, "name": "Sucursal Amenábar" }
  ],
  "_source": "dashboard-maestro"
}
```

### Endpoint de validación (Huevos Point)

```
POST /api/auth/auto-login
Body: { "token": "eyJ..." }
```

Respuesta exitosa:
```json
{
  "success": true,
  "data": {
    "token": "eyJ...",
    "user": { "id": 1, "role": "superadmin", "tenants": [...] }
  }
}
```

---

## Capa de datos compartida: tabla businesses

El Dashboard Maestro agregó una capa jerárquica en la DB compartida:

```sql
-- Tabla agregada por el Dashboard Maestro
CREATE TABLE businesses (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  slug       TEXT,
  is_active  BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- Columna agregada a la tabla existente
ALTER TABLE tenants ADD COLUMN business_id INTEGER REFERENCES businesses(id);
```

**Jerarquía:** Business (negocio) → Tenant[] (sucursales)

> **Importante:** cuando se crea un nuevo tenant desde Huevos Point, `business_id` queda en NULL. Debe asignarse manualmente al negocio correspondiente en el Dashboard Maestro para que aparezca allí.

---

## Acciones que el Dashboard Maestro escribe en la DB compartida

| Tabla | Operaciones | Motivo |
|-------|-------------|--------|
| `businesses` | CRUD completo | Tabla propia del dashboard |
| `tenants` | UPDATE (`is_active`, `subscription_status`, `name`) | Suspender/reactivar/renombrar |
| `user_tenants` | DELETE | Limpieza de FK antes de borrar tenants |
| `superadmin_audit_log` | INSERT | Log de cada acción cross-tenant |

---

## Qué necesita estar implementado en Huevos Point

| Funcionalidad | Estado |
|--------------|--------|
| `POST /api/admin/api-keys` | Implementado ✓ |
| `GET /api/public/v1/sales\|expenses\|metrics\|tenants` | Implementado ✓ |
| `POST /api/auth/auto-login` (valida JWT del Dashboard) | Implementado ✓ |
| Ruta `/auto-login` en el frontend | Implementado ✓ |
| Campo `business_id` en tabla `tenants` | Columna ya existe en DB |

---

## Changelog

| Fecha | Cambio |
|-------|--------|
| 2026-04-07 | Documento inicial de integración |
| 2026-04-07 | Implementado `/auto-login` frontend + `POST /api/auth/auto-login` backend |
