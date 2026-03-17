# Estrategias de Testing — Huevos Point

## Pirámide de Tests

```
         /\
        /E2E\        ← Pocos (flujo login→venta completo)
       /------\
      / Integr \     ← Rutas API con Supertest
     /----------\
    / Unit Tests \   ← Mayoría: services, middlewares, utils
   /--------------\
```

## Casos de Prueba por Módulo

### auth.service.js
```
✅ login con credenciales correctas → retorna { token, user }
✅ login con password incorrecta → lanza AppError 401
✅ login con usuario inexistente → lanza AppError 401
✅ token contiene id, username, role, tenants
```

### sales.service.js (lógica financiera crítica)
```
✅ createSale reduce stockQuantity del producto correctamente
✅ createSale con 2 ítems reduce stock de ambos productos
✅ createSale con descuento 10%: precio=$100, qty=2 → totalAmount=$180
✅ createSale con stock insuficiente → lanza AppError 400
✅ createSale con producto de otro tenant → lanza AppError 404
✅ createSale falla en DB → rollback (stock no modificado)
```

### purchases.service.js (lógica financiera crítica)
```
✅ createPurchase suma quantity al stock: stock=10 + compra=5 → stock=15
✅ createPurchase actualiza unitPrice del producto
✅ createPurchase falla en DB → rollback (stock y precio no modificados)
✅ createPurchase con producto de otro tenant → lanza AppError 404
```

### dashboard.service.js
```
✅ getDailySummary: netBalance = totalIncome - totalExpenses
✅ getDailySummary sin datos → { totalIncome: 0, totalExpenses: 0, netBalance: 0 }
✅ getDailySummary filtra por tenantId (no mezcla tenants)
```

### metrics.service.js
```
✅ getMonthlyBalance calcula correctamente para mes con datos
✅ getMonthlyBalance mes sin datos → valores en cero
✅ getMonthlyBalance filtra por tenantId
```

### validationMiddleware.js
```
✅ validateSale: items vacío → error 400
✅ validateSale: discount < 0 → error 400
✅ validateSale: discount > 100 → error 400
✅ validateSale: quantity <= 0 → error 400
✅ validateExpense: concept vacío → error 400
✅ validateExpense: amount <= 0 → error 400
✅ validateProduct: name vacío → error 400
✅ validateLogin: username/password vacíos → error 400
```

### authMiddleware.js + roleMiddleware.js
```
✅ token válido → req.user populado, llama next()
✅ sin header Authorization → error 401
✅ token inválido/expirado → error 401
✅ superadmin pasa requireRole('admin')
✅ employee bloqueado con requireRole('admin') → error 403
```

## Tests de Seguridad
```
✅ Endpoint ventas sin token → 401
✅ Endpoint admin con rol employee → 403
✅ POST /api/auth/login 11 veces → última retorna 429 (rate limit)
✅ Venta con discount=150 → 400
✅ GET /api/cron/daily-summary sin CRON_SECRET → 401
```

## Tests de Frontend (utils)
```
✅ CURRENCY_FORMAT.format(1000) → "$1.000,00"
✅ CURRENCY_FORMAT.format(0) → "$0,00"
✅ CURRENCY_FORMAT.format(1234.5) → "$1.234,50"
✅ CURRENCY_FORMAT.format(-500) → "-$500,00"
```
