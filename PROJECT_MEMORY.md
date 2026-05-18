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
- **RLS activo en Supabase** — `FORCE ROW LEVEL SECURITY` en todas las tablas. `rlsMiddleware` setea `app.tenant_id` y `app.role` en cada request JWT. Políticas: `is_superadmin()` bypasea todo; resto filtra por `tenant_id = app_tenant_id()`.
- **Documentación RLS:** `docs/rls-migration.sql` (SQL ejecutado), `docs/rls-audit-report.md` (inventario + queries en riesgo)

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
├── products/       → CRUD /api/products + POST /bulk (Excel import, replace) + DELETE /bulk (eliminar todos los genéricos)
├── purchases/      → CRUD /api/purchases + POST /bulk (multi-ítem) + superadmin: edit/delete
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
1. `Purchase.update({ categoryId: null, tenantId })` → nullear FK en compras del tenant
2. `Product.update({ isActive: false, categoryId: null, tenantId })` → soft-delete presentaciones del tenant
3. `category.destroy()` → hard-delete categoría
Todo dentro de una transacción.
**Nota:** Los updates de FK cleanup sí filtran por `tenantId` (fix 2026-05-14). `egg_categories.id` es PK SERIAL único globalmente, por lo que el filtro es redundante pero seguro como check extra.

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

### Recientemente implementado (sesiones anteriores)
- **Editar/eliminar compras** — solo superadmin. Con reversión de stock delta en transacción.
- **Buscador en SaleModal** — Autocomplete MUI reemplazó al select, filtra por nombre desde 3 letras
- **Tab "Productos Cargados"** en PurchasesPage — lista productos genéricos (sin categoryId) con búsqueda, edición inline y eliminación
- **Presentación "Promo x2 maples"** — 6ta presentación auto-generada en todas las categorías
- **Fix bug 409 al recrear categoría** — eliminadas constraints globales UNIQUE, reemplazadas por índices parciales; también se nullea `category_id` en purchases al eliminar categoría

### Recientemente implementado (sesión 2026-05-04 — parte 1)
- **Fix definitivo bug 409 al eliminar categoría** — `remove()` en `eggCategories.service.js` ya no filtra por `tenantId` en los updates de FK cleanup (`Purchase.update`, `Product.update`). La FK en PostgreSQL es global; cualquier referencia de cualquier tenant bloqueaba el `category.destroy()`.
- **Migración: DROP INDEX explícito en egg_categories** — `server/api/index.js` y `server/src/server.js` ahora droppean nombres conocidos de índices directos (`egg_categories_name_key`, `egg_categories_tenant_id_name_key`, etc.) que no aparecen en `information_schema.table_constraints`.
- **Buscador en PurchaseModal (producto general)** — `TextField select` reemplazado por `Autocomplete` MUI con filtro desde 3 letras. Estado: `productSearch` + `selectedProduct`. Reset al abrir el modal.
- **Fix stock decimal en compras de productos genéricos** — `purchases.service.js`: `product.stockQuantity || 0` causaba concatenación de strings (`"0.00" + 5 = "0.005"` → PostgreSQL redondeaba a `0.01`). Corregido a `parseFloat(product.stockQuantity) || 0`.
- **Fix display de stock en SaleModal** — `getAvailableStock` para productos genéricos usa `Math.floor(parseFloat(product.stockQuantity) || 0)` en vez de raw `product.stockQuantity` (que era string de Sequelize).

### Recientemente implementado (sesión 2026-05-15 — parte 2)

- **Comprobante en egresos** — Modelo `Expense.js` + migración cold-start: columnas `receipt_data TEXT` y `receipt_mime_type VARCHAR(50)`. `expenses.service.js` y `expenses.controller.js` pasan los campos. `ExpenseModal.jsx` tiene dos inputs hidden: uno sin `capture` (galería/explorador, acepta PDF+imagen) y uno con `capture="environment"` (cámara directa en móvil). Límite 2 MB. Preview del archivo adjunto + botón quitar. `dashboard.service.js` incluye `receiptData`/`receiptMimeType` en el mapeo de egresos.

- **Columna "Comprobante" en tabla de movimientos** — `DashboardPage.jsx`: columna nueva. En EGRESO con comprobante: `IconButton` rojo + `ReceiptRoundedIcon` + tooltip. Modal viewer: imagen con `<img>` para JPG/PNG, `<iframe>` para PDF — base64. Skeleton y `colSpan` actualizados a 7 columnas.

- **Sucursal por defecto en login** — `AuthContext.jsx`: al hacer login, lee `localStorage.getItem('defaultTenant_<username>')`. Si existe y matchea un tenant del usuario, lo usa como `activeTenant`. Sino, usa `tenants[0]`. `ConfigPage.jsx`: sección "Sucursal por defecto" visible solo si el usuario tiene ≥2 sucursales. Cards-radio custom, click guarda en localStorage, click sobre el seleccionado lo deselecciona. Preferencia es por usuario, no afecta a otros.

- **Fix tema eliminado al cambiar sucursal por defecto** — `App.jsx` `ThemeSyncer`: antes llamaba `applyTheme(activeTenant?.theme)` siempre, incluso con `null` → revertía al tema default. Fix: `if (activeTenant?.theme) applyTheme(activeTenant.theme)`.

- **Cierre de sesión por inactividad (1 hora)** — `hooks/useInactivityTimer.js` (nuevo): timer 60 min, resetea ante `click`, `keydown`, `scroll`, `touchstart` (no `mousemove`). Se limpia al desautenticarse. `App.jsx` `InactivityWatcher`: componente que usa el hook y llama `logout('inactivity')`. `AuthContext.jsx` `logout(reason)`: pasa `?reason=inactivity` al endpoint. Backend `auth.controller.js`: `POST /auth/logout?reason=inactivity` → audit log con descripción `"Sesion cerrada por inactividad (username)"`.

### Recientemente implementado (sesión 2026-05-15)

- **Exportación Excel — mejoras visuales** — `DashboardPage.jsx` `exportToExcel`:
  - Fila 2 (summary): Ingresos verde fluor, Egresos rojo oscuro 1 + texto blanco, Saldo neto azul aciano + texto blanco. Font size 13.
  - Filas de métodos de pago: una por fila, colores por método (Efectivo gris, Cuenta DNI verde oscuro, Transferencia púrpura, Mercado Pago amarillo, Rappi naranja, resto azul). Ordenadas: Efectivo → Cuenta DNI → Transferencia → Mercado Pago → Rappi → resto alfabético.
  - Headers: Magenta oscuro 2 (`#660066`) + texto blanco.
  - Filas ventas: verde claro `#D8F3DC`. Filas egresos: rojo claro `#FFEBEE`.
  - Concepto de descuento incluido en detalle de productos: `Producto x2 (-10%) [concepto]`.

- **Métricas — gráfico de productos vendidos por mes** (`MetricsPage.jsx`):
  - Nuevo endpoint `GET /api/metrics/products-sold?year=&month=` → `metrics.service.getAllProductsSoldForMonth()`.
  - Componente `ProductsBarChartCard` autocontenido con selector de mes (mismo estilo que `MonthlyBalanceCard`). Default: mes actual, permite seleccionar meses anteriores.
  - Barras horizontales custom con `LinearProgress` MUI (no MUI x-charts) — nombres de productos completos sin truncar.
  - Colores por posición usando `PRODUCT_COLORS` existente.
  - Totalizador al pie: "Total de productos vendidos en [mes]: [N] uds".
  - También se agrega `currentMonthAll` al endpoint `/metrics` original (reutiliza el mismo service).
  - **Collapse en ProductsBarChartCard** — si hay más de 5 productos, los primeros 5 son siempre visibles. El resto se muestra/oculta con `Collapse` MUI y botón "Ver todos (N más)" / "Ver menos" con `ExpandMoreRoundedIcon`. `expanded` se resetea a `false` al cambiar de mes. Extracción de sub-componente `ProductBar`.

- **Fix tema no persiste al re-login** — `auth.repository.js`: agregado `'theme'` a `attributes: ['id', 'name', 'theme']` en el include de Tenant. Ahora el login response incluye `tenant.theme` y `ThemeSyncer` en `App.jsx` lo aplica automáticamente al iniciar sesión.

- **Fix selector de mes incompatible con iOS Safari** — `input[type="month"]` reemplazado por `MonthYearPicker` (componente nuevo en `MetricsPage.jsx`) — dos `Select` MUI (mes + año). Funciona en todos los browsers. Años: 2024 → actual. Meses futuros deshabilitados. Aplicado en `MonthlyBalanceCard` y `ProductsBarChartCard`.

- **Collapse en alertas de stock** — `MetricsPage.jsx`: primeros 10 visibles, resto en `Collapse`. Estado `expandedStock` en `MetricsPage`. Botón "Ver todos / Ver menos" en rojo `#E63946`. Constante `STOCK_VISIBLE_LIMIT = 10`.

- **Método de pago renombrado** — "Mercado Pago" → "Mercado Pago - Posnet" en `SaleModal.jsx` (`PAYMENT_METHODS`) y `DashboardPage.jsx` (`PAYMENT_COLORS`).

- **Guardar Tema — eliminado** — `ConfigPage.jsx`: botón "Guardar tema" removido. `handleSelectTheme` ahora guarda automáticamente vía `PUT /tenants/current` al hacer click. Si falla, revierte el preview. Removidos: `savingTheme` state, `handleSaveTheme()`, `CircularProgress` import.

- **Alerta de bajo stock: umbral 30 → 3** — `metrics.service.js` `LOW_STOCK_THRESHOLD = 3`. Texto en `MetricsPage.jsx` actualizado: "Menos de 3 unidades".

- **Nuevo tema "Huevos Point"** — `client/src/theme/themes.js`:
  - `primary`: `#004aad` (azul profundo) → drives buttons, card borders, focused inputs, table headers
  - `secondary`: `#fd904a` (naranja) → accent, chips
  - `background.default`: `#fff2d9` (crema cálido — `#ff2d9` original era hex inválido de 5 chars)
  - `sidebar.bg`: gradiente `#003080 → #004aad`
  - `sidebar.accent` + `sidebar.avatar`: `#fd904a` (naranja — íconos activos, avatar)
  - `sidebar.chip`: `#fff2d9` bg / `#004aad` texto

### Recientemente implementado (sesión 2026-05-14 — parte 2: escalabilidad + WhatsApp)

- **Pool DB aumentado** — `server/src/config/database.js`: `pool.max` de 5 → 20. Pendiente del usuario: migrar Supabase connection string a Transaction Pooler (puerto 6543).

- **Paginación en sales.repository.js** — `findAll()` ahora acepta `filters.limit` (cap 500, default 100) y `filters.offset`. Antes era unbounded.

- **LIMIT en metrics.service.js** — `getLowStockProducts()` ahora incluye `limit: 500`.

- **Optimización audit.repository.js** — eliminado JOIN a `User` model en `findAndCountAll` (era innecesario, datos de usuario no se mostraban en auditoría).

- **3 índices nuevos en cold-start** — `sale_items_product_sale_idx`, `purchases_category_id_idx`, `products_category_id_idx`. En `server/api/index.js` y `server/src/server.js`.

- **Cron schedule actualizado** — `server/vercel.json`:
  ```json
  [
    { "path": "/api/cron/daily-summary", "schedule": "30 23 * * 0-5" },
    { "path": "/api/cron/daily-summary", "schedule": "30 17 * * 6" }
  ]
  ```
  `0-5` = Dom a Vie → 23:30 UTC = 20:30 BsAs. `6` = Sáb → 17:30 UTC = 14:30 BsAs.

- **Tests: 167/167 passing** — `summary.service.test.js` y `cron.controller.test.js` actualizados para nueva lógica de cron schedule.

### Recientemente implementado (sesión 2026-05-14)

- **Método de pago "Rappi"** — agregado a `PAYMENT_METHODS` en `SaleModal.jsx`. No requirió cambio en backend (campo es `VARCHAR` libre).

- **Fix migración cold-start** — `server/src/server.js` y `server/api/index.js`: el `DELETE FROM products WHERE is_active = false AND units_per_presentation > 1` se ejecutaba ANTES del `ALTER TABLE ADD COLUMN units_per_presentation`, causando crash en DB nueva. Movido después del ALTER TABLE.

- **Fix timestamps en `subscription_plans`** — INSERT no incluía `created_at`/`updated_at`. La tabla existía en DB sin DEFAULT → NULL violation. Fix: agregar `now(), now()` explícito en INSERT en ambos entry points.

- **RLS implementado en 19 tablas** — `docs/rls-migration.sql` ejecutado en Supabase (project `oapzgiqcjkagiysjgvdl`). Todas las tablas tienen `rls_enabled = true` y `rls_forced = true`. Mecanismo: `SET app.tenant_id` + `SET app.role` vía `rlsMiddleware`. Funciones helper: `app_tenant_id()`, `app_role()`, `is_superadmin()`.

- **Fix bug eggCategories.service.js `remove()`** — `Purchase.update` y `Product.update` ahora incluyen `tenantId` en el `where`. El comentario anterior (FK global, no filtrar) era incorrecto.

- **`rlsMiddleware` integrado en authMiddleware** — el array `module.exports` en `authMiddleware.js` pasó de `[jwtVerify, tenantMiddleware]` a `[jwtVerify, tenantMiddleware, rlsMiddleware]`.

- **Fix test security.test.js post-RLS** — `rlsMiddleware` importaba `{ sequelize }` de `../models` pero ese mock no exporta `sequelize`. Cambiado a `require('../config/database')` que sí está mockeado con `query: jest.fn()`.

### Recientemente implementado (sesión 2026-05-04 — parte 2)
- **Eliminar todos los productos cargados** — botón "Eliminar todos" en Tab "Productos Cargados" (visible solo para admin cuando hay productos). Endpoint `DELETE /api/products/bulk` → soft-delete de todos los productos genéricos del tenant.
- **Carga .xlsx reemplaza productos anteriores** — `processBulkStock` ahora soft-deletea todos los genéricos del tenant antes de insertar los nuevos. La carga es replace, no merge.
- **Compras multi-ítem** — nuevo endpoint `POST /api/purchases/bulk`. Acepta `{ items: [...], receiptData, receiptMimeType }`. Cada ítem puede tener `categoryId` o `productId`. Todo en una única transacción atómica. El endpoint `/bulk` va antes de `/:id` en la ruta.
- **PurchaseModal rediseñado** — fecha compartida para todo el lote. Tab Huevos: lista dinámica con "+ Agregar categoría" y botón quitar. Tab Genérico: lista dinámica con "+ Agregar producto" y Autocomplete por ítem. Botón confirmar muestra conteo de ítems. Comprobante es uno por lote.
- **Fix test purchases.service.test.js** — el test fallaba por error preexistente: el mock de `../../config/database` no incluía `define`, que es llamado por `../../models` al importarse. Solucionado mockeando `../../models` directamente con `{ EggCategory: { findOne: jest.fn() }, Product: { findOne: jest.fn() } }`. Se agregaron 9 tests nuevos para `createPurchaseBulk`.

---

## Decisiones Técnicas Registradas

1. **Stock en egg_categories, no en products** — los productos son solo "presentaciones de precio", el stock real vive en la categoría en unidades base (huevos).

2. **Hard-delete categorías, soft-delete presentaciones** — la categoría se elimina físicamente para evitar conflicts con el índice parcial. Los productos de presentación se marcan `isActive: false` + `categoryId: null`.

3. **Nullear FK en purchases y products al eliminar categoría** — ambas tablas tienen `category_id REFERENCES egg_categories(id)` sin CASCADE. Los updates de limpieza de FK en `remove()` filtran por `tenantId` (seguro: `egg_categories.id` es PK SERIAL global, el filtro es check extra de seguridad). Todo en transacción.

4. **Constraint UNIQUE global eliminada** — la tabla `products` y `egg_categories` solo tienen índice parcial `WHERE is_active = true`. Esto permite recrear una categoría con el mismo nombre después de eliminarla.

5. **subscriptionCheck corre antes de authMiddleware** — por diseño en app.js. En consecuencia, si el tenant no tiene subscripción activa y NO es superadmin, recibe 402. El bypass superadmin requiere que req.user esté seteado (lo que no ocurre aún en subscriptionCheck). Esto es un bug conocido: subscriptionCheck es inefectivo para las rutas con authMiddleware por ruta.

6. **Compras por cajón, no por unidad** — el campo `quantity` en purchases es DECIMAL(10,2) para admitir fracciones (0.5, 1.5 cajones).

7. **Precios de venta en Stock, no en Compras** — las compras solo registran costo. Los precios de venta se editan por presentación desde la sección Stock.

8. **API pública estrictamente read-only** — toda mutación requiere JWT de panel admin. La API pública (`/api/public/v1`) es solo para sistemas satélites (ERP, BI, mobile).

---

## Convenciones del Proyecto

### Backend
- **`authMiddleware`** exporta array `[jwtVerify, tenantMiddleware, rlsMiddleware]`. Todo middleware JWT automáticamente setea contexto RLS en Postgres.
- **`rlsMiddleware`** (`server/src/middlewares/rlsMiddleware.js`) — Opción B (SET de sesión). Setea `app.tenant_id` y `app.role` en la conexión PostgreSQL. Importa desde `../config/database` (no `../models`) para compatibilidad con mocks de tests.
- **Respuestas API:** `{ success: bool, data: any, message?: string, error?: string }`
- **Errores operacionales:** `throw new AppError(message, statusCode)` — nunca `res.status().json()` en catch
- **Queries multi-tenant:** siempre incluir `tenantId` en `where`
- **Transacciones:** toda operación con múltiples writes usa `sequelize.transaction()`
- **Migraciones:** idempotentes en `server/api/index.js`. Usar `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`
- **Soft delete:** `isActive: false` — nunca DELETE físico en productos/usuarios activos
- **DECIMAL de Sequelize vienen como strings** — siempre usar `parseFloat(field) || 0` antes de operar aritméticamente. `field || 0` puede devolver el string truthy y causar concatenación (`"0.00" + 5 = "0.005"`). Aplica a `stockQuantity`, `stockUnits`, `cost`, `unitPrice`, etc.

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

### Deuda pendiente
- Testear flujo completo eliminar → recrear categoría con el mismo nombre en producción
- El producto "Aceite" puede tener `stockQuantity = 0.01` en la BD (comprado antes del fix). Corregir desde tab "Productos Cargados" o eliminando y re-registrando la compra.
- **Transaction Pooler Supabase** — migrar env vars a puerto 6543 para aprovechar `pool.max: 20`.
