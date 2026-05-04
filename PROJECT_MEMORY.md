# PROJECT MEMORY

> Este archivo es la fuente de verdad del contexto del proyecto.
> Claude Code debe leerlo SIEMPRE al inicio de cada sesión y después de cada compactación.
> Solo analizá archivos del codebase si la información requerida NO está documentada aquí.

---

## Stack Técnico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + MUI v6 + React Router v6 + React Hook Form + dayjs + ExcelJS |
| Backend | Node.js + Express + Sequelize ORM |
| Base de datos | PostgreSQL (Supabase) |
| Auth | JWT (RS256 en panel) / API Keys SHA-256 (API pública) |
| Deploy | Vercel serverless — entry point `server/api/index.js` |
| Pagos | MercadoPago Point (PDV) + Mobbex / MP subscripciones |

---

## Arquitectura General

```
test-agy2/
├── client/src/
│   ├── pages/           # Páginas: DashboardPage, StockPage, PurchasesPage, AuditPage,
│   │                    #   MetricsPage, ApiKeysPage, UsersPage, ConfigPage, LoginPage,
│   │                    #   SuperadminDashboardPage, SuperadminTenantDetailPage, AutoLoginPage
│   ├── components/
│   │   ├── common/      # ConfirmDialog, ProtectedRoute
│   │   ├── layout/      # AppLayout, Sidebar, DemoBanner
│   │   ├── sales/       # SaleModal
│   │   ├── expenses/    # ExpenseModal
│   │   ├── purchases/   # PurchaseModal, EditPurchaseModal
│   │   └── stock/       # CategoryModal, ProductModal, PriceEditModal, StockAdjustModal
│   ├── context/         # AuthContext (user, activeTenant, isAdmin, isSuperAdmin)
│   ├── services/        # api.js (instancia axios con baseURL y header x-tenant-id)
│   ├── utils/           # formatters.js (CURRENCY_FORMAT), sweetAlert helpers
│   └── theme/           # MUI theme config
├── server/src/
│   ├── modules/         # Ver sección "Módulos Backend"
│   ├── models/          # Ver sección "Modelos Sequelize"
│   ├── middlewares/     # authMiddleware, tenantMiddleware, roleMiddleware,
│   │                    #   apiKeyMiddleware, demoMiddleware, subscriptionCheck, requireFeature
│   ├── config/          # database.js, environment.js
│   ├── utils/           # AppError, auditLogger
│   ├── fixtures/        # demoData.js (datos ficticios para modo demo)
│   └── __tests__/unit/  # Jest unit tests
├── docs/
│   ├── public-api.md    # Documentación canónica de la API pública
│   └── saas-plan-v4.md  # Plan SaaS — fases implementadas
├── server/api/index.js  # Entry point Vercel + TODAS las migraciones cold-start
└── server/src/server.js # Entry point desarrollo + mismas migraciones
```

### Modelo multi-tenant
```
Business (1) → Tenants (N)   [sucursales]
User ←→ Tenants (many-to-many vía user_tenants)
```
- `x-tenant-id` header en cada request
- `req.tenantId` seteado por tenantMiddleware
- Todo query filtra por `tenantId`
- Superadmin accede a todo sin restricción

---

## Modelos Sequelize

| Modelo | Tabla | Descripción |
|--------|-------|-------------|
| `User` | `users` | Roles: `superadmin` / `admin` / `employee` / `demo` |
| `Tenant` | `tenants` | Sucursal. Tiene `subscriptionStatus` |
| `Sale` | `sales` | Venta. Tiene `paymentSplits` (TEXT JSON), `saleDate` |
| `SaleItem` | `sale_items` | Ítem de venta. Tiene `discount`, `discountConcept` |
| `Expense` | `expenses` | Egreso del día |
| `Product` | `products` | Producto/presentación. `categoryId` nullable (si es de egg category), `unitsPerPresentation`, `isActive` |
| `EggCategory` | `egg_categories` | Categoría de huevos. `stockUnits` (en huevos), `eggsPerCrate`, `isActive` |
| `Purchase` | `purchases` | Compra. `categoryId` nullable, `productId` nullable, cantidad en cajones (DECIMAL) |
| `AuditLog` | `audit_logs` | Log de acciones del tenant |
| `ApiKey` | `api_keys` | API keys públicas con scope y hash SHA-256 |
| `Subscription` | `subscriptions` | Suscripción del tenant a un plan |
| `SubscriptionPlan` | `subscription_plans` | Planes: básico, profesional, personalizado |
| `SubscriptionPayment` | `subscription_payments` | Historial de pagos de suscripción |
| `OnboardingRegistration` | `onboarding_registrations` | Registro de alta de nuevo cliente |
| `ContactRequest` | `contact_requests` | Consultas del formulario de contacto |
| `SuperadminAuditLog` | `superadmin_audit_logs` | Log de acciones superadmin |

**Registro de modelos:** `server/src/models/index.js` — todo modelo nuevo debe registrarse aquí con sus asociaciones.

---

## Módulos Backend

```
server/src/modules/
├── auth/           → POST /api/auth/login, /logout, /refresh
├── dashboard/      → GET /api/dashboard/summary
├── sales/          → CRUD /api/sales + descuento de stock por categoría
├── expenses/       → CRUD /api/expenses
├── products/       → CRUD /api/products + bulk upload (Excel)
├── purchases/      → CRUD /api/purchases + superadmin: edit/delete
├── eggCategories/  → CRUD /api/egg-categories (admin+) + stock adjust
├── users/          → CRUD /api/users (admin)
├── tenants/        → CRUD /api/tenants (superadmin)
├── audit/          → GET /api/audit-logs (admin)
├── metrics/        → GET /api/metrics (admin)
├── cron/           → /api/cron (cron jobs: email resumen diario)
├── superadmin/     → /api/superadmin (gestión global)
├── apiKeys/        → /api/admin/api-keys (JWT + superadmin)
├── public/         → /api/public/v1 (API key auth, read-only)
├── onboarding/     → /api/onboarding (público, sin auth)
├── subscriptions/  → /api/subscription (JWT, tenant actual)
└── webhooks/       → /api/webhooks (MercadoPago subscripciones)
```

Cada módulo sigue la estructura: `<modulo>.routes.js` → `<modulo>.controller.js` → `<modulo>.service.js` → `<modulo>.repository.js`

---

## Sistema de Huevos (EggCategory)

Este es el sistema más complejo del proyecto. Documetado aquí para evitar releer el código.

### Flujo de stock
- Stock real vive en `egg_categories.stock_units` (en huevos individuales)
- **Compra:** `quantity` (cajones) × `eggsPerCrate` → suma a `stockUnits`
- **Venta:** `quantity` × `product.unitsPerPresentation` → resta de `stockUnits`
- `product.stockQuantity` ya NO se usa para stock real (legacy)

### Presentaciones auto-generadas al crear categoría
```
buildPresentations(eggsPerCrate) → 6 presentaciones:
  1. Cajón            → eggsPerCrate unidades
  2. 1/2 Cajón        → eggsPerCrate / 2
  3. Maple            → eggsPerCrate / 12
  4. Docena           → 12
  5. 1/2 Docena       → 6
  6. Promo x2 maples  → (eggsPerCrate / 12) × 2
```

- Jumbo: `eggsPerCrate = 240` → Maple = 20 unidades, Promo = 40 unidades
- Estándar: `eggsPerCrate = 360` → Maple = 30 unidades, Promo = 60 unidades

### Eliminación de categoría (`remove`)
1. `Purchase.update({ categoryId: null })` → nullear FK en compras (evita FK constraint)
2. `Product.update({ isActive: false, categoryId: null })` → soft-delete presentaciones
3. `category.destroy()` → hard-delete categoría
Todo dentro de una transacción.

### Índices parciales (solo filas activas)
- `egg_categories_active_name_uidx ON egg_categories(tenant_id, name) WHERE is_active = true`
- `products_active_name_uidx ON products(tenant_id, name) WHERE is_active = true`
- **Las constraints globales UNIQUE fueron eliminadas** para permitir recrear categorías con el mismo nombre.

---

## Estado Actual del Proyecto

### Funcionando en producción
- Dashboard con resumen del día, exportación Excel
- Ventas multi-ítem con descuentos por ítem y concepto de descuento
- Ventas con pago dividido (split payments, hasta 3 métodos)
- Stock por categoría de huevos (EggCategory system)
- Compras por categoría (cajones) con actualización automática de stock
- Egresos del día
- Auditoría completa por tenant
- Métricas y balance mensual
- Gestión de usuarios y tenants (admin)
- API pública read-only con API keys
- Sistema de suscripciones (Fase 3 SaaS)
- Modo demo (rol `demo` interceptado antes de tocar BD)
- Superadmin con dashboard de gestión global

### Recientemente implementado (sesión actual)
- **Editar/eliminar compras** — solo superadmin. Con reversión de stock delta en transacción.
- **Buscador en SaleModal** — Autocomplete MUI reemplazó al select, filtra por nombre desde 3 letras
- **Tab "Productos Cargados"** en PurchasesPage — lista productos genéricos (sin categoryId) con búsqueda, edición inline y eliminación
- **Presentación "Promo x2 maples"** — 6ta presentación auto-generada en todas las categorías
- **Fix bug 409 al recrear categoría** — eliminadas constraints globales UNIQUE, reemplazadas por índices parciales; también se nullea `category_id` en purchases al eliminar categoría

---

## Decisiones Técnicas Registradas

1. **Stock en egg_categories, no en products** — los productos son solo "presentaciones de precio", el stock real vive en la categoría en unidades base (huevos).

2. **Hard-delete categorías, soft-delete presentaciones** — la categoría se elimina físicamente para evitar conflicts con el índice parcial. Los productos de presentación se marcan `isActive: false` + `categoryId: null`.

3. **Nullear FK en purchases al eliminar categoría** — la tabla `purchases` tiene `category_id REFERENCES egg_categories(id)` sin CASCADE. Antes de destruir la categoría, se nullea esa columna dentro de la misma transacción.

4. **Constraint UNIQUE global eliminada** — la tabla `products` y `egg_categories` solo tienen índice parcial `WHERE is_active = true`. Esto permite recrear una categoría con el mismo nombre después de eliminarla.

5. **subscriptionCheck corre antes de authMiddleware** — por diseño en app.js. En consecuencia, si el tenant no tiene subscripción activa y NO es superadmin, recibe 402. El bypass superadmin requiere que req.user esté seteado (lo que no ocurre aún en subscriptionCheck). Esto es un bug conocido: subscriptionCheck es inefectivo para las rutas con authMiddleware por ruta.

6. **Compras por cajón, no por unidad** — el campo `quantity` en purchases es DECIMAL(10,2) para admitir fracciones (0.5, 1.5 cajones).

7. **Precios de venta en Stock, no en Compras** — las compras solo registran costo. Los precios de venta se editan por presentación desde la sección Stock.

8. **API pública estrictamente read-only** — toda mutación requiere JWT de panel admin. La API pública (`/api/public/v1`) es solo para sistemas satélites (ERP, BI, mobile).

---

## Convenciones del Proyecto

### Backend
- **Respuestas API:** `{ success: bool, data: any, message?: string, error?: string }`
- **Errores operacionales:** `throw new AppError(message, statusCode)` — nunca `res.status().json()` en catch
- **Queries multi-tenant:** siempre incluir `tenantId` en `where`
- **Transacciones:** toda operación con múltiples writes usa `sequelize.transaction()`
- **Migraciones:** idempotentes en `server/api/index.js`. Usar `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`
- **Soft delete:** `isActive: false` — nunca DELETE físico en productos/usuarios activos

### Frontend
- **Dinero:** usar `CURRENCY_FORMAT` importado de `utils/formatters.js`
- **Errores en UI:** `showErrorToast` (NO `showErrorAlert` — bloquea la UI)
- **Fechas:** dayjs o formato explícito `YYYY-MM-DD` para evitar desfase UTC
- **Stock de egg category en SaleModal:** `Math.floor(category.stockUnits / product.unitsPerPresentation)`
- **`activeTenant`** de AuthContext para operaciones del tenant activo
- **`isSuperAdmin`** de AuthContext para mostrar acciones restringidas a superadmin

### Commits
Conventional Commits: `feat:`, `fix:`, `refactor:`, `chore:`, `test:`, `docs:`

---

## Errores Conocidos / Deuda Técnica

1. **`subscriptionCheck` inefectivo** — ver Decisión #5. No valida correctamente para rutas con authMiddleware por ruta. A refactorizar en una sesión dedicada.

2. **`product.stockQuantity` desincronizado** — para productos con `categoryId`, el campo `stock_quantity` en la tabla `products` ya no refleja el stock real (que está en `egg_categories.stock_units`). Se mantiene como legacy. No usar para lógica de negocio.

3. **`price` y `marginAmount` en purchases** — campos legacy. Las compras nuevas por categoría no setean precio de venta. Los campos quedan nullable.

---

## Tareas en Curso

### Bug activo (última sesión)
**Bug:** Error 409 al eliminar categoría de huevos (o al recrearla con el mismo nombre).

**Causa raíz identificada:** 
- Al eliminar categoría: `purchases.category_id` tiene FK a `egg_categories` sin `ON DELETE CASCADE`. El hard-delete de la categoría fallaba con FK constraint violation.
- Al recrear: la constraint global `UNIQUE(tenant_id, name)` no fue correctamente eliminada en algunos entornos, bloqueando la inserción de nuevas presentaciones con nombres previos.

**Fixes aplicados en esta sesión:**
1. `server/src/modules/eggCategories/eggCategories.service.js` — función `remove()`: agregado `Purchase.update({ categoryId: null })` dentro de la transacción antes de `category.destroy()`
2. `server/api/index.js` — migración: eliminadas todas las constraints UNIQUE de `egg_categories` dinámicamente (query a `information_schema.table_constraints`)
3. `server/src/server.js` — misma migración dinámica para entorno dev

**Estado:** ✅ Fixes completos y aplicados:
- `eggCategories.service.js`: `Purchase` importado, `remove()` nullea `categoryId` en purchases antes de destroy
- `server/api/index.js`: migración dinámica que droppea todas las constraints UNIQUE de `egg_categories`
- `server/src/server.js`: misma migración para entorno dev

### Próximos pasos sugeridos
- Testear el flujo completo: crear → eliminar → recrear categoría con el mismo nombre
