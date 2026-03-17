---
name: senior-architect
description: Skill de arquitectura de software personalizado para Huevos Point. Stack: React 19 + MUI v6 + Node.js + Express + Sequelize + PostgreSQL. Multi-tenant, JWT auth, Vercel serverless. Usar para diseñar nuevos módulos, evaluar decisiones técnicas, planear escalabilidad o agregar integraciones.
risk: unknown
source: community
date_added: "2026-02-27"
---

# Senior Architect — Huevos Point

Skill de arquitectura especializado para el proyecto Huevos Point.

## Arquitectura Actual

```
┌─────────────────────────────────────────────────────┐
│                   VERCEL (serverless)                │
│                                                      │
│  ┌──────────────────┐    ┌────────────────────────┐ │
│  │   client/ (SPA)  │    │  server/api/index.js   │ │
│  │   React 19       │◄──►│  Node.js + Express     │ │
│  │   MUI v6 + Vite  │    │  Sequelize ORM         │ │
│  └──────────────────┘    └────────────┬───────────┘ │
└───────────────────────────────────────┼─────────────┘
                                        │
                            ┌───────────▼──────────┐
                            │   PostgreSQL (Neon)   │
                            │   DATABASE_URL        │
                            └──────────────────────┘
```

## Stack Tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Frontend | React | 19 |
| UI | MUI (Material UI) | v6 |
| Build | Vite | latest |
| HTTP client | Axios | latest |
| Formularios | React Hook Form | latest |
| Backend | Node.js + Express | latest |
| ORM | Sequelize | v6 |
| BD | PostgreSQL | (Neon serverless) |
| Auth | JWT (jsonwebtoken) | latest |
| Validación API | express-validator | latest |
| Seguridad | helmet, cors, express-rate-limit | latest |
| Email | nodemailer | latest |
| Deploy | Vercel (serverless) | — |

## Estructura del Proyecto

```
test-agy2/
├── client/src/
│   ├── pages/              # Una página por ruta
│   ├── components/         # Subdirectorios por dominio
│   ├── hooks/              # Custom hooks reutilizables
│   ├── services/api.js     # Instancia Axios global
│   ├── context/AuthContext # Estado global de auth + tenant
│   ├── utils/              # formatters.js, sweetAlert.js
│   └── theme/              # MUI theme config
├── server/
│   ├── api/index.js        # Entrada Vercel + migraciones
│   └── src/
│       ├── app.js          # Express setup, middlewares, rutas
│       ├── modules/        # Un directorio por dominio
│       │   └── <modulo>/
│       │       ├── <modulo>.routes.js
│       │       ├── <modulo>.controller.js
│       │       ├── <modulo>.service.js
│       │       └── <modulo>.repository.js
│       ├── models/         # Sequelize models + associations
│       ├── middlewares/    # auth, role, tenant, validation, error
│       ├── config/         # database.js, environment.js
│       └── utils/          # AppError.js, auditLogger.js, mailer.js
└── server/vercel.json      # Cron jobs (horario UTC)
```

## Módulos Existentes

| Módulo | Ruta API | Descripción |
|--------|---------|-------------|
| auth | `/api/auth` | Login, JWT |
| dashboard | `/api/dashboard` | Resumen diario del tenant |
| sales | `/api/sales` | Ventas multi-ítem con stock |
| expenses | `/api/expenses` | Egresos por concepto |
| products | `/api/products` | ABM de productos + stock |
| purchases | `/api/purchases` | Compras + recibo base64 |
| metrics | `/api/metrics` | Balance mensual, stock bajo |
| audit | `/api/audit-logs` | Log de acciones (solo admin) |
| users | `/api/users` | ABM de usuarios |
| tenants | `/api/tenants` | ABM de sucursales |
| cron | `/api/cron` | Resumen diario por email |

## Roles y Permisos

| Rol | Acceso |
|-----|--------|
| `superadmin` | Todo — puede cambiar de tenant, ver todos |
| `admin` | Su tenant: ventas, egresos, stock, compras, usuarios, reportes |
| `employee` | Su tenant: solo registrar ventas y egresos |

## Cuándo Usar Esta Skill

- Diseñar un nuevo módulo (endpoint + modelo + UI)
- Evaluar si una nueva dependencia es necesaria
- Decidir si escalar un servicio o mantener el monolito
- Planear migraciones de esquema (nuevas columnas)
- Agregar nuevas integraciones (pagos, email, webhooks)
- Revisar impacto de un cambio en la arquitectura multi-tenant

## Comandos Clave

```bash
# Desarrollo local
cd client && npm run dev       # Vite HMR en :5173
cd server && npm run dev       # nodemon en :3000

# Verificar que todo compila y funciona
cd client && npm run build
cd server && npm test

# Vercel CLI (si instalado)
vercel dev                     # Simula Vercel serverless localmente
```

## Referencias

- `references/architecture_patterns.md` — patrones del proyecto (Controller→Service→Repository, multi-tenant, transacciones)
- `references/system_design_workflows.md` — cómo diseñar un nuevo módulo, migraciones, rutas de escalabilidad
- `references/tech_decision_guide.md` — por qué se eligió cada tecnología y cuándo cambiarla