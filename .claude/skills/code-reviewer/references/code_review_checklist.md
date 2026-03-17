# Checklist de Code Review — Huevos Point

## Backend

### Seguridad
- [ ] Ningún endpoint nuevo omite `authMiddleware`
- [ ] Rutas de admin usan `requireRole('admin')` o `requireRole('superadmin')`
- [ ] `/api/auth/login` tiene `loginLimiter` (10 req/15min)
- [ ] `JWT_SECRET` se obtiene de `env.JWT_SECRET` sin fallback hardcodeado
- [ ] Inputs numéricos validados (ej: descuento entre 0–100, cantidad > 0)
- [ ] Queries parametrizadas con Sequelize (nunca interpolación de strings en SQL raw)
- [ ] Archivos base64 validados por tamaño y tipo MIME antes de guardar

### Lógica de Negocio
- [ ] Ventas descuentan stock correctamente (`stockQuantity -= quantity`)
- [ ] Compras suman stock y actualizan `unitPrice` en transacción atómica
- [ ] `totalAmount` calculado server-side, nunca confiado del cliente
- [ ] Saldo neto = `sum(sales.totalAmount) - sum(expenses.amount)` para el mismo rango/tenant
- [ ] Operaciones de escritura múltiple usan `sequelize.transaction()` con rollback en catch

### Multi-Tenant
- [ ] Todo `findAll`, `findOne`, `sum` incluye `tenantId` en el `where`
- [ ] Header `x-tenant-id` validado por `tenantMiddleware`
- [ ] Superadmin puede ver todos los tenants; admin/employee solo el suyo
- [ ] Nuevos modelos con FK a `tenants` incluyen `tenantId` en el modelo Sequelize

### Manejo de Errores
- [ ] Errores operacionales usan `new AppError(mensaje, statusCode)`
- [ ] Errores de BD (Sequelize) llegan al `errorMiddleware` global vía `next(error)`
- [ ] `AppError` importado al top del archivo, nunca dentro de funciones
- [ ] Mensajes de error en español (no "Unauthorized", sino "No autorizado")

### API Response
- [ ] Respuesta exitosa: `{ success: true, data: ..., message?: ... }`
- [ ] Error operacional: `{ success: false, message: '...' }` (statusCode del AppError)
- [ ] Error no operacional: `{ success: false, message: 'Error interno del servidor' }`
- [ ] No hay `console.log` con datos sensibles (passwords, tokens)

### Migraciones
- [ ] Nuevas columnas agregadas en `server/api/index.js` dentro del bloque `migrationPromise`
- [ ] Migración idempotente (check con `information_schema.columns` antes del ALTER)
- [ ] Migración incluida en el mismo commit que el modelo Sequelize

---

## Frontend

### Componentes React
- [ ] Componentes de página en `client/src/pages/`
- [ ] Componentes reutilizables en `client/src/components/`
- [ ] Sin lógica de negocio en componentes presentacionales
- [ ] `useCallback` en funciones pasadas como prop o en dependencias de `useEffect`
- [ ] `useEffect` con dependencias correctas (no array vacío cuando hay deps)
- [ ] Sin variables de módulo para valores que cambian con el tiempo (fechas, estado)

### Estado y Datos
- [ ] `activeTenant` obtenido de `useAuth()`, nunca hardcodeado
- [ ] Fecha seleccionada en formato `YYYY-MM-DD` para evitar desfase UTC/local
- [ ] Loading state mostrado durante fetch (Skeleton o CircularProgress)
- [ ] Error state manejado con `showErrorToast` (no bloquea UI)

### Formularios
- [ ] Campos requeridos validados con React Hook Form antes del submit
- [ ] Botón submit deshabilitado durante `isSubmitting`
- [ ] Errores de servidor mostrados en el formulario (Alert o helper text)
- [ ] Archivos validados por tamaño (máx 2MB) y tipo antes de leer con FileReader

### Imports y Dependencias
- [ ] `CURRENCY_FORMAT` importado de `utils/formatters.js` (no definido localmente)
- [ ] `showErrorToast` de `utils/sweetAlert.js` para errores no bloqueantes
- [ ] `showErrorAlert` solo para errores que requieren confirmación del usuario
- [ ] Sin imports de paquetes desinstalados (`xlsx`, `@mui/x-date-pickers`)

### Accesibilidad / UX
- [ ] Tablas con columnas alineadas correctamente (texto izquierda, números derecha)
- [ ] Iconos con `Tooltip` descriptivo
- [ ] Modales cierran con ESC y con botón cancelar
- [ ] Mensajes de estado vacío (ej: "No hay ventas registradas")

---

## Deployment / Vercel

- [ ] Nuevas rutas agregadas en `server/src/app.js` con `app.use('/api/...')`
- [ ] Variables de entorno nuevas documentadas en `server/.env.example`
- [ ] Cron jobs nuevos agregados en `server/vercel.json` (horario UTC)
- [ ] Sin `console.log` de datos de producción que aparezcan en Vercel Function Logs
