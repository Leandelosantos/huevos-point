# Guía de Decisiones Técnicas — Huevos Point

## Por Qué Cada Tecnología

### React 19
- **Por qué:** SPA con estado complejo (auth, multi-tenant, formularios en tiempo real)
- **Alternativa descartada:** Next.js — no hay SSR necesario, el backend es una API REST separada
- **Mantener hasta:** se necesite SSR/SEO (el sistema es interno, no público)

### MUI v6 (Material UI)
- **Por qué:** Componentes listos para producción, theming cohesivo, accesibilidad incluida
- **Regla clave:** NO instalar `@mui/x-date-pickers` — requiere licencia y choca con React 19 (crash silencioso en producción). Usar `<input type="date">` o `<input type="month">` nativos.
- **Mantener hasta:** cambio de diseño mayor o migración a otra librería de UI

### Vite
- **Por qué:** Build ultra-rápido, HMR, sin config compleja
- **Alternativa:** CRA (deprecated), Next.js (overhead innecesario)

### React Hook Form
- **Por qué:** Formularios con validación, sin re-renders excesivos, integra bien con MUI
- **Regla:** Todos los formularios nuevos deben usar RHF. No mezclar con estado controlado manual.

### Node.js + Express
- **Por qué:** Mismo lenguaje que frontend, ecosistema enorme, fácil despliegue en Vercel
- **Sin TypeScript:** El proyecto usa JavaScript puro. No agregar TypeScript sin decisión explícita.

### Sequelize ORM (v6)
- **Por qué:** ORM maduro, soporte de transacciones, asociaciones bien modeladas
- **Regla de migraciones:** No usar `sequelize-cli migrate` — las migraciones se hacen manualmente en `api/index.js` con verificación idempotente
- **Alternativa NO adoptada:** Prisma — requeriría reescribir todos los modelos

### PostgreSQL (Neon)
- **Por qué:** BD relacional para datos financieros con transacciones ACID
- **Neon:** PostgreSQL serverless compatible con Vercel (connection pooling automático)
- **NO usar:** MongoDB/NoSQL — los datos financieros son relacionales por naturaleza

### JWT (jsonwebtoken)
- **Por qué:** Auth stateless, ideal para serverless (no hay sesión de servidor)
- **Payload:** `{ id, username, role, tenants }` — tenants como array de IDs
- **Sin refresh tokens:** Actualmente tokens de larga duración. Si se necesita mayor seguridad, agregar refresh token con tabla en DB.

### Vercel Serverless
- **Por qué:** Deploy simplísimo, cron jobs incluidos, CDN para el frontend
- **Limitación clave:** Cold starts — la primera request después de inactividad puede tardar 2-5s (la migración en `api/index.js` se ejecuta una vez)
- **Alternativa si escala:** Railway o Render para backend con proceso persistente

---

## Cuándo NO Agregar una Nueva Dependencia

Antes de `npm install <pkg>`, verificar:

| Pregunta | Si la respuesta es NO → |
|----------|------------------------|
| ¿Ya existe una forma nativa de hacer esto? | No instalar. Usar `<input type="date">` en vez de date-picker externo |
| ¿Se usa en más de un lugar del proyecto? | No instalar para uso único. Escribir la función directamente |
| ¿Es compatible con React 19 en producción (Vercel)? | Probar primero en build local, no solo en dev |
| ¿El bundle size es razonable (< 50KB gzip)? | Evaluar alternativas o implementación propia |
| ¿Tiene mantenimiento activo? | Preferir librerías con commits recientes |

**Dependencias removidas en el pasado (no volver a instalar):**
- `xlsx` — alternativa: ExcelJS (ya instalado)
- `@mui/x-date-pickers` — alternativa: `<input type="month">` / `<input type="date">` nativos

---

## Decisiones de Arquitectura Tomadas

### ✅ Monolito modular, NO microservicios
**Razón:** Un solo equipo, deploy simple, sin requisitos de escala horizontal por dominio. La separación por módulos (carpetas) da el orden necesario sin la complejidad de microservicios.

### ✅ Migraciones inline en api/index.js, NO sequelize-cli
**Razón:** Vercel no ejecuta comandos CLI pre-deploy. Las migraciones corren en el cold start y son idempotentes. Esto es más simple y confiable para el contexto del proyecto.

### ✅ JWT sin refresh token (por ahora)
**Razón:** Sistema interno con usuarios de confianza. Si se agrega en el futuro: tabla `refresh_tokens` en DB, endpoint `POST /api/auth/refresh`, tokens de 15min.

### ✅ Frontend SPA separado del backend
**Razón:** Deploy independiente en Vercel, desarrollo en paralelo, API reutilizable si se agrega mobile. El frontend no comparte código con el backend.

### ✅ Fechas con formato explícito (no Date() puro)
**Razón:** Evitar desfase UTC/local. El servidor corre en UTC, los usuarios están en ART (UTC-3). Siempre usar `toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })` en backend y `dayjs().format('YYYY-MM-DD')` en frontend.

### ✅ `tenantId` en todos los modelos con datos de negocio
**Razón:** Aislamiento de datos entre sucursales. No compartir datos entre tenants. Ningún query de negocio puede omitir el `where: { tenantId }`.

---

## Variables de Entorno

| Variable | Requerida en prod | Comportamiento si falta |
|---------|-----------------|------------------------|
| `JWT_SECRET` | ✅ Obligatoria | Lanza error fatal (falla el proceso) |
| `DATABASE_URL` | ✅ Obligatoria | Sequelize no conecta |
| `CRON_SECRET` | ✅ Para cron jobs | Endpoint retorna 401 (protegido igual) |
| `SMTP_HOST` | Opcional | Emails deshabilitados silenciosamente |
| `SMTP_USER` | Opcional | Idem |
| `SMTP_PASS` | Opcional | Idem |
| `CORS_ORIGIN` | Opcional | `true` = acepta cualquier origen |
| `NODE_ENV` | Auto en Vercel | `production` en Vercel, `development` local |

---

## Evaluación de Nuevas Integraciones

### Mercado Pago (ya evaluado, removido)
Se removió la integración MP Point por complejidad de webhooks y ciclo de vida de la orden. Si se reactiva: ver `.agents/rules/api-mercado-pago.md` para el patrón completo.

### Reportes / Exportación Excel
**Ya implementado** con ExcelJS en el frontend (DashboardPage). Patrón: generar el archivo en el cliente con los datos ya cargados, sin endpoint dedicado.

### Notificaciones Push
**Si se necesita en el futuro:**
- Web Push API (nativo, sin Firebase) para notificaciones del navegador
- NO agregar Socket.io — serverless no mantiene conexiones WebSocket persistentes

### Mobile App
**Si se necesita en el futuro:**
- La API REST existente es reutilizable tal cual
- React Native o PWA (Progressive Web App) son las opciones más naturales dado el stack

---

## Señales de Alerta Arquitectónicas

```
🚨 Un service importa otro service → extraer a un service compartido o re-pensar capas
🚨 Un controller accede a modelos directamente → mover lógica al service
🚨 Lógica de negocio en el frontend (ej: calcular totales) → siempre server-side
🚨 Más de 3 includes encadenados en un findAll → evaluar query SQL raw o vista
🚨 Una migración sin check idempotente → romperá en redeployos
🚨 Un endpoint sin authMiddleware → data leak potencial
🚨 Un query sin tenantId → data leak entre tenants (crítico)
```