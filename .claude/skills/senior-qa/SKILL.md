---
name: senior-qa
description: Skill de QA y testing personalizado para Huevos Point. Stack: React 19 + MUI v6 + Node.js + Express + Sequelize + PostgreSQL. Multi-tenant, JWT auth, Vercel serverless. Usar para diseñar estrategias de test, escribir casos de prueba, revisar cobertura, o configurar automatización pre-commit.
---

# Senior QA — Huevos Point

Skill de calidad y testing especializado para el proyecto Huevos Point.

## Contexto del Proyecto

- **Frontend:** React 19, MUI v6, Vite — tests con Vitest + React Testing Library
- **Backend:** Node.js + Express + Sequelize — tests con Jest + Supertest
- **BD:** PostgreSQL (Sequelize ORM)
- **Auth:** JWT, roles: `superadmin` | `admin` | `employee`
- **Multi-tenant:** `user_tenants` junction, `x-tenant-id` header
- **Deploy:** Vercel serverless — CI via git pre-commit hook
- **Test runner:** `npm test` en `/server` y `/client`

## Módulos Críticos a Testear (por prioridad)

### ALTA prioridad (lógica financiera)
1. **sales.service** — cálculo de totalAmount, descuento de stock, validación de stock disponible
2. **purchases.service** — suma de stock, actualización de precio, transacción atómica
3. **dashboard.service** — getDailySummary (ingresos - egresos = saldo neto)
4. **metrics.service** — getMonthlyBalance (mismo cálculo mensual)
5. **validationMiddleware** — validateSale, validateExpense, validateProduct

### MEDIA prioridad (auth y seguridad)
6. **auth.service** — login con credenciales válidas/inválidas
7. **authMiddleware** — token válido, expirado, ausente
8. **roleMiddleware** — superadmin pasa siempre, admin/employee bloqueados correctamente

### BAJA prioridad (utilidades)
9. **formatters.js** — CURRENCY_FORMAT para valores positivos, cero y negativos
10. **environment.js** — falla en producción sin JWT_SECRET

## Estrategia de Tests

### Backend — Jest + Supertest
```bash
cd server && npm test
```
- **Unit tests:** services y middlewares con mocks de Sequelize
- **Integration tests:** rutas con Supertest (mock de DB o DB de test)
- Archivos en `server/src/__tests__/` o junto al módulo como `*.test.js`

### Frontend — Vitest + React Testing Library
```bash
cd client && npm test
```
- **Unit tests:** utils (formatters, sweetAlert)
- **Component tests:** modales críticos (SaleModal, PurchaseModal)
- Archivos en `client/src/__tests__/` o junto al componente como `*.test.jsx`

## Pre-commit Hook

El hook en `.git/hooks/pre-commit` corre automáticamente antes de cada commit:
1. Build del cliente (detecta errores de compilación/imports rotos)
2. Tests del servidor (Jest)
3. Tests del cliente (Vitest)

Si alguno falla, el commit se bloquea.

```bash
# Ejecutar manualmente lo mismo que el hook
bash .git/hooks/pre-commit
```

## Casos de Prueba Clave

Ver:
- `references/testing_strategies.md` — casos por módulo
- `references/test_automation_patterns.md` — patrones de mocks y fixtures
- `references/qa_best_practices.md` — convenciones y estructura de tests

## Comandos Útiles

```bash
# Correr todos los tests
cd server && npm test
cd client && npm test

# Correr tests con coverage
cd server && npm test -- --coverage
cd client && npm test -- --coverage

# Correr un test específico
cd server && npm test -- auth.service.test.js

# Verificar build del cliente
cd client && npm run build
```