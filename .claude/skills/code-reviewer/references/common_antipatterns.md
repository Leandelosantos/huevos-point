# Anti-patrones Comunes — Huevos Point

## Backend

### ❌ AppError importado dentro de función
```js
// MAL
const getPurchaseReceipt = async (id, tenantId) => {
  if (!purchase) {
    const AppError = require('../../utils/AppError'); // ❌ dentro de función
    throw new AppError('No encontrado', 404);
  }
};

// BIEN
const AppError = require('../../utils/AppError'); // ✅ al top del archivo
const getPurchaseReceipt = async (id, tenantId) => {
  if (!purchase) throw new AppError('No encontrado', 404);
};
```

### ❌ res.json() en catch en lugar de next(error)
```js
// MAL
} catch (error) {
  res.status(500).json({ success: false, message: error.message }); // ❌
}

// BIEN
} catch (error) {
  next(error); // ✅ el errorMiddleware maneja el formato
}
```

### ❌ Query sin tenantId
```js
// MAL — devuelve datos de todos los tenants
const sales = await Sale.findAll({ where: { saleDate: date } }); // ❌

// BIEN
const sales = await Sale.findAll({ where: { saleDate: date, tenantId } }); // ✅
```

### ❌ Operaciones múltiples sin transacción
```js
// MAL — si falla update del stock, la venta ya fue guardada
await SaleItem.bulkCreate(items);
await product.update({ stockQuantity: newStock }); // ❌ sin transacción

// BIEN
const t = await sequelize.transaction();
try {
  await SaleItem.bulkCreate(items, { transaction: t });
  await product.update({ stockQuantity: newStock }, { transaction: t });
  await t.commit();
} catch (err) {
  await t.rollback();
  throw err;
}
```

### ❌ JWT_SECRET con fallback hardcodeado
```js
// MAL — si no está la var, usa un secreto conocido
JWT_SECRET: process.env.JWT_SECRET || 'fallback_secret_change_me', // ❌

// BIEN — falla rápido en producción
if (NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET requerido en producción');
}
JWT_SECRET: process.env.JWT_SECRET, // ✅
```

### ❌ Migración no idempotente
```js
// MAL — falla si la columna ya existe
await sequelize.query('ALTER TABLE purchases ADD COLUMN receipt_data TEXT'); // ❌

// BIEN — verifica antes de agregar
const [cols] = await sequelize.query(`
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'purchases' AND column_name = 'receipt_data'
`);
if (cols.length === 0) {
  await sequelize.query('ALTER TABLE purchases ADD COLUMN receipt_data TEXT'); // ✅
}
```

---

## Frontend

### ❌ CURRENCY_FORMAT definido localmente
```js
// MAL — duplicado en cada archivo
const CURRENCY_FORMAT = new Intl.NumberFormat('es-AR', { // ❌
  style: 'currency', currency: 'ARS', minimumFractionDigits: 2,
});

// BIEN — importar el compartido
import { CURRENCY_FORMAT } from '../utils/formatters'; // ✅
```

### ❌ Variables de módulo para valores que cambian con el tiempo
```js
// MAL — se calculan una sola vez al cargar el módulo
const curMonthName = new Date().toLocaleString('es-ES', { month: 'long' }); // ❌

// BIEN — calcular dentro del componente para que se actualicen
const MetricsPage = () => {
  const curMonthName = new Date().toLocaleString('es-ES', { month: 'long' }); // ✅
  ...
};
```

### ❌ useEffect con fetch sin useCallback
```jsx
// MAL — fetchData se recrea en cada render → loop infinito
useEffect(() => {
  const fetchData = async () => { ... }; // ❌ definida dentro del effect
  fetchData();
}, [fetchData]); // fetchData siempre es nueva → re-ejecuta siempre

// BIEN
const fetchData = useCallback(async () => { ... }, []); // ✅
useEffect(() => { fetchData(); }, [fetchData]);
```

### ❌ showErrorAlert para errores de fetch (bloquea la UI)
```js
// MAL — alert modal bloquea la pantalla
} catch {
  showErrorAlert('Error', 'No se pudieron cargar los productos'); // ❌
}

// BIEN — toast no bloquea
} catch {
  showErrorToast('Error al cargar productos'); // ✅
}
// showErrorAlert solo para acciones destructivas que requieren confirmación
```

### ❌ Catch vacío
```js
// MAL — falla silenciosamente, imposible debuggear
.catch(() => {}); // ❌

// BIEN — al menos loguear
.catch((err) => console.warn('[Sidebar] Error cargando sucursales:', err.message)); // ✅
```

### ❌ FileReader sin onerror
```js
// MAL — falla silenciosamente si el archivo no se puede leer
reader.onload = () => { ... };
reader.readAsDataURL(file); // ❌ sin onerror

// BIEN
reader.onload = () => { ... };
reader.onerror = () => { showErrorAlert('Error', 'No se pudo leer el archivo.'); }; // ✅
reader.readAsDataURL(file);
```

### ❌ Acceso directo a props sin null check
```jsx
// MAL — crash si product es null (producto eliminado)
<td>{item.product.name}</td> // ❌

// BIEN
<td>{item.product?.name || 'Producto'}</td> // ✅
```

---

## Seguridad

### ❌ Rate limiting solo global para login
```js
// MAL — 200 req/15min es demasiado permisivo para login
app.use(rateLimit({ max: 200 })); // ❌ igual para todos los endpoints

// BIEN — limiter estricto solo para login
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
app.use('/api/auth/login', loginLimiter); // ✅
```

### ❌ Validación de descuento solo en frontend
```js
// MAL — la validación HTML puede bypassearse
<input type="number" min="0" max="100" /> // ❌ solo client-side

// BIEN — también validar en el middleware del servidor
body('items.*.discount')
  .optional()
  .isFloat({ min: 0, max: 100 })
  .withMessage('El descuento debe estar entre 0 y 100') // ✅
```