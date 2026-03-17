---
name: code-reviewer
description: Code review skill personalizado para Huevos Point. Stack: React 19 + MUI v6 + Node.js + Express + Sequelize + PostgreSQL. Multi-tenant, JWT auth, Vercel serverless. Usar al revisar PRs, detectar bugs, analizar seguridad o evaluar calidad antes de merge.
---

# Code Reviewer — Huevos Point

Skill de revisión de código especializado para el proyecto Huevos Point.

## Contexto del Proyecto

- **Frontend:** React 19, MUI v6, React Router v7, React Hook Form, dayjs, ExcelJS, Vite
- **Backend:** Node.js, Express, Sequelize ORM, PostgreSQL
- **Auth:** JWT (RS256), roles: `superadmin` | `admin` | `employee`
- **Multi-tenant:** tabla `user_tenants`, header `x-tenant-id`, `activeTenant` en AuthContext
- **Deploy:** Vercel (serverless), entrada en `server/api/index.js`
- **Respuesta API estándar:** `{ success: bool, data: any, message?: string, error?: string }`

## Proceso de Revisión

### Paso 1 — Leer el código afectado
Siempre leer los archivos modificados ANTES de opinar. No asumir nada del código sin verlo.

### Paso 2 — Aplicar checklist por capa

**Backend (Controller → Service → Repository):**
- [ ] Controller solo llama al service, no contiene lógica de negocio
- [ ] Service contiene la lógica, usa AppError para errores operacionales
- [ ] Repository solo hace queries Sequelize, sin lógica de negocio
- [ ] Todo error llega a `next(error)`, nunca `res.status(...).json(...)` directo en catch
- [ ] Respuesta usa formato `{ success, data, message }`
- [ ] Rutas protegidas con `authMiddleware` + `requireRole(...)`
- [ ] Inputs validados con `express-validator` antes de llegar al controller
- [ ] Queries multi-tenant siempre incluyen `tenantId` en el `where`
- [ ] Operaciones con múltiples escrituras usan `sequelize.transaction()`
- [ ] Passwords hasheadas con bcrypt (hook Sequelize `beforeCreate/beforeUpdate`)

**Frontend (Pages → Components → Services):**
- [ ] Pages orquestan estado y fetch; Components son presentacionales
- [ ] Errores de API usan `showErrorToast` (no `showErrorAlert`) para no bloquear UI
- [ ] Formato de moneda usa `CURRENCY_FORMAT` de `utils/formatters.js`
- [ ] Fechas manejadas con `dayjs` o formato explícito `YYYY-MM-DD` para evitar desfase UTC
- [ ] `useCallback` en funciones de fetch para evitar re-renders infinitos
- [ ] `activeTenant` de AuthContext usado para operaciones del tenant activo
- [ ] Formularios con React Hook Form; validación antes de submit
- [ ] No hay `import React` innecesario (React 19 no lo requiere, excepto para `React.Fragment`)

**Seguridad:**
- [ ] `JWT_SECRET` no tiene fallback hardcodeado en producción
- [ ] Login tiene rate limiter estricto (10 req/15min)
- [ ] Descuento validado server-side (0–100)
- [ ] `CRON_SECRET` valida el header `Authorization: Bearer`
- [ ] No hay secrets en el código fuente

**Performance:**
- [ ] Queries Sequelize usan `include` (eager loading), no lazy loading en loops
- [ ] Listas grandes tienen paginación o filtro por fecha
- [ ] Imágenes/archivos base64 no se incluyen en responses de listas

## Arquitectura de Módulos (Backend)

```
server/src/modules/<modulo>/
├── <modulo>.routes.js      ← define rutas + middlewares
├── <modulo>.controller.js  ← recibe req/res, llama service
├── <modulo>.service.js     ← lógica de negocio
└── <modulo>.repository.js  ← acceso a BD (Sequelize)
```

## Convenciones Obligatorias

- **Commits:** Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`)
- **Ramas:** `feature/nombre`, `fix/nombre`
- **API routes:** `/api/<recurso>` (ej: `/api/sales`, `/api/purchases`)
- **Soft delete:** `isActive: false`, nunca DELETE físico en productos/usuarios
- **Migraciones:** idempotentes en `server/api/index.js` con check de `information_schema`

## Anti-patrones a Detectar

| Anti-patrón | Corrección |
|------------|-----------|
| `AppError` importado dentro de función | Mover al top del archivo |
| `catch(() => {})` vacío | Al menos `console.warn` con contexto |
| `CURRENCY_FORMAT` definido localmente | Importar de `utils/formatters.js` |
| Query sin `tenantId` en `where` | Agregar filtro de tenant siempre |
| `res.json()` dentro de catch (no `next(error)`) | Usar `next(error)` |
| Estado de módulo (fuera de componente) para fechas dinámicas | Mover dentro del componente |
| `import React` innecesario | Eliminar (excepto si usa `React.Fragment`) |
| Fallback de secret hardcodeado | Validar y lanzar en producción |

## Comandos de Revisión

```bash
# Build del cliente (detecta errores de compilación)
cd client && npm run build

# Verificar que el servidor arranca sin errores
cd server && node -e "require('./src/app')"

# Ejecutar tests
cd server && npm test
cd client && npm test
```

## Referencias

- Checklist detallado: `references/code_review_checklist.md`
- Estándares de código: `references/coding_standards.md`
- Anti-patrones comunes: `references/common_antipatterns.md`
