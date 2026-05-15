# Reporte de Auditoría RLS — Huevos Point
**Fecha:** 2026-05-14

---

## Resumen Ejecutivo

- **18 tablas** auditadas
- **15 tablas** con RLS habilitado en la migración
- **3 tablas globales** con políticas especiales (solo lectura o solo superadmin)
- **4 queries de RIESGO ALTO** identificadas (2 intencionales, 2 requieren fix)
- **Mecanismo:** `SET LOCAL app.tenant_id` + `SET LOCAL app.role` vía `rlsMiddleware.js`

---

## 1. Inventario de Tablas

| Tabla | tenant_id | RLS | Tipo de política |
|-------|-----------|-----|-----------------|
| `tenants` | ❌ (tabla raíz) | ✅ | `id = app_tenant_id()` o superadmin |
| `users` | ✅ (nullable) | ✅ | `tenant_id = app_tenant_id()` o superadmin |
| `user_tenants` | ✅ (pivot) | ✅ | `tenant_id = app_tenant_id()` o superadmin |
| `products` | ✅ | ✅ | Estándar |
| `sales` | ✅ | ✅ | Estándar |
| `sale_items` | ❌ (via sale_id) | ✅ | EXISTS JOIN a `sales.tenant_id` |
| `expenses` | ✅ | ✅ | Estándar |
| `purchases` | ✅ | ✅ | Estándar |
| `audit_logs` | ✅ (nullable) | ✅ | Estándar + superadmin |
| `egg_categories` | ✅ | ✅ | Estándar |
| `subscriptions` | ✅ | ✅ | Estándar |
| `subscription_payments` | ✅ | ✅ | Estándar |
| `onboarding_registrations` | ✅ (nullable) | ✅ | Estándar + allow NULL |
| `api_keys` | ✅ (nullable) | ✅ | tenant ó business-scoped |
| `mp_incoming_payments` | ✅ | ✅ | Estándar |
| `subscription_plans` | ❌ (global) | ✅ | SELECT libre, escritura solo superadmin |
| `contact_requests` | ❌ (global) | ✅ | INSERT libre, SELECT solo superadmin |
| `superadmin_audit_log` | ❌ (global) | ✅ | Solo superadmin |

---

## 2. Queries Sin tenant_id — Análisis de Riesgo

### 🔴 RIESGO ALTO

#### A. `eggCategories.service.js` — `remove()` (BUG REAL)
```js
// Purchase.update y Product.update sin tenantId filter
await Purchase.update({ categoryId: null }, { where: { categoryId: id }, transaction: t });
await Product.update({ isActive: false, categoryId: null }, { where: { categoryId: id }, transaction: t });
```
**Problema:** Si dos tenants tienen categorías con el mismo `id`, esto afecta a ambos.
**¿Intencional?** NO. Es un bug latente.
**Fix requerido:**
```js
await Purchase.update(
  { categoryId: null },
  { where: { categoryId: id, tenantId }, transaction: t }
);
await Product.update(
  { isActive: false, categoryId: null },
  { where: { categoryId: id, tenantId }, transaction: t }
);
```

#### B. `apiKeys.service.js` — `listApiKeys()` (BUG REAL)
```js
const keys = await ApiKey.findAll({
  attributes: { exclude: ['keyHash'] },
  order: [['createdAt', 'DESC']],
});
```
**Problema:** Devuelve todas las API keys de todos los tenants/businesses.
**¿Intencional?** Probablemente es feature de superadmin pero sin filtro explícito.
**Fix requerido:** Agregar filtro según el scope del llamante:
```js
// Si es superadmin: sin filtro (intencional)
// Si es admin: filtrar por businessId o tenantId
const where = isSuperadmin ? {} : { businessId };
const keys = await ApiKey.findAll({ where, attributes: { exclude: ['keyHash'] }, ... });
```

#### C. `superadmin.service.js` — múltiples queries (INTENCIONAL)
```js
Sale.sum('totalAmount', { where: { saleDate: { [Op.gte]: dateThreshold } } })
Sale.count({ where: { saleDate: { [Op.gte]: dateThreshold } } })
Tenant.findAll({ order: [['createdAt', 'DESC']] })
```
**¿Intencional?** SÍ — dashboard de superadmin necesita ver todos los tenants.
**Acción:** Agregar comentario explícito `// SUPERADMIN: no tenantId filter intencional`.
**Con RLS activo:** Estas queries seguirán funcionando porque `app.role = 'superadmin'` bypasea las políticas.

---

### 🟡 RIESGO MEDIO

#### D. `audit.repository.js` — `tenantId` condicional
```js
if (tenantId) {
  where.tenantId = tenantId;
}
// Si tenantId no se pasa → trae TODOS los logs
```
**Problema:** Un controller que llame sin tenantId expone todos los logs.
**Fix recomendado:** Hacer tenantId obligatorio para roles no-superadmin en el controller.

#### E. `auth.repository.js` — `findAllTenants()`
```js
return Tenant.findAll({ where: { isActive: true }, attributes: ['id', 'name'] });
```
**¿Intencional?** SÍ — usado en login de superadmin para mostrar lista de tenants.
**Riesgo:** Bajo. Solo expone id y name, protegido por validación de rol en service.

#### F. `public.repository.js` — `resolveTenantIds()`
```js
Tenant.findAll({ where: { businessId: parseInt(businessId, 10), isActive: true } })
```
**¿Intencional?** SÍ — resolución de scope por API Key.
**Riesgo:** Bajo. Está protegido por validación de API Key.

---

### 🟢 BAJO RIESGO (sin acción requerida)

| Archivo | Query | Motivo OK |
|---------|-------|-----------|
| `auth.repository.js` | `User.findByPk(id)` | Lookup por PK global, correcto |
| `tenants.repository.js` | `Tenant.findAll()` | Tabla raíz, no tiene tenant_id |
| `superadmin.*` | Múltiples sin filtro | Rol validado en middleware de ruta |

---

## 3. Accionables Por Prioridad

### Antes de habilitar RLS en producción

| # | Prioridad | Acción | Archivo |
|---|-----------|--------|---------|
| 1 | 🔴 CRÍTICO | Agregar `tenantId` filter en `Purchase.update()` y `Product.update()` | `eggCategories.service.js` |
| 2 | 🔴 CRÍTICO | Filtrar `ApiKey.findAll()` por scope del llamante | `apiKeys.service.js` |
| 3 | 🟡 MEDIO | Hacer `tenantId` obligatorio en audit queries de roles no-superadmin | `audit.repository.js` |
| 4 | 🟡 MEDIO | Agregar comentarios `// SUPERADMIN: sin tenantId intencional` | `superadmin.service.js` |

### Para habilitar RLS

| # | Paso | Descripción |
|---|------|-------------|
| 1 | Registrar `app_user` en Supabase | Rol sin BYPASSRLS — cambiar `DB_USER` en `.env` |
| 2 | Ejecutar `docs/rls-migration.sql` | En Supabase SQL Editor |
| 3 | Registrar `rlsMiddleware` en `app.js` | Después de `authMiddleware` y `tenantMiddleware` |
| 4 | Elegir Opción A o B del middleware | A = transacción por request (seguro); B = SET sesión (sin refactor) |
| 5 | Testear con usuario demo | Verificar que no ve datos reales |
| 6 | Testear cross-tenant | Crear 2 tenants, verificar aislamiento |

---

## 4. Consideración Crítica — Supabase + FORCE ROW LEVEL SECURITY

El rol `postgres` (service role de Supabase) tiene `SUPERUSER` y **bypassea RLS por defecto**.

La migración usa `FORCE ROW LEVEL SECURITY` en cada tabla, lo que **obliga** al rol `postgres` a respetar las políticas también. Esto significa:

> **Si `app.tenant_id` no está seteado, ninguna query devuelve filas.**

Para operaciones administrativas de mantenimiento (migraciones, seeds), correr queries **antes** de habilitar RLS, o usar:
```sql
SET app.role = 'superadmin';
-- tu query acá
RESET app.role;
```

---

## 5. Archivos Generados

- [`docs/rls-migration.sql`](rls-migration.sql) — SQL completo para ejecutar en Supabase
- [`server/src/middlewares/rlsMiddleware.js`](../server/src/middlewares/rlsMiddleware.js) — Middleware Express
