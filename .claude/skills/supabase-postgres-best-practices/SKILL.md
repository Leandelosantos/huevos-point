---
name: supabase-postgres-best-practices
description: Postgres performance optimization and best practices aplicadas al schema real de Huevos Point. Usar al diseñar queries, agregar índices, revisar N+1, o escalar la DB.
license: MIT
metadata:
  author: supabase (personalizado para Huevos Point)
  version: "1.0.0"
---

# Supabase Postgres Best Practices — Huevos Point

Guía de optimización de Postgres aplicada al schema real de Huevos Point. ORM: Sequelize con PostgreSQL. Deploy: Vercel serverless (conexiones efímeras).

## Schema de Huevos Point

| Tabla | Columnas clave | FKs | Notas |
|-------|---------------|-----|-------|
| `tenants` | id, name, is_active | — | Raíz del multi-tenant |
| `users` | id, username, role, tenant_id, is_active | tenant_id | ENUM role: superadmin/admin/employee |
| `user_tenants` | user_id, tenant_id | users, tenants | Many-to-many, sin timestamps |
| `products` | id, name, tenant_id, stock_quantity, unit_price, is_active | tenant_id | Soft delete con is_active |
| `sales` | id, user_id, tenant_id, total_amount, payment_method, sale_date | users, tenants | sale_date es DATE (no TIMESTAMP) |
| `sale_items` | id, sale_id, product_id, quantity, unit_price, subtotal, discount | sales, products | Sin timestamps |
| `expenses` | id, user_id, tenant_id, concept, amount, expense_date | users, tenants | expense_date es DATE |
| `purchases` | id, tenant_id, product_id, user_id, quantity, cost, price, margin_amount, purchase_date | tenants, products, users | Incluye receipt_data (TEXT) |
| `audit_logs` | id, user_id, tenant_id, action_type, entity, entity_id, previous_data (JSONB), new_data (JSONB) | users, tenants | JSONB para diff de cambios |

## Índices Críticos Faltantes (implementar via migración)

```sql
-- sales: consultas frecuentes por tenant + fecha (Dashboard, Metrics)
CREATE INDEX sales_tenant_date_idx ON sales (tenant_id, sale_date);

-- expenses: ídem para egresos
CREATE INDEX expenses_tenant_date_idx ON expenses (tenant_id, expense_date);

-- sale_items: JOIN desde sales para mostrar detalle
CREATE INDEX sale_items_sale_id_idx ON sale_items (sale_id);
CREATE INDEX sale_items_product_id_idx ON sale_items (product_id);

-- audit_logs: paginación por tenant
CREATE INDEX audit_logs_tenant_created_idx ON audit_logs (tenant_id, created_at DESC);

-- products: filtros de stock activo por tenant
CREATE INDEX products_tenant_active_idx ON products (tenant_id, is_active);

-- purchases: historial por tenant + fecha
CREATE INDEX purchases_tenant_date_idx ON purchases (tenant_id, purchase_date);
```

## Patrón Multi-Tenant en Sequelize

**TODAS las queries deben incluir `tenantId` en el `where`.** El middleware `tenantMiddleware` popula `req.tenantId`.

```js
// ✅ Correcto — siempre filtrar por tenantId
Sale.findAll({
  where: { tenantId, saleDate: { [Op.between]: [startDate, endDate] } },
  include: [{ model: SaleItem, include: [Product] }],
});

// ❌ Incorrecto — sin filtro de tenant expone datos cruzados
Sale.findAll({ where: { saleDate: { [Op.between]: [startDate, endDate] } } });
```

## Reglas Más Críticas Para Este Proyecto

### CRITICAL — Aplicar siempre

| Regla | Dónde aplica en Huevos Point |
|-------|------------------------------|
| `query-missing-indexes` | sales/expenses por (tenant_id, date), sale_items por sale_id |
| `schema-foreign-key-indexes` | Todos los FK sin índice explícito (sale_items, audit_logs) |
| `data-n-plus-one` | Dashboard carga sales + sale_items + products → usar `include` Sequelize |
| `security-rls-basics` | Tenemos aislamiento a nivel app (tenantMiddleware), no RLS nativo |

### HIGH — Importante

| Regla | Dónde aplica |
|-------|-------------|
| `query-composite-indexes` | (tenant_id, sale_date), (tenant_id, expense_date) |
| `lock-short-transactions` | purchases.service y sales.service usan transacciones — mantenerlas cortas |
| `data-pagination` | audit_logs usa OFFSET (paginación actual) → candidato a cursor pagination |
| `data-upsert` | purchases.service actualiza stock via `save()` dentro de transacción |

### MEDIUM — Optimización futura

| Regla | Dónde aplica |
|-------|-------------|
| `conn-pooling` | Vercel serverless: cada invocación abre conexión — usar PgBouncer/Supabase pooler |
| `conn-idle-timeout` | Sequelize pool config en `config/database.js` |
| `advanced-jsonb-indexing` | `audit_logs.previous_data` / `new_data` si se añaden búsquedas sobre cambios |
| `query-partial-indexes` | `products WHERE is_active = true` — partial index ahorraría espacio |

## N+1 Detectados en el Proyecto

### Dashboard — sales.service o dashboard.service

```js
// ❌ Riesgo N+1: si se itera sobre sales para cargar items
const sales = await Sale.findAll({ where: { tenantId, saleDate } });
for (const sale of sales) {
  const items = await SaleItem.findAll({ where: { saleId: sale.id } }); // N queries!
}

// ✅ Correcto: eager loading con include
const sales = await Sale.findAll({
  where: { tenantId, saleDate },
  include: [{
    model: SaleItem,
    include: [{ model: Product, attributes: ['name'] }],
  }],
});
```

## Transacciones — Ventas y Compras

```js
// ✅ Patrón correcto en sales.service y purchases.service
const t = await sequelize.transaction();
try {
  // Operaciones cortas — no hacer queries lentas dentro
  await Product.findOne({ where: { id, tenantId }, lock: t.LOCK.UPDATE, transaction: t });
  await SaleItem.bulkCreate(items, { transaction: t });
  await t.commit();
} catch (err) {
  await t.rollback();
  throw err;
}
```

**Regla:** mantener el bloque de transacción lo más corto posible. No hacer llamadas HTTP, cálculos pesados, ni queries no relacionadas dentro del bloque.

## RLS — Contexto del Proyecto

Huevos Point usa **aislamiento a nivel aplicación** mediante `tenantMiddleware` que popula `req.tenantId`. No usa Postgres RLS nativo.

**Si en el futuro se migra a Supabase Auth**, implementar RLS así:

```sql
-- Ejemplo para sales con RLS nativo
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY sales_tenant_policy ON sales
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id')::integer);
```

Por ahora, garantizar que **todo service** pase `tenantId` al `where` es el equivalente aplicativo.

## Cómo Usar Esta Skill

Leer reglas individuales para SQL detallado y ejemplos:

```
rules/query-missing-indexes.md      ← CRÍTICO: índices faltantes
rules/schema-foreign-key-indexes.md ← CRÍTICO: FK sin índice
rules/data-n-plus-one.md            ← CRÍTICO: N+1 en sales/dashboard
rules/data-pagination.md            ← audit_logs paginación
rules/lock-short-transactions.md    ← transacciones en sales/purchases
rules/conn-pooling.md               ← Vercel serverless
rules/query-composite-indexes.md    ← (tenant_id, date) compuestos
rules/security-rls-basics.md        ← referencia para migración futura a RLS
```

Para el documento completo compilado: `AGENTS.md`

## Agregar Índices — Template de Migración Sequelize

```js
// server/src/migrations/YYYYMMDDHHMMSS-add-performance-indexes.js
'use strict';
module.exports = {
  async up(queryInterface) {
    await queryInterface.addIndex('sales', ['tenant_id', 'sale_date'],
      { name: 'sales_tenant_date_idx', concurrently: true });
    await queryInterface.addIndex('expenses', ['tenant_id', 'expense_date'],
      { name: 'expenses_tenant_date_idx', concurrently: true });
    await queryInterface.addIndex('sale_items', ['sale_id'],
      { name: 'sale_items_sale_id_idx', concurrently: true });
    await queryInterface.addIndex('audit_logs', ['tenant_id', 'created_at'],
      { name: 'audit_logs_tenant_created_idx', concurrently: true });
    await queryInterface.addIndex('products', ['tenant_id', 'is_active'],
      { name: 'products_tenant_active_idx', concurrently: true, where: { is_active: true } });
  },
  async down(queryInterface) {
    await queryInterface.removeIndex('sales', 'sales_tenant_date_idx');
    await queryInterface.removeIndex('expenses', 'expenses_tenant_date_idx');
    await queryInterface.removeIndex('sale_items', 'sale_items_sale_id_idx');
    await queryInterface.removeIndex('audit_logs', 'audit_logs_tenant_created_idx');
    await queryInterface.removeIndex('products', 'products_tenant_active_idx');
  },
};
```