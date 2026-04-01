# Resumen del Sistema: Huevos Point
### Documento para análisis de ecosistema SaaS y estrategia de suscripciones

---

## ¿Qué es este sistema?

**Huevos Point** es un sistema de gestión comercial (POS + ERP básico) desarrollado específicamente para **distribuidoras y puntos de venta de huevos**. Permite a negocios del rubro llevar el control diario de ventas, gastos, stock, compras a proveedores y métricas de rendimiento — todo desde el navegador, incluyendo celulares.

Hoy existe como producto funcional y en producción. El objetivo es convertirlo en un **SaaS multi-tenant** vendido por suscripción a otros negocios similares del sector.

---

## Estado actual del producto

### Lo que ya está construido y funciona

| Módulo | Descripción |
|---|---|
| **Dashboard diario** | Resumen del día: ingresos, egresos, saldo neto. Exportación a Excel. Selector de fecha. |
| **Registro de ventas** | Multi-ítem, hasta 3 métodos de pago por venta (Efectivo, Transferencia, Tarjeta, MercadoPago, etc.), descuentos por ítem |
| **Registro de egresos** | Concepto + monto, registrado por empleado |
| **Stock** | ABM de productos, eliminación lógica, control de stock automático al vender |
| **Compras** | Registro de compras a proveedores, actualización de stock y precio |
| **Auditoría** | Log completo de todas las acciones del sistema (solo admin) |
| **Métricas** | Top 5 productos del mes actual vs. anterior, productos con bajo stock |
| **Gestión de usuarios** | Crear/editar/desactivar usuarios con roles |
| **Resumen diario por email** | Se envía automáticamente de lunes a sábado con el resumen del día por sucursal |
| **Modo Demo** | Permite mostrar el sistema con datos ficticios sin tocar la base de datos real |

### Integraciones existentes
- **MercadoPago Point** (terminal PDV física): integración de pagos presenciales
- **SMTP / Gmail**: envío de emails automáticos
- **Vercel Cron Jobs**: tareas programadas automáticas

---

## Arquitectura técnica

### Stack
- **Frontend:** React 19 + Material UI v6, responsive (funciona en celulares)
- **Backend:** Node.js + Express.js, API REST
- **Base de datos:** PostgreSQL (Neon serverless, escalable automáticamente)
- **ORM:** Sequelize
- **Autenticación:** JWT, sesión expira al cerrar la pestaña
- **Deploy:** Vercel (serverless, escala automáticamente, sin servidor propio)
- **Tests:** Jest (backend) + Vitest (frontend), 118 tests automatizados

### Multi-tenancy (la base del modelo SaaS)
El sistema ya es **multi-tenant de raíz**:
- Cada cliente/negocio es un **tenant** independiente
- Los datos están completamente aislados por `tenant_id` en cada tabla
- Un mismo usuario puede gestionar múltiples sucursales
- El superadmin ve y gestiona todos los tenants desde un panel central
- Ya existe un **switcher de sucursales** en la interfaz

### Roles del sistema
| Rol | Capacidades |
|---|---|
| `superadmin` | Todo: gestión de tenants, usuarios de cualquier sucursal, panel consolidado |
| `admin` | Gestión completa de su/s sucursal/es asignadas |
| `employee` | Solo registrar ventas y egresos |
| `demo` | Acceso de solo lectura con datos ficticios (para presentaciones de ventas) |

### Seguridad
- Middlewares de autenticación, autorización por rol y validación de tenant en cada request
- Rate limiting en login
- Parámetros binding en todas las queries (protección contra SQL injection)
- Variables sensibles en entorno (nunca en código)
- El modo demo tiene cero acceso a la base de datos real

---

## Modelo de negocio actual

- **Un solo cliente** usa el sistema actualmente (el dueño del producto)
- **Arquitectura multi-tenant lista**: agregar un nuevo cliente es solo crear un tenant en la DB + asignar usuarios
- **Costo de infraestructura actual**: muy bajo (Vercel + Neon tienen tiers gratuitos/baratos para empezar)
- **Sin sistema de pagos ni suscripciones**: esto es lo que se quiere construir

---

## Target de mercado

### Cliente ideal (ICP)
- Distribuidoras de huevos, pequeñas y medianas (5 a 50 empleados)
- Negocios con 1 a 5 sucursales
- Dueños que hoy llevan el control en papel, Excel o WhatsApp
- Argentina (producto en español, moneda ARS, integración con MercadoPago)
- A futuro: escalable a cualquier distribuidora de productos perecederos similares (lácteos, verduras, etc.)

### Problema que resuelve
- **Sin sistema**: el dueño no sabe cuánto vendió hoy, si hay pérdidas de stock, qué empleado vendió menos
- **Con el sistema**: recibe el resumen del día por email aunque no esté en el local, ve las métricas de cada sucursal, tiene control total desde el celular

### Ventaja competitiva
- Especialización 100% en el rubro (flujos diseñados para vender huevos, no para todo en general)
- Precio accesible (vs. soluciones genéricas caras)
- Onboarding rápido: un tenant nuevo puede estar operativo en horas
- Modo demo funcional para presentaciones de ventas sin exponer datos reales

---

## Lo que falta construir para el modelo SaaS

### Crítico (sin esto no hay negocio)
1. **Landing page de marketing** con propuesta de valor, precios y registro
2. **Sistema de suscripciones y pagos** (MercadoPago Subscriptions o Stripe)
3. **Flujo de onboarding self-service**: registro → pago → tenant creado automáticamente → acceso inmediato
4. **Panel de superadmin para gestión de suscriptores** (ver quién paga, quién está en trial, quién venció)
5. **Suspensión automática de tenants morosos**

### Importante (para retención y crecimiento)
6. **Período de prueba gratuito** (7-14 días, sin tarjeta)
7. **Emails de bienvenida, recordatorio de vencimiento, factura**
8. **Planes diferenciados** (ej: 1 sucursal vs. multi-sucursal)
9. **Panel de métricas del SaaS** (MRR, churn, tenants activos)
10. **Sistema de soporte** (chat, tickets)

### Futuro (para escalar)
11. App móvil nativa (React Native, para empleados en el mostrador)
12. Integración con sistemas contables (factura electrónica AFIP)
13. Expansión a otros rubros (lácteos, verduras, fiambres)

---

## Datos técnicos relevantes para el diseño del SaaS

### Creación de un nuevo tenant hoy (manual)
```sql
INSERT INTO tenants (name, is_active) VALUES ('Distribuidora XYZ', true);
-- Crear usuario admin y asignarlo al tenant
-- Comunicar credenciales al cliente
```
→ Este proceso debe automatizarse en el onboarding.

### Costos de infraestructura estimados
- Vercel Pro: ~$20/mes (necesario para crons en producción)
- Neon PostgreSQL: escala por uso, aprox $0.09/GB-hora de compute
- Gmail SMTP: gratis hasta ~500 emails/día
- **Costo por tenant adicional**: prácticamente cero (solo más filas en la DB)

### Escalabilidad
- La arquitectura serverless de Vercel escala automáticamente
- PostgreSQL Neon escala sin configuración manual
- El mayor cuello de botella potencial: cold starts de Vercel (mitigable con Vercel Pro)

---

## Preguntas clave para Claude Web

Con este contexto, lo que se necesita diseñar es:

1. **¿Qué planes de suscripción convienen?** (pricing, features por tier, trial)
2. **¿Cómo diseñar el flujo de onboarding self-service?** (registro → pago → tenant activo)
3. **¿Qué cambios técnicos necesita el sistema actual** para soportar suscripciones, suspensión y reactivación?
4. **¿Cómo estructurar la landing page?** (copy, propuesta de valor, social proof, CTA)
5. **¿Qué stack recomienda para el sistema de pagos/suscripciones?** (MercadoPago vs. Stripe vs. otro)
6. **¿Cómo medir el éxito del SaaS?** (KPIs, métricas de negocio)
7. **Roadmap priorizado** para pasar de "producto de un cliente" a "SaaS vendible"

---

*Documento generado el 26/03/2026 — Sistema Huevos Point v1.0 en producción*