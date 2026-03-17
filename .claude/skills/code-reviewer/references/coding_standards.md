# Estándares de Código — Huevos Point

## Estructura de Archivos

```
test-agy2/
├── client/src/
│   ├── pages/          # Una página por ruta (DashboardPage, StockPage, etc.)
│   ├── components/     # Subdirectorios por dominio (sales/, expenses/, stock/, etc.)
│   ├── hooks/          # Custom hooks reutilizables
│   ├── services/api.js # Instancia axios con baseURL e interceptores
│   ├── context/        # AuthContext (user, isAdmin, isSuperAdmin, activeTenant)
│   ├── utils/
│   │   ├── sweetAlert.js    # Toasts y alertas
│   │   └── formatters.js    # CURRENCY_FORMAT compartido
│   └── theme/
├── server/src/
│   ├── modules/<modulo>/
│   │   ├── <modulo>.routes.js
│   │   ├── <modulo>.controller.js
│   │   ├── <modulo>.service.js
│   │   └── <modulo>.repository.js  (si aplica)
│   ├── models/          # Modelos Sequelize
│   ├── middlewares/     # authMiddleware, roleMiddleware, validationMiddleware, errorMiddleware
│   ├── config/          # database.js, environment.js
│   └── utils/           # AppError.js, auditLogger.js, mailer.js
└── server/api/index.js  # Entrada Vercel + migraciones de inicio
```

## Naming Conventions

| Elemento | Convención | Ejemplo |
|---------|-----------|---------|
| Archivos React | PascalCase | `SaleModal.jsx`, `DashboardPage.jsx` |
| Archivos Node.js | kebab-case | `auth.service.js`, `sales.routes.js` |
| Variables/funciones JS | camelCase | `fetchProducts`, `totalAmount` |
| Constantes | UPPER_SNAKE_CASE | `CURRENCY_FORMAT`, `LOW_STOCK_THRESHOLD` |
| Modelos Sequelize | PascalCase | `Sale`, `SaleItem`, `Product` |
| Tablas BD | snake_case | `sales`, `sale_items`, `user_tenants` |
| Campos BD | snake_case | `tenant_id`, `sale_date`, `is_active` |
| Props React | camelCase | `onSuccess`, `tenantId`, `isAdmin` |

## Patrones de Código

### Controller (backend)
```js
const createSale = async (req, res, next) => {
  try {
    const data = await salesService.createSale({
      ...req.body,
      tenantId: req.tenantId,
      userId: req.user.id,
    });
    res.status(201).json({ success: true, data, message: 'Venta registrada' });
  } catch (error) {
    next(error); // SIEMPRE next(error), nunca res.json en catch
  }
};
```

### Service con transacción (backend)
```js
const createPurchase = async (data) => {
  const t = await sequelize.transaction();
  try {
    const result = await repo.create(data, t);
    await product.update({ stockQuantity: newStock }, { transaction: t });
    await t.commit();
    return result;
  } catch (error) {
    await t.rollback();
    throw error; // re-throw para que llegue al errorMiddleware
  }
};
```

### Fetch en componente React
```jsx
const fetchData = useCallback(async () => {
  try {
    setLoading(true);
    const { data } = await api.get('/endpoint');
    setData(data.data);
  } catch {
    showErrorToast('Error al cargar los datos');
  } finally {
    setLoading(false);
  }
}, []);

useEffect(() => { fetchData(); }, [fetchData]);
```

### Formateo de moneda
```js
// CORRECTO: importar el formatter compartido
import { CURRENCY_FORMAT } from '../utils/formatters';
CURRENCY_FORMAT.format(amount);

// INCORRECTO: no definir localmente
const fmt = new Intl.NumberFormat(...); // ❌
```

## Manejo de Fechas

Siempre usar formato explícito para evitar desfase UTC/local:

```js
// Backend — fecha de hoy en Argentina
new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })
// → "2026-03-17"

// Frontend — fecha de hoy con dayjs
import dayjs from 'dayjs';
dayjs().format('YYYY-MM-DD')
// → "2026-03-17"

// Input date HTML (patrón del proyecto, sin librerías externas)
<input type="date" value={fecha} onChange={...} />  // ✅ formato YYYY-MM-DD nativo
<input type="month" value={ym} onChange={...} />    // ✅ para selección de mes
```

## Variables de Entorno

| Variable | Requerida en prod | Notas |
|---------|-----------------|-------|
| `JWT_SECRET` | ✅ Obligatoria | Lanza error fatal si falta en producción |
| `DATABASE_URL` | ✅ Obligatoria | PostgreSQL connection string |
| `CRON_SECRET` | ✅ Para cron jobs | Endpoint bloqueado si está vacío |
| `SMTP_*` | Opcional | Emails deshabilitados si está vacío |
| `CORS_ORIGIN` | Opcional | `true` acepta cualquier origen en prod |

## Respuestas API

```js
// Éxito con datos
res.json({ success: true, data: result });

// Éxito con mensaje
res.status(201).json({ success: true, data: result, message: 'Creado correctamente' });

// Error operacional (AppError) → status + mensaje visible
throw new AppError('Producto no encontrado', 404);

// Error no operacional → errorMiddleware devuelve 500
// { success: false, message: 'Error interno del servidor' }
```

## Commits — Conventional Commits

| Tipo | Cuándo usarlo |
|-----|--------------|
| `feat` | Nueva funcionalidad |
| `fix` | Corrección de bug |
| `refactor` | Cambio que no agrega ni corrige |
| `chore` | Configuración, dependencias |
| `docs` | Solo documentación |

Ejemplos:
```
feat(sales): add discount concept field to sale items
fix(auth): remove hardcoded JWT_SECRET fallback
refactor(metrics): extract CURRENCY_FORMAT to shared utils
chore(deps): remove unused xlsx package
```