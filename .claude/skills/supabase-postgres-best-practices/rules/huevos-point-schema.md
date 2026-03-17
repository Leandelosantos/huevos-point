---
title: Huevos Point — Schema, Índices y Patrones de Query
impact: CRITICAL
impactDescription: Referencia rápida del schema real para optimizar queries y evitar N+1
tags: schema, indexes, multi-tenant, sequelize, huevos-point
---

## Huevos Point — Schema Real y Patrones de Query

Referencia de las tablas reales del proyecto con las queries más frecuentes y sus índices recomendados.

---

### Tablas y Consultas Frecuentes

#### `sales` + `sale_items` + `products`
Consultas más frecuentes: Dashboard diario, Metrics mensual.

```sql
-- Dashboard: ventas del día por tenant (query crítica, se ejecuta en cada carga)
SELECT s.*, si.product_id, si.quantity, si.unit_price, si.subtotal, si.discount
FROM sales s
JOIN sale_items si ON si.sale_id = s.id
JOIN products p ON p.id = si.product_id
WHERE s.tenant_id = $1
  AND s.sale_date = $2;

-- Índices recomendados:
CREATE INDEX sales_tenant_date_idx ON sales (tenant_id, sale_date);
CREATE INDEX sale_items_sale_id_idx ON sale_items (sale_id);
CREATE INDEX sale_items_product_id_idx ON sale_items (product_id);
```

**En Sequelize (evitar N+1):**
```js
Sale.findAll({
  where: { tenantId, saleDate },
  include: [{
    model: SaleItem,
    include: [{ model: Product, attributes: ['id', 'name'] }],
  }],
  order: [['createdAt', 'DESC']],
});
```

---

#### `expenses`
Consultas frecuentes: Dashboard diario, Metrics mensual.

```sql
-- Egresos del día por tenant
SELECT * FROM expenses
WHERE tenant_id = $1 AND expense_date = $2;

-- Suma mensual
SELECT SUM(amount) FROM expenses
WHERE tenant_id = $1
  AND expense_date BETWEEN $2 AND $3;

-- Índice recomendado:
CREATE INDEX expenses_tenant_date_idx ON expenses (tenant_id, expense_date);
```

---

#### `products`
Consultas frecuentes: Stock activo, Low stock alert, Dropdown en SaleModal.

```sql
-- Productos activos por tenant (dropdown ventas)
SELECT id, name, stock_quantity, unit_price
FROM products
WHERE tenant_id = $1 AND is_active = true
ORDER BY name;

-- Partial index recomendado (solo productos activos):
CREATE INDEX products_tenant_active_idx ON products (tenant_id)
  WHERE is_active = true;
```

---

#### `audit_logs`
Consultas frecuentes: AuditPage con paginación.

```sql
-- Logs paginados por tenant (OFFSET actual — candidato a cursor pagination)
SELECT * FROM audit_logs
WHERE tenant_id = $1
ORDER BY created_at DESC
LIMIT 50 OFFSET $2;

-- Con cursor pagination (más eficiente):
SELECT * FROM audit_logs
WHERE tenant_id = $1
  AND created_at < $cursor_created_at
ORDER BY created_at DESC
LIMIT 50;

-- Índice recomendado:
CREATE INDEX audit_logs_tenant_created_idx ON audit_logs (tenant_id, created_at DESC);
```

---

#### `purchases`
Consultas frecuentes: PurchasesPage, historial de compras.

```sql
-- Compras por tenant con producto y usuario
SELECT pu.*, p.name AS product_name, u.full_name AS user_name
FROM purchases pu
JOIN products p ON p.id = pu.product_id
JOIN users u ON u.id = pu.user_id
WHERE pu.tenant_id = $1
ORDER BY pu.purchase_date DESC;

-- Índice recomendado:
CREATE INDEX purchases_tenant_date_idx ON purchases (tenant_id, purchase_date DESC);
```

---

### FK Sin Índice Automático (Postgres no los crea solo)

Estos FK deben tener índice explícito:

```sql
-- sale_items (JOIN frecuente desde sales)
CREATE INDEX sale_items_sale_id_idx ON sale_items (sale_id);
CREATE INDEX sale_items_product_id_idx ON sale_items (product_id);

-- audit_logs
CREATE INDEX audit_logs_user_id_idx ON audit_logs (user_id);

-- sales
CREATE INDEX sales_user_id_idx ON sales (user_id);

-- expenses
CREATE INDEX expenses_user_id_idx ON expenses (user_id);
```

---

### Transacciones Críticas

#### `sales.service.createSale`
Operaciones en una transacción: SELECT FOR UPDATE del producto → reducir stock → INSERT sale → bulkCreate sale_items → COMMIT.

**Regla:** no hacer validaciones lentas dentro del bloque. Validar stock disponible antes de iniciar la transacción cuando sea posible.

#### `purchases.service.createPurchase`
Operaciones: SELECT FOR UPDATE del producto → sumar stock → actualizar precio → INSERT purchase → COMMIT.

---

### Queries de Diagnóstico Útiles

```sql
-- Ver índices faltantes en FK del proyecto
SELECT
  conrelid::regclass AS table_name,
  a.attname AS fk_column
FROM pg_constraint c
JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
WHERE c.contype = 'f'
  AND NOT EXISTS (
    SELECT 1 FROM pg_index i
    WHERE i.indrelid = c.conrelid AND a.attnum = ANY(i.indkey)
  );

-- Ver sequential scans (tablas con acceso lento sin índice)
SELECT schemaname, relname, seq_scan, idx_scan
FROM pg_stat_user_tables
WHERE seq_scan > idx_scan
ORDER BY seq_scan DESC;

-- Queries lentas (requiere pg_stat_statements activo)
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 20;
```