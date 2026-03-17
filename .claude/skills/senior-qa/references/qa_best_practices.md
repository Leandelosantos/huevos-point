# Buenas Prácticas de QA — Huevos Point

## Estructura de Archivos de Test

```
server/src/__tests__/
├── setup.js                        # process.env, variables globales
├── unit/
│   ├── auth.service.test.js
│   ├── sales.service.test.js
│   ├── purchases.service.test.js
│   ├── dashboard.service.test.js
│   ├── metrics.service.test.js
│   ├── authMiddleware.test.js
│   ├── roleMiddleware.test.js
│   └── validationMiddleware.test.js
└── integration/
    ├── auth.routes.test.js
    ├── sales.routes.test.js
    └── security.test.js            # rate limit, sin token, rol incorrecto

client/src/__tests__/
├── setup.js                        # @testing-library/jest-dom
├── unit/
│   └── formatters.test.js
└── components/
    ├── SaleModal.test.jsx
    └── PurchaseModal.test.jsx
```

---

## Convenciones de Naming

| Elemento | Convención | Ejemplo |
|----------|-----------|---------|
| Archivo de test | `<modulo>.test.js` | `sales.service.test.js` |
| `describe` exterior | nombre del módulo | `'salesService'` |
| `describe` interior | nombre del método | `'.createSale'` |
| `it` | condición → resultado | `'stock insuficiente → lanza AppError 400'` |
| Mocks de datos | `mock` + tipo | `mockProduct`, `mockSaleData` |
| Tokens de test | rol explícito | `adminToken`, `employeeToken` |

```js
// Estructura estándar de un test file
describe('salesService', () => {
  describe('.createSale', () => {
    it('descuenta stock correctamente', async () => { ... });
    it('calcula totalAmount con descuento', async () => { ... });
    it('stock insuficiente → lanza AppError 400', async () => { ... });
    it('producto de otro tenant → lanza AppError 404', async () => { ... });
    it('falla en DB → rollback', async () => { ... });
  });

  describe('.getSalesByDate', () => {
    it('filtra por tenantId', async () => { ... });
    it('sin ventas → array vacío', async () => { ... });
  });
});
```

---

## Objetivos de Cobertura

| Módulo | Tipo | Cobertura mínima | Prioridad |
|--------|------|-----------------|-----------|
| `sales.service` | Unit | 90% | ALTA |
| `purchases.service` | Unit | 90% | ALTA |
| `dashboard.service` | Unit | 85% | ALTA |
| `metrics.service` | Unit | 85% | ALTA |
| `validationMiddleware` | Unit | 80% | ALTA |
| `authMiddleware` | Unit | 80% | MEDIA |
| `roleMiddleware` | Unit | 80% | MEDIA |
| `auth.service` | Unit | 80% | MEDIA |
| `formatters.js` | Unit | 100% | BAJA |
| Rutas API críticas | Integration | casos happy + error | MEDIA |

```bash
# Ver coverage
cd server && npm test -- --coverage
cd client && npm test -- --coverage
```

---

## Qué Testear vs Qué No Testear

### TESTEAR
```
✅ Lógica de cálculo financiero (totalAmount, netBalance, descuentos)
✅ Operaciones de stock (suma/resta)
✅ Validaciones de entrada (middleware)
✅ Comportamiento ante errores (AppError, rollback)
✅ Filtrado por tenantId
✅ Casos límite: stock=0, amount=0, array vacío
✅ Seguridad: sin token → 401, rol incorrecto → 403
```

### NO TESTEAR
```
❌ Configuración de Express (app.js en sí)
❌ Definición de modelos Sequelize (solo estructura, sin lógica)
❌ Rutas de solo lectura sin lógica (CRUD simple)
❌ Código generado por Sequelize
❌ console.log / formateo de logs
```

---

## Anti-patrones de Testing

### ❌ Test que verifica implementación, no comportamiento

```js
// MAL — acopla el test a la implementación interna
expect(salesService._calculateDiscount).toHaveBeenCalled(); // ❌

// BIEN — verifica el resultado del comportamiento
expect(Sale.create).toHaveBeenCalledWith(
  expect.objectContaining({ totalAmount: 180 }), expect.anything()
); // ✅
```

### ❌ Mock demasiado permisivo

```js
// MAL — acepta cualquier cosa
Sale.create.mockResolvedValue({}); // ❌ no verifica que se pasaron los datos correctos

// BIEN — verificar lo que importa para el test
expect(Sale.create).toHaveBeenCalledWith(
  expect.objectContaining({ tenantId: 1, totalAmount: expect.any(Number) }),
  expect.anything()
); // ✅
```

### ❌ Test sin beforeEach clearMocks

```js
// MAL — mocks del test anterior contaminan el siguiente
describe('salesService', () => {
  it('test 1', async () => { Product.findOne.mockResolvedValue(product1); ... });
  it('test 2', async () => { /* product1 todavía en el mock */ }); // ❌
});

// BIEN
beforeEach(() => jest.clearAllMocks()); // ✅
```

### ❌ Testear solo el happy path

```js
// MAL — solo prueba el caso exitoso
it('crea venta', async () => { expect(result).toBeDefined(); }); // ❌ insuficiente

// BIEN — cubrir los casos de error también
it('stock insuficiente → 400', ...)
it('producto de otro tenant → 404', ...)
it('falla DB → rollback', ...)
```

---

## Fixtures y Datos de Prueba

```js
// Definir fixtures reutilizables al inicio del archivo
const mockProduct = { id: 1, stockQuantity: 10, unitPrice: 100, tenantId: 1, update: jest.fn() };
const mockSaleInput = {
  tenantId: 1, userId: 1,
  items: [{ productId: 1, quantity: 2, discount: 0 }],
  paymentMethod: 'CASH',
};

// Clonar con spread cuando el test necesita variaciones
const saleWithDiscount = { ...mockSaleInput, items: [{ ...mockSaleInput.items[0], discount: 10 }] };
```

---

## Errores Comunes en AppError

```js
// Verificar AppError con toMatchObject (no toThrow string)
await expect(service.method()).rejects.toMatchObject({
  message: expect.stringContaining('stock'),
  statusCode: 400,
});

// Verificar que es una instancia de AppError (opcional pero más preciso)
try {
  await service.method();
} catch (err) {
  expect(err).toBeInstanceOf(AppError);
  expect(err.statusCode).toBe(400);
}
```

---

## Checklist Antes de Commit

```
□ npm test pasa en /server sin errores
□ npm test pasa en /client sin errores
□ npm run build pasa en /client sin errores
□ Nuevas funcionalidades tienen al menos un test unitario
□ Cambios en lógica financiera tienen test de casos límite
□ No hay console.log de datos sensibles en tests
□ Mocks limpios con beforeEach clearMocks
□ Tests describen comportamiento, no implementación
```

---

## Comandos de Referencia

```bash
# Correr todos los tests
cd server && npm test
cd client && npm test -- --run

# Con coverage
cd server && npm test -- --coverage
cd client && npm test -- --coverage --reporter=text

# Test específico
cd server && npm test -- sales.service.test.js
cd server && npm test -- --testNamePattern="stock insuficiente"

# Pre-commit manual
bash .git/hooks/pre-commit
```