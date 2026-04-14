# Huevos Point — Guía de Proyecto para Claude

Panel de administración POS multi-sucursal para distribuidora de huevos.
Multi-tenant (business → tenants), con módulos de ventas, egresos, stock, compras, métricas, auditoría y MercadoPago Point.

---

## Stack

- **Frontend:** React 19 + MUI v6 + React Hook Form + React Router v6 + dayjs + ExcelJS
- **Backend:** Node.js + Express + Sequelize ORM
- **BD:** PostgreSQL (Supabase)
- **Auth:** JWT (panel) / API Keys SHA-256 (API pública)
- **Deploy:** Vercel (cold-start con migraciones idempotentes)

## Estructura

```
test-agy2/
├── client/src/      # React app (pages/, components/, context/, services/, theme/)
├── server/src/
│   ├── modules/     # dashboard, sales, expenses, products, purchases, tenants,
│   │                # users, audit, metrics, apiKeys, public
│   ├── models/      # Sequelize models — registrar TODO modelo nuevo en models/index.js
│   ├── middlewares/ # authMiddleware, apiKeyMiddleware, demoMiddleware
│   └── __tests__/   # Jest unit tests
├── docs/
│   └── public-api.md  # Documentación canónica de la API pública
└── server/api/index.js  # Entry point Vercel + migraciones cold-start
```

## Convenciones

- **Capas obligatorias:** Controller → Service → Repository. No saltarse capas.
- **Respuestas API:** `{ success, data, message?, error? }`
- **Errores:** lanzar `AppError(message, statusCode)` desde el service.
- **Validación:** input parsing y validación viven en el service, no en el controller.
- **Tests:** cada módulo nuevo en `server/src/__tests__/unit/` con mocks de modelos.
- **Commits:** Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, ...).
- **Multi-tenant:** todo query debe filtrar por `tenantId` (o lista de tenants para business scope).

---

## Regla crítica: nuevas tablas → nuevos endpoints públicos

> **Directiva del proyecto:** cada vez que se cree una nueva tabla en la base de datos, o se agregue un dato relevante a una tabla existente que pueda ser de interés para sistemas satélites (ERPs, BI, integraciones contables, mobile apps internas), **se debe exponer un endpoint de solo lectura correspondiente en `/api/public/v1`**.

Esto garantiza que la API pública crezca en paralelo al modelo de datos y que los integradores externos siempre tengan acceso vigente sin necesidad de tocar la BD directamente.

### Pasos obligatorios al agregar una tabla / endpoint

Detallados en [docs/public-api.md](docs/public-api.md) sección 9. Resumen:

1. **Modelo Sequelize** en `server/src/models/<Recurso>.js` y registrarlo en `server/src/models/index.js` con sus asociaciones.
2. **Migración idempotente** en `server/api/index.js` (cold-start safe — usar `CREATE TABLE IF NOT EXISTS`, índices con `IF NOT EXISTS`).
3. **Repository** en `server/src/modules/public/public.repository.js` usando `resolveTenantIds + tenantScopeClause` para respetar el scope de la API key. Excluir campos sensibles o pesados (binarios, hashes, tokens).
4. **Service** en `server/src/modules/public/public.service.js` con `parsePagination` y `parseDateRange` reutilizados; devolver `{ data, meta }`.
5. **Controller** en `server/src/modules/public/public.controller.js` (handler delgado).
6. **Scope nuevo** en `server/src/modules/apiKeys/apiKeys.service.js` (`VALID_SCOPES`), del tipo `read:<recurso>`.
7. **Ruta** en `server/src/modules/public/public.routes.js` con `requireScope('read:<recurso>')`.
8. **Documentación** en [docs/public-api.md](docs/public-api.md) sección 4 (request, scope, params, ejemplo de respuesta).
9. **Tests unitarios** en `server/src/__tests__/unit/public.service.test.js` (validaciones de pagination/dates + happy path con repo mockeado).
10. **Changelog** en [docs/public-api.md](docs/public-api.md) sección 10 con la fecha y versión.

### Qué NO exponer en `/api/public/v1`

- Hashes de contraseñas, `keyHash`, tokens JWT.
- Binarios pesados (`receipt_data`, imágenes embebidas) — exponer metadata o URL en su lugar.
- Datos de otros businesses/tenants fuera del scope de la API key.
- Endpoints de escritura — la API pública es **estrictamente de solo lectura**. Para mutaciones se usa el panel admin con JWT.

---

## Seguridad

- Las API keys se hashean con SHA-256 antes de persistirse. El `rawKey` se muestra **una sola vez** al crearse (`POST /api/admin/api-keys`).
- Doble rate limit: por IP (express-rate-limit, 120 req/min) + por API key (sliding window in-memory, configurable, default 60 req/min).
- Cache in-memory de API keys con TTL de 60s para minimizar lookups y permitir propagar revocaciones rápido.
- `lastUsedAt` se actualiza con throttle de 60s por key para evitar write amplification.
- Toda key tiene scope **business** (acceso a todas las sucursales del business) o **tenant** (acceso a una sola sucursal), nunca ambas.

## Tests

```bash
cd server && npm test
```

Cualquier endpoint nuevo en `/api/public/v1` debe sumar tests al suite existente (`apiKeyMiddleware.test.js`, `apiKeys.service.test.js`, `public.service.test.js`).

## Modo de Operación

### Tareas simples → implementar directo
- Agregar campo a modelo existente
- Nuevo endpoint que sigue el patrón Controller → Service → Repository ya establecido
- Fix de bug localizado en un solo módulo
- Ajuste de UI en un componente existente

### Tareas que requieren plan en todo.md → esperar confirmación antes de implementar
- Nuevas tablas o cambios de schema/migraciones
- Nuevos módulos completos
- Cambios que tocan auth, middlewares o seguridad
- Cualquier cambio que afecte /api/public/v1 o el modelo multi-tenant
- Cambios que tocan más de 2 módulos simultáneamente

### lessons.md
- Actualizar después de cada corrección del usuario
- Máximo 20 entradas — si supera, consolidar patrones similares
- Revisar al inicio de cada sesión

## Referencias rápidas

- API pública: [docs/public-api.md](docs/public-api.md)
- SRS funcional: [srs-huevos-point.md](srs-huevos-point.md)
- Plan SaaS: [docs/saas-plan-v4.md](docs/saas-plan-v4.md)
- Reglas de desarrollo: [.agents/rules/buenas-practicas-desarrollo.md](.agents/rules/buenas-practicas-desarrollo.md)
