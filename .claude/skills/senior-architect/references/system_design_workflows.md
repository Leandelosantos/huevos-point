# Workflows de Diseño de Sistema — Huevos Point

## Workflow: Agregar un Nuevo Módulo

Checklist completo para agregar un dominio nuevo (ej: `reports`):

### 1. Modelo Sequelize
```js
// server/src/models/Report.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Report = sequelize.define('Report', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  tenantId: { type: DataTypes.INTEGER, allowNull: false },  // ← OBLIGATORIO
  // ... campos del dominio
}, {
  tableName: 'reports',
  timestamps: true,
  underscored: true,
});

module.exports = Report;
```

### 2. Asociaciones en models/index.js
```js
// server/src/models/index.js — agregar:
const Report = require('./Report');
Tenant.hasMany(Report, { foreignKey: 'tenantId', as: 'reports' });
Report.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
module.exports = { ..., Report };
```

### 3. Migración en api/index.js
```js
// server/api/index.js — dentro del migrationPromise:
const [reportCols] = await sequelize.query(`
  SELECT table_name FROM information_schema.tables WHERE table_name = 'reports'
`);
if (reportCols.length === 0) {
  await sequelize.query(`
    CREATE TABLE reports (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL REFERENCES tenants(id),
      -- ... campos
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
}
```

### 4. Repository (si hay queries complejas)
```js
// server/src/modules/reports/reports.repository.js
const { Report } = require('../../models');

const findAll = async (tenantId, filters = {}) => {
  return Report.findAll({ where: { tenantId, ...filters } });
};

module.exports = { findAll };
```

### 5. Service
```js
// server/src/modules/reports/reports.service.js
const AppError = require('../../utils/AppError');
const reportsRepository = require('./reports.repository');

const getReports = async (tenantId, filters) => {
  return reportsRepository.findAll(tenantId, filters);
};

module.exports = { getReports };
```

### 6. Controller
```js
// server/src/modules/reports/reports.controller.js
const reportsService = require('./reports.service');

const getReports = async (req, res, next) => {
  try {
    const data = await reportsService.getReports(req.tenantId, req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

module.exports = { getReports };
```

### 7. Routes
```js
// server/src/modules/reports/reports.routes.js
const router = require('express').Router();
const authMiddleware = require('../../middlewares/authMiddleware');
const tenantMiddleware = require('../../middlewares/tenantMiddleware');
const { requireRole } = require('../../middlewares/roleMiddleware');
const reportsController = require('./reports.controller');

router.get('/', authMiddleware, tenantMiddleware, requireRole('admin'), reportsController.getReports);

module.exports = router;
```

### 8. Registrar en app.js
```js
// server/src/app.js
const reportsRoutes = require('./modules/reports/reports.routes');
app.use('/api/reports', reportsRoutes);
```

### 9. Validación (si hay POST/PUT)
```js
// server/src/middlewares/validationMiddleware.js — agregar:
const validateReport = [
  body('title').notEmpty().withMessage('El título es requerido'),
  handleValidationErrors,
];
module.exports = { ..., validateReport };
```

### 10. Página en el frontend
```
client/src/pages/ReportsPage.jsx
client/src/components/reports/ReportModal.jsx
```

---

## Workflow: Agregar una Columna a una Tabla Existente

### 1. Actualizar el modelo Sequelize
```js
// models/Sale.js — agregar el campo
notes: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
```

### 2. Agregar migración en api/index.js
```js
// api/index.js — dentro del migrationPromise, SIEMPRE idempotente:
const [notesCols] = await sequelize.query(`
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'sales' AND column_name = 'notes'
`);
if (notesCols.length === 0) {
  await sequelize.query(`ALTER TABLE sales ADD COLUMN notes TEXT DEFAULT NULL`);
  console.log('[migration] notes added to sales');
}
```

**Reglas de migración:**
- SIEMPRE verificar con `information_schema` antes del ALTER
- Nuevas columnas: `DEFAULT NULL` para no romper filas existentes
- Columna NOT NULL: solo si tiene un DEFAULT válido o se migran los datos existentes
- El commit debe incluir modelo + migración juntos

---

## Workflow: Agregar un Nuevo Rol o Permiso

El sistema tiene 3 roles: `superadmin` | `admin` | `employee`.

**Si hay que agregar restricciones por acción (no por rol):**
```js
// roleMiddleware.js soporta múltiples roles:
requireRole('admin', 'superadmin')  // admin O superadmin pasan
requireRole('admin')                // solo admin y superadmin (superadmin siempre pasa)
```

**Si hay que agregar un rol nuevo (ej: `manager`):**
1. Agregar a la columna `role` en el modelo `User`
2. Actualizar `roleMiddleware` si hay lógica nueva
3. Actualizar el JWT payload en `auth.service`
4. Actualizar `AuthContext` en frontend si se usa `isAdmin` etc.

---

## Workflow: Agregar un Cron Job

### 1. Crear el handler en cron.controller.js o summary.service.js
```js
// server/src/modules/cron/cron.controller.js
const weeklySummary = async (req, res, next) => {
  try {
    const secret = req.headers['x-cron-secret'];
    if (secret !== env.CRON_SECRET) throw new AppError('No autorizado', 401);
    await summaryService.sendWeeklySummary();
    res.json({ success: true, message: 'Weekly summary enviado' });
  } catch (error) {
    next(error);
  }
};
```

### 2. Agregar la ruta
```js
// cron.routes.js
router.get('/weekly-summary', cronController.weeklySummary);
```

### 3. Registrar en vercel.json
```json
{
  "crons": [
    { "path": "/api/cron/daily-summary",  "schedule": "0 2 * * *"  },
    { "path": "/api/cron/weekly-summary", "schedule": "0 2 * * 1"  }
  ]
}
```
> Horario en **UTC**. Argentina (ART) = UTC-3. 2:00 AM UTC = 23:00 ART del día anterior.

---

## Workflow: Integrar un Servicio Externo (Email, Pagos, etc.)

### Patrón: servicio en utils/
```js
// server/src/utils/mailer.js — patrón existente
const nodemailer = require('nodemailer');
const env = require('../config/environment');

const sendMail = async ({ to, subject, html }) => {
  if (!env.SMTP_HOST) return; // deshabilitado si no hay config
  // ...
};
module.exports = { sendMail };
```

**Reglas:**
- Si la variable de entorno no está → el servicio falla silenciosamente (no rompe el flujo principal)
- Nunca en el request principal si puede ser lento → usar background o cron
- Credenciales siempre desde `env.*` nunca hardcodeadas

---

## Workflow: Escalar un Módulo de Alta Carga

El proyecto actual puede manejar carga media con el stack actual. Si una ruta específica se vuelve lenta:

### Opción 1: Índices en PostgreSQL (primer paso siempre)
```sql
-- Para queries filtradas por tenantId + fecha
CREATE INDEX idx_sales_tenant_date ON sales(tenant_id, sale_date);
CREATE INDEX idx_expenses_tenant_date ON expenses(tenant_id, expense_date);
```
Agregar como migración en `api/index.js`.

### Opción 2: Paginación en endpoints de lista
```js
// Controller → extraer page/limit
const { page = 1, limit = 50 } = req.query;

// Repository → agregar offset/limit
Sale.findAndCountAll({
  where: { tenantId },
  limit: parseInt(limit),
  offset: (parseInt(page) - 1) * parseInt(limit),
});
```

### Opción 3: Separar en un módulo de reporting
Si los queries de métricas/dashboard son lentos, considerar:
- Vistas materializadas en PostgreSQL
- Tabla de resúmenes diarios precalculados (actualizada por cron)
- Mantener el módulo de métricas leyendo de la tabla de resúmenes

### Cuándo NO escalar a microservicios
El monolito modular es correcto mientras:
- Un solo equipo mantiene el proyecto
- El deploy es simple (Vercel)
- No hay requisitos de escala horizontal por módulo independiente
- No hay SLAs separados por dominio

---

## Checklist Antes de Desplegar un Nuevo Módulo

```
□ Modelo con tenantId FK
□ Asociaciones en models/index.js
□ Migración idempotente en api/index.js
□ Routes con authMiddleware + tenantMiddleware
□ Rutas de admin con requireRole
□ Validación con express-validator
□ Controller usa next(error) en catch
□ Queries incluyen tenantId en where
□ Ruta registrada en app.js
□ Variables de entorno nuevas en .env.example
□ Tests unitarios del service
□ Build del cliente sin errores
```