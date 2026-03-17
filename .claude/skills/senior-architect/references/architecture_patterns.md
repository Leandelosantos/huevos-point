# Patrones de Arquitectura — Huevos Point

## Patrón Principal: Modular Monolith

El backend es un **monolito modular**: un solo proceso Express con módulos independientes por dominio. No es microservicios. Esta decisión es correcta para el tamaño actual del proyecto.

```
Express App (monolito)
├── /api/auth        ← módulo auth
├── /api/sales       ← módulo sales
├── /api/purchases   ← módulo purchases
├── /api/metrics     ← módulo metrics
└── ...
```

Cada módulo es **autocontenido**:
```
modules/sales/
├── sales.routes.js      ← declara rutas, aplica middlewares
├── sales.controller.js  ← extrae params, llama service, responde
├── sales.service.js     ← lógica de negocio, transacciones
└── sales.repository.js  ← queries Sequelize (si hay lógica de DB compleja)
```

---

## Capas y Responsabilidades

### Routes (`*.routes.js`)
```js
// Solo: aplicar middlewares + conectar controller
router.post('/', authMiddleware, tenantMiddleware, validateSale, salesController.createSale);
```
- Aplica `authMiddleware` → `tenantMiddleware` → `validateSale` → controller
- NO tiene lógica de negocio
- NO accede a modelos directamente

### Controller (`*.controller.js`)
```js
// Solo: extraer req, llamar service, responder
const createSale = async (req, res, next) => {
  try {
    const data = await salesService.registerSale(req.user.id, req.body.items, req.body.paymentMethod, req.tenantId, req.body.saleDate);
    res.status(201).json({ success: true, data, message: 'Venta registrada' });
  } catch (error) {
    next(error); // SIEMPRE next(error), nunca res.json en catch
  }
};
```
- Extrae parámetros de `req` (user, body, tenantId)
- Delega al service
- Formatea la respuesta
- Llama `next(error)` en catch

### Service (`*.service.js`)
```js
// Lógica de negocio + transacciones Sequelize
const registerSale = async (userId, items, paymentMethod, tenantId, saleDate) => {
  const transaction = await sequelize.transaction();
  try {
    // ... lógica con transacción
    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback();
    throw error; // re-throw para errorMiddleware
  }
};
```
- Toda la lógica de negocio aquí
- Transacciones atómicas para operaciones múltiples
- Lanza `AppError` para errores operacionales
- No accede a `req`/`res`

### Repository (`*.repository.js`)
```js
// Solo: queries complejas o reutilizables
const findAll = async (tenantId, filters) => {
  return Sale.findAll({
    where: { tenantId, ...buildFilters(filters) },
    include: [{ model: SaleItem, as: 'items', include: [{ model: Product, as: 'product' }] }],
    order: [['saleDate', 'DESC']],
  });
};
```
- Usado cuando el service tiene queries complejas o repetidas
- No todos los módulos lo necesitan (dashboard.service accede a modelos directo)

---

## Multi-Tenant

### Cómo funciona
1. Cliente envía header `x-tenant-id: 1` en cada request
2. `authMiddleware` valida JWT y puebla `req.user`
3. `tenantMiddleware` valida que `x-tenant-id` pertenece a `req.user.tenants`
4. Controller pasa `req.tenantId` al service
5. Service incluye `tenantId` en **todos** los queries

```js
// tenantMiddleware.js — simplificado
const tenantId = parseInt(req.headers['x-tenant-id']);
const userTenants = req.user.tenants || [];
if (!userTenants.includes(tenantId) && req.user.role !== 'superadmin') {
  throw new AppError('Acceso denegado a este tenant', 403);
}
req.tenantId = tenantId;
```

### Aislamiento de datos
```js
// SIEMPRE incluir tenantId en where
const sales = await Sale.findAll({ where: { tenantId, saleDate: date } }); // ✅
const sales = await Sale.findAll({ where: { saleDate: date } }); // ❌ DATA LEAK
```

### Modelo de datos multi-tenant
```
tenants ──┬── products (tenantId FK)
          ├── sales (tenantId FK)
          ├── expenses (tenantId FK)
          └── purchases (tenantId FK)

users ──── user_tenants (M:N junction) ──── tenants
```

---

## Autenticación y Autorización

### Flujo JWT
```
POST /api/auth/login
  → auth.service.login → bcrypt.compare → jwt.sign({ id, username, role, tenants })
  → responde { token, user }

Requests autenticadas:
  Header: Authorization: Bearer <token>
  → authMiddleware: jwt.verify → req.user = { id, username, role, tenants }
  → tenantMiddleware: valida x-tenant-id ∈ user.tenants
```

### Roles y middleware
```js
// roleMiddleware.js
const requireRole = (...roles) => (req, res, next) => {
  if (req.user.role === 'superadmin') return next(); // siempre pasa
  if (!roles.includes(req.user.role)) throw new AppError('No autorizado', 403);
  next();
};

// Uso en routes:
router.delete('/:id', authMiddleware, tenantMiddleware, requireRole('admin'), controller.delete);
```

---

## Manejo de Errores

### AppError — errores operacionales
```js
// utils/AppError.js
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}
```

### errorMiddleware — handler global
```js
// Centralizado: todos los errores llegan aquí vía next(error)
app.use(errorMiddleware);

// Operacional → statusCode del AppError + mensaje visible
// No operacional (bug) → 500 + "Error interno del servidor"
// Sequelize ValidationError → 400 + primer mensaje de validación
```

### Patrón consistente en controllers
```js
} catch (error) {
  next(error); // SIEMPRE — nunca res.json en catch
}
```

---

## Despliegue Vercel Serverless

### Entrada
```
server/api/index.js  →  vercel.json routes → handler
```

### Migraciones en cold start
```js
// api/index.js — corre en cada cold start, idempotente
const migrationPromise = (async () => {
  // verificar con information_schema antes de ALTER TABLE
  const [cols] = await sequelize.query(`SELECT column_name FROM information_schema.columns WHERE ...`);
  if (cols.length === 0) await sequelize.query(`ALTER TABLE ... ADD COLUMN ...`);
})();
```

### Cron jobs
```json
// server/vercel.json
{
  "crons": [{ "path": "/api/cron/daily-summary", "schedule": "0 2 * * *" }]
}
```
El horario es **UTC** — 2:00 AM UTC = 23:00 ART (hora Argentina).

---

## Modelos Sequelize

### Convenciones
```js
// models/Sale.js — patrón
module.exports = sequelize.define('Sale', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  tenantId: { type: DataTypes.INTEGER, allowNull: false },
  totalAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  saleDate: { type: DataTypes.DATEONLY, allowNull: false },
}, {
  tableName: 'sales',
  timestamps: true,           // createdAt / updatedAt automáticos
  underscored: true,          // camelCase JS → snake_case DB
});
```

### Asociaciones — en models/index.js
```js
// Todas las asociaciones centralizadas
Sale.hasMany(SaleItem, { foreignKey: 'saleId', as: 'items', onDelete: 'CASCADE' });
SaleItem.belongsTo(Sale, { foreignKey: 'saleId', as: 'sale' });
Tenant.hasMany(Sale, { foreignKey: 'tenantId', as: 'sales' });
```