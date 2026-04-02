# Huevos Point — Plan Estratégico SaaS (v4 Consolidada)
## Pagos Mobbex + MercadoPago | Multi-Tenant | Superadmin | Integración Point + Transferencias

---

# PARTE 1 — PLANES DE SUSCRIPCIÓN

---

## Plan Básico — "Esencial"

**Para quién:** Distribuidoras pequeñas (1 sucursal, 1-5 empleados).

**Funcionalidades incluidas:**
- Dashboard diario (ingresos, egresos, saldo neto)
- Registro de ventas multi-ítem con **todos los métodos de pago:**
  - Efectivo
  - Transferencia bancaria
  - Tarjeta de crédito
  - MercadoPago
- Registro de egresos
- Stock básico (ABM de productos, control automático al vender)
- Compras a proveedores (registro simple, actualización de stock y precio)
- 1 usuario admin + hasta 2 empleados
- 1 sucursal
- Resumen diario por email (lunes a sábado)
- Soporte por email (respuesta en 48hs hábiles)

**Precio:**
- Mensual: ARS $15.000/mes
- Anual: ARS $135.000/año (25% de descuento → $11.250/mes equivalente)

---

## Plan Profesional — "Profesional" ⭐ Recomendado

**Para quién:** Distribuidoras medianas (1-5 sucursales, 5-30 empleados).

**Todo lo del plan Básico, más:**
- Hasta 5 sucursales con switcher en interfaz
- Usuarios ilimitados con roles (admin, employee)
- Hasta 5 métodos de pago por venta simultáneos
- Descuentos por ítem en ventas
- **Módulo de clientes:** ABM, historial de compras, cuenta corriente, deudas
- **Módulo de proveedores avanzado:** ABM, historial, condiciones de pago, deudas
- **Métricas de negocio avanzadas:**
  - Top productos por período personalizable
  - Comparativo mes actual vs. anterior
  - Alertas de bajo stock
  - Rentabilidad por producto
  - Rendimiento por empleado
  - Rendimiento por sucursal
- Log de auditoría completo (solo admin)
- Exportación a Excel de todos los reportes
- Integración MercadoPago Point (terminal física)
- Soporte prioritario email + WhatsApp (24hs hábiles)
- Modo demo para presentaciones internas

**Precio:**
- Mensual: ARS $35.000/mes
- Anual: ARS $315.000/año (25% de descuento → $26.250/mes equivalente)

---

## Plan Enterprise — "A Medida"

**Todo lo del Profesional, más:**
- Desarrollo personalizado sobre la plataforma
- Sucursales ilimitadas
- Soporte dedicado con canal directo
- Onboarding asistido con capacitación

**Precio:** A coordinar. Contacto por **WhatsApp** o **Email**.

---

# PARTE 2 — SISTEMA DE PAGOS DUAL: MOBBEX + MERCADOPAGO

> ⚠️ NOTA: Esta parte corresponde al sitio web de venta del SaaS (landing + checkout de suscripción). NO aplica al sistema actual de Huevos Point. Se implementará en un proyecto separado.

---

## ¿Por qué Mobbex + MercadoPago?

| Criterio | Mobbex (tarjeta directa) | MercadoPago |
|----------|--------------------------|-------------|
| Tipo | Gateway argentino | Plataforma integrada |
| Opera en ARS | Sí | Sí |
| Suscripciones recurrentes | Sí (dinámicas y manuales) | Sí (PreApproval API) |
| Tarjetas soportadas | Crédito, débito y prepagas | Crédito, débito + billetera MP |
| Requiere estructura legal | No (opera local) | No |
| Checkout embebible | Sí (Embed SDK) | Sí (Checkout Pro) |
| Webhooks | Sí | Sí |
| Comisiones | ~2.5-4% + IVA | ~5-6% + IVA (varía por plazo) |
| Tiempo de setup | Días | Días |

## Arquitectura del sistema de pagos

```
                    LANDING PAGE
                        ↓
              ┌─────────┴─────────┐
              │                    │
        Elige Mobbex         Elige MercadoPago
              ↓                    ↓
     ┌────────────────┐  ┌─────────────────┐
     │ POST /api/     │  │ POST /api/      │
     │ onboarding/    │  │ onboarding/     │
     │ register       │  │ register        │
     │ provider:      │  │ provider:       │
     │ "mobbex"       │  │ "mercadopago"   │
     └───────┬────────┘  └────────┬────────┘
             │                     │
             ↓                     ↓
    PaymentProviderFactory.create(provider)
             │                     │
     ┌───────┴────────┐    ┌───────┴─────────┐
     │ MobbexProvider │    │ MPProvider      │
     └───────┬────────┘    └───────┬─────────┘
             │                     │
             ↓                     ↓
     Mobbex Checkout         MP Checkout
     (embebido o redirect)   (redirect a init_point)
             │                     │
             ↓                     ↓
     ┌─────────────────────────────────────────┐
     │           WEBHOOKS                      │
     │  POST /api/webhooks/mobbex              │
     │  POST /api/webhooks/mercadopago         │
     │           ↓                             │
     │  processWebhookResult() → UNIFICADO     │
     │           ↓                             │
     │  activateSubscription()                 │
     │  → subscription.status = 'active'       │
     │  → tenant.is_active = true              │
     │  → email de bienvenida                  │
     │  → redirect a login                     │
     └─────────────────────────────────────────┘
```

## Capa de abstracción de pagos

### Factory

```javascript
// services/payment/PaymentProviderFactory.js

const MobbexProvider = require('./MobbexProvider');
const MercadoPagoProvider = require('./MercadoPagoProvider');

class PaymentProviderFactory {
  static create(providerName) {
    switch (providerName) {
      case 'mobbex':
        return new MobbexProvider();
      case 'mercadopago':
        return new MercadoPagoProvider();
      default:
        throw new Error(`Provider "${providerName}" no soportado`);
    }
  }
}

module.exports = PaymentProviderFactory;
```

### Interfaz base

```javascript
// services/payment/BaseProvider.js

class BaseProvider {
  // Crea suscripción recurrente, retorna { checkoutUrl, externalId }
  async createSubscription({ email, planName, amount, billingCycle, successUrl, cancelUrl }) {
    throw new Error('Not implemented');
  }

  // Cancela suscripción existente
  async cancelSubscription(externalId) {
    throw new Error('Not implemented');
  }

  // Procesa webhook, retorna objeto normalizado
  async handleWebhook(req) {
    throw new Error('Not implemented');
  }
}

module.exports = BaseProvider;
```

### Provider: Mobbex

```javascript
// services/payment/MobbexProvider.js
const axios = require('axios');
const BaseProvider = require('./BaseProvider');

const MOBBEX_API = 'https://api.mobbex.com/p/subscriptions';
const headers = {
  'x-api-key': process.env.MOBBEX_API_KEY,
  'x-access-token': process.env.MOBBEX_ACCESS_TOKEN,
  'Content-Type': 'application/json',
};

class MobbexProvider extends BaseProvider {

  async createSubscription({ email, planName, amount, billingCycle, successUrl, customerName, customerId }) {
    // 1. Crear la suscripción (plan) en Mobbex
    const interval = billingCycle === 'monthly' ? '1m' : '1y';

    const { data: subResponse } = await axios.post(MOBBEX_API, {
      total: amount,
      currency: 'ars',
      type: 'dynamic',
      name: `Huevos Point - ${planName}`,
      description: `Suscripción ${billingCycle === 'monthly' ? 'mensual' : 'anual'}`,
      interval,
      trial: 0,
      limit: 0,
      return_url: successUrl,
      reference: `sub-${customerId}-${Date.now()}`,
      options: { embed: false },
    }, { headers });

    if (!subResponse.result) {
      throw new Error('Error al crear suscripción en Mobbex');
    }

    const subscriptionUid = subResponse.data.uid;
    const sourceUrl = subResponse.data.sourceUrl;

    // 2. Crear el suscriptor
    const { data: subscriberResponse } = await axios.post(
      `${MOBBEX_API}/${subscriptionUid}/subscriber`, {
        customer: { email, name: customerName, identification: customerId },
        reference: `usr-${customerId}`,
        startDate: { day: new Date().getDate(), month: new Date().getMonth() + 1 },
      }, { headers }
    );

    return {
      checkoutUrl: subscriberResponse.data?.sourceUrl || sourceUrl,
      externalId: subscriptionUid,
      subscriberId: subscriberResponse.data?.uid,
    };
  }

  async cancelSubscription(subscriberId) {
    await axios.post(
      `https://api.mobbex.com/p/subscriptions/subscribers/${subscriberId}/action/suspend`,
      {}, { headers }
    );
  }

  async handleWebhook(req) {
    const data = req.body?.data || req.body;
    const type = req.body?.type;

    if (type === 'subscription:registration' || data?.payment?.status?.code === '200') {
      return {
        event: 'subscription_activated',
        externalId: data?.subscription?.uid,
        subscriberId: data?.subscriber?.uid,
        status: 'active',
      };
    }

    if (type === 'subscription:execution') {
      const isSuccess = data?.context?.status === 'success' || data?.payment?.status?.code === '200';
      return {
        event: isSuccess ? 'payment_success' : 'payment_failed',
        externalId: data?.subscription?.uid,
        subscriberId: data?.subscriber?.uid,
        paymentId: data?.payment?.id,
        amount: data?.execution?.total || data?.payment?.total,
        status: isSuccess ? 'approved' : 'rejected',
      };
    }

    return { event: 'unknown', externalId: null, status: null };
  }
}

module.exports = MobbexProvider;
```

### Provider: MercadoPago

```javascript
// services/payment/MercadoPagoProvider.js
const { MercadoPagoConfig, PreApproval } = require('mercadopago');
const BaseProvider = require('./BaseProvider');

const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});

class MercadoPagoProvider extends BaseProvider {

  async createSubscription({ email, planName, amount, billingCycle, successUrl }) {
    const preApproval = new PreApproval(mpClient);
    const frequency = billingCycle === 'monthly' ? 1 : 12;

    const subscription = await preApproval.create({
      body: {
        back_url: successUrl,
        reason: `Huevos Point - ${planName}`,
        auto_recurring: {
          frequency,
          frequency_type: 'months',
          transaction_amount: amount,
          currency_id: 'ARS',
        },
        payer_email: email,
        status: 'pending',
      },
    });

    return {
      checkoutUrl: subscription.init_point,
      externalId: subscription.id,
    };
  }

  async cancelSubscription(mpPreapprovalId) {
    const preApproval = new PreApproval(mpClient);
    await preApproval.update({
      id: mpPreapprovalId,
      body: { status: 'cancelled' },
    });
  }

  async handleWebhook(req) {
    const { type, data } = req.body;

    if (type === 'subscription_preapproval') {
      const preApproval = new PreApproval(mpClient);
      const sub = await preApproval.get({ id: data.id });

      const eventMap = {
        authorized: 'subscription_activated',
        cancelled: 'subscription_cancelled',
        paused: 'subscription_suspended',
      };

      return {
        event: eventMap[sub.status] || 'unknown',
        externalId: sub.id,
        status: sub.status === 'authorized' ? 'active' : sub.status,
      };
    }

    if (type === 'payment') {
      return {
        event: 'payment_received',
        externalId: null,
        paymentId: data.id,
        status: 'approved',
      };
    }

    return { event: 'unknown', externalId: null, status: null };
  }
}

module.exports = MercadoPagoProvider;
```

---

# PARTE 3 — ARQUITECTURA MULTI-TENANT

> ✅ APLICA A ESTE PROYECTO. Implementar en el sistema actual.

## Enfoque elegido: Shared Schema (Base de datos unificada)

| Factor | Análisis |
|--------|----------|
| Volumen esperado de tenants | Alto (decenas a cientos de distribuidoras) |
| Tamaño por tenant | Pequeño/mediano (pocas tablas, miles de registros) |
| Necesidad de analytics cross-tenant | Sí (el superadmin necesita ver métricas consolidadas) |
| Costo de infraestructura | Debe ser mínimo (startup en crecimiento) |
| Complejidad operativa | 1 sola DB, 1 solo deploy, 1 sola migración |
| Aislamiento requerido | Lógico (suficiente para este tipo de datos comerciales) |

**Regla de oro:** Cada tabla de datos de negocio lleva `tenant_id` como columna obligatoria con índice compuesto.

## Base de datos completa

### Tablas globales (gestión del SaaS)

```sql
-- ───────────────────────────────────────────────────────
-- TENANTS — Tabla maestra de clientes
-- ───────────────────────────────────────────────────────
CREATE TABLE tenants (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                TEXT UNIQUE NOT NULL,
  name                TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending',
  -- Estados: 'pending', 'active', 'suspended', 'cancelled'
  subscription_status TEXT DEFAULT 'pending',
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- ───────────────────────────────────────────────────────
-- PLANES DE SUSCRIPCIÓN
-- ───────────────────────────────────────────────────────
CREATE TABLE subscription_plans (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(50) NOT NULL,
  display_name  VARCHAR(100) NOT NULL,
  description   TEXT,
  price_monthly DECIMAL(12,2) NOT NULL,
  price_yearly  DECIMAL(12,2) NOT NULL,
  max_branches  INT NOT NULL DEFAULT 1,
  max_users     INT NOT NULL DEFAULT 3,    -- -1 = ilimitado
  features      JSONB NOT NULL DEFAULT '{}',
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ───────────────────────────────────────────────────────
-- SUSCRIPCIONES — Con soporte Mobbex + MercadoPago
-- ───────────────────────────────────────────────────────
CREATE TABLE subscriptions (
  id                    SERIAL PRIMARY KEY,
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id               INT NOT NULL REFERENCES subscription_plans(id),
  billing_cycle         VARCHAR(10) NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
  status                VARCHAR(20) NOT NULL DEFAULT 'pending',
  payment_provider      VARCHAR(20) NOT NULL CHECK (payment_provider IN ('mobbex', 'mercadopago')),
  mobbex_subscription_uid VARCHAR(255),
  mobbex_subscriber_uid   VARCHAR(255),
  mp_preapproval_id     VARCHAR(255),
  mp_payer_email        VARCHAR(255),
  current_period_start  TIMESTAMPTZ,
  current_period_end    TIMESTAMPTZ,
  trial_ends_at         TIMESTAMPTZ,
  cancelled_at          TIMESTAMPTZ,
  suspended_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

-- ───────────────────────────────────────────────────────
-- PAGOS — Historial unificado
-- ───────────────────────────────────────────────────────
CREATE TABLE subscription_payments (
  id                  SERIAL PRIMARY KEY,
  subscription_id     INT NOT NULL REFERENCES subscriptions(id),
  tenant_id           UUID NOT NULL REFERENCES tenants(id),
  amount              DECIMAL(12,2) NOT NULL,
  currency            VARCHAR(3) DEFAULT 'ARS',
  status              VARCHAR(20) NOT NULL,
  payment_provider    VARCHAR(20) NOT NULL,
  external_payment_id VARCHAR(255),
  provider_status     VARCHAR(50),
  provider_detail     VARCHAR(100),
  payment_date        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- ───────────────────────────────────────────────────────
-- ONBOARDING — Registros del flujo de alta
-- ───────────────────────────────────────────────────────
CREATE TABLE onboarding_registrations (
  id                SERIAL PRIMARY KEY,
  business_name     VARCHAR(200) NOT NULL,
  business_type     VARCHAR(100),
  contact_name      VARCHAR(200) NOT NULL,
  contact_email     VARCHAR(255) NOT NULL UNIQUE,
  contact_phone     VARCHAR(50),
  plan_id           INT REFERENCES subscription_plans(id),
  billing_cycle     VARCHAR(10),
  payment_provider  VARCHAR(20),
  status            VARCHAR(20) DEFAULT 'pending',
  tenant_id         UUID REFERENCES tenants(id),
  user_id           INT,
  subscription_id   INT REFERENCES subscriptions(id),
  temp_password_hash VARCHAR(255),
  created_at        TIMESTAMPTZ DEFAULT now(),
  completed_at      TIMESTAMPTZ
);

-- ───────────────────────────────────────────────────────
-- AUDIT LOG DEL SUPERADMIN
-- ───────────────────────────────────────────────────────
CREATE TABLE superadmin_audit_log (
  id            SERIAL PRIMARY KEY,
  admin_user_id INT NOT NULL,
  action        TEXT NOT NULL,
  target_tenant UUID REFERENCES tenants(id),
  details       JSONB DEFAULT '{}',
  ip_address    INET,
  created_at    TIMESTAMPTZ DEFAULT now()
);
```

### Tablas de negocio (TODAS con tenant_id)

```sql
-- Usuarios (incluye rol de superadmin)
CREATE TABLE users (
  id          SERIAL PRIMARY KEY,
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        VARCHAR(200) NOT NULL,
  email       VARCHAR(255) NOT NULL,
  phone       VARCHAR(50),
  password    VARCHAR(255) NOT NULL,
  role        VARCHAR(20) NOT NULL DEFAULT 'employee',
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, email)
);
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_tenant_email ON users(tenant_id, email);

-- Sucursales
CREATE TABLE branches (
  id          SERIAL PRIMARY KEY,
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        VARCHAR(200) NOT NULL,
  address     TEXT,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_branches_tenant ON branches(tenant_id);

-- Productos
CREATE TABLE products (
  id          SERIAL PRIMARY KEY,
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        VARCHAR(200) NOT NULL,
  price       DECIMAL(12,2) NOT NULL,
  stock       INT DEFAULT 0,
  is_deleted  BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_products_tenant ON products(tenant_id);
CREATE INDEX idx_products_tenant_active ON products(tenant_id, is_deleted);

-- Ventas
CREATE TABLE sales (
  id              SERIAL PRIMARY KEY,
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id       INT NOT NULL REFERENCES branches(id),
  user_id         INT REFERENCES users(id),
  total           DECIMAL(12,2) NOT NULL,
  payment_methods JSONB NOT NULL DEFAULT '[]',
  -- Ej: [{"method": "efectivo", "amount": 5000}, {"method": "transferencia", "amount": 3000}]
  discount        DECIMAL(12,2) DEFAULT 0,
  source          VARCHAR(50) DEFAULT 'manual',
  -- Valores: 'manual', 'mp_point', 'mp_transfer', 'mp_qr', 'mp_online'
  is_auto_registered BOOLEAN DEFAULT false,
  mp_payment_id   BIGINT,
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_sales_tenant ON sales(tenant_id);
CREATE INDEX idx_sales_tenant_date ON sales(tenant_id, created_at DESC);
CREATE INDEX idx_sales_tenant_branch ON sales(tenant_id, branch_id);

-- Items de venta
CREATE TABLE sale_items (
  id          SERIAL PRIMARY KEY,
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sale_id     INT NOT NULL REFERENCES sales(id),
  product_id  INT REFERENCES products(id),
  quantity    INT NOT NULL,
  unit_price  DECIMAL(12,2) NOT NULL,
  discount    DECIMAL(12,2) DEFAULT 0,
  subtotal    DECIMAL(12,2) NOT NULL,
  description TEXT
);
CREATE INDEX idx_sale_items_tenant ON sale_items(tenant_id);

-- Egresos
CREATE TABLE expenses (
  id          SERIAL PRIMARY KEY,
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id   INT NOT NULL REFERENCES branches(id),
  user_id     INT NOT NULL REFERENCES users(id),
  concept     TEXT NOT NULL,
  amount      DECIMAL(12,2) NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_expenses_tenant ON expenses(tenant_id);
CREATE INDEX idx_expenses_tenant_date ON expenses(tenant_id, created_at DESC);

-- Compras a proveedores
CREATE TABLE purchases (
  id            SERIAL PRIMARY KEY,
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  supplier_id   INT REFERENCES suppliers(id),
  branch_id     INT REFERENCES branches(id),
  total         DECIMAL(12,2) NOT NULL,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_purchases_tenant ON purchases(tenant_id);

-- Clientes (solo Plan Profesional)
CREATE TABLE clients (
  id              SERIAL PRIMARY KEY,
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            VARCHAR(200) NOT NULL,
  phone           VARCHAR(50),
  email           VARCHAR(255),
  address         TEXT,
  balance         DECIMAL(12,2) DEFAULT 0,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_clients_tenant ON clients(tenant_id);

-- Proveedores
CREATE TABLE suppliers (
  id              SERIAL PRIMARY KEY,
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            VARCHAR(200) NOT NULL,
  phone           VARCHAR(50),
  email           VARCHAR(255),
  payment_terms   TEXT,
  balance         DECIMAL(12,2) DEFAULT 0,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_suppliers_tenant ON suppliers(tenant_id);

-- Log de auditoría por tenant (solo Plan Profesional)
CREATE TABLE audit_log (
  id          SERIAL PRIMARY KEY,
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id     INT NOT NULL REFERENCES users(id),
  action      TEXT NOT NULL,
  entity      TEXT,
  entity_id   INT,
  details     JSONB DEFAULT '{}',
  ip_address  INET,
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_audit_tenant ON audit_log(tenant_id);
CREATE INDEX idx_audit_tenant_date ON audit_log(tenant_id, created_at DESC);

-- Datos iniciales: Planes
INSERT INTO subscription_plans (name, display_name, description, price_monthly, price_yearly, max_branches, max_users, features) VALUES
('basico', 'Plan Básico', 'Gestión esencial para distribuidoras pequeñas', 15000, 135000, 1, 3,
 '{"ventas":true,"egresos":true,"stock":true,"compras_basico":true,"dashboard":true,"email_diario":true,"metodos_pago":["efectivo","transferencia","tarjeta","mercadopago"],"clientes":false,"proveedores_avanzado":false,"metricas_avanzadas":false,"auditoria":false,"exportacion_excel":false,"mp_point":false,"modo_demo":false,"descuentos_item":false}'::jsonb),
('profesional', 'Plan Profesional', 'Control total para distribuidoras en crecimiento', 35000, 315000, 5, -1,
 '{"ventas":true,"egresos":true,"stock":true,"compras_basico":true,"compras_avanzado":true,"dashboard":true,"email_diario":true,"metodos_pago":["efectivo","transferencia","tarjeta","mercadopago","otro"],"clientes":true,"proveedores_avanzado":true,"metricas_avanzadas":true,"auditoria":true,"exportacion_excel":true,"mp_point":true,"modo_demo":true,"descuentos_item":true,"rendimiento_empleado":true,"rendimiento_sucursal":true}'::jsonb);
```

## Middleware de tenant (aislamiento de datos)

```javascript
// middleware/tenantMiddleware.js
function tenantMiddleware(req, res, next) {
  const tenantId = req.user?.tenant_id;
  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant no identificado' });
  }
  req.tenantId = tenantId;
  next();
}
module.exports = tenantMiddleware;
```

### Repository base con tenant automático (Sequelize)

```javascript
// repositories/TenantRepository.js
class TenantRepository {
  constructor(model) {
    this.model = model;
  }

  _tenantWhere(req, extraWhere = {}) {
    return { tenant_id: req.tenantId, ...extraWhere };
  }

  async findAll(req, options = {}) {
    return this.model.findAll({ where: this._tenantWhere(req, options.where), ...options });
  }

  async findById(req, id) {
    return this.model.findOne({ where: this._tenantWhere(req, { id }) });
  }

  async create(req, data) {
    return this.model.create({ ...data, tenant_id: req.tenantId });
  }

  async update(req, id, data) {
    delete data.tenant_id;
    return this.model.update(data, { where: this._tenantWhere(req, { id }) });
  }

  async delete(req, id) {
    return this.model.destroy({ where: this._tenantWhere(req, { id }) });
  }
}
module.exports = TenantRepository;
```

### ANTI-PATRÓN: Lo que NUNCA hacer

```javascript
// ❌ NUNCA — Query sin tenant_id = fuga de datos entre clientes
const products = await Product.findAll();

// ❌ NUNCA — Confiar en el tenant_id que manda el frontend
const products = await Product.findAll({ where: { tenant_id: req.body.tenant_id } });

// ✅ CORRECTO — Siempre desde el JWT verificado
const products = await ProductRepo.findAll(req);
```

---

# PARTE 4 — PANEL SUPERADMIN MAESTRO

> ✅ APLICA A ESTE PROYECTO. Implementar en el sistema actual.

## Visión del superadmin

Acceso cross-tenant total, auditado. Ver y gestionar todos los tenants desde una interfaz maestra.

| Acción | employee | admin | superadmin |
|--------|----------|-------|------------|
| Ver datos de su sucursal | ✅ | ✅ | ✅ |
| Ver todas las sucursales del tenant | ❌ | ✅ | ✅ |
| Gestionar usuarios del tenant | ❌ | ✅ | ✅ |
| Ver datos de OTROS tenants | ❌ | ❌ | ✅ |
| Gestionar suscripciones | ❌ | ❌ | ✅ |
| Suspender/reactivar tenants | ❌ | ❌ | ✅ |
| Cambiar plan de un tenant | ❌ | ❌ | ✅ |
| Ver métricas globales del SaaS | ❌ | ❌ | ✅ |
| Crear tenants manualmente | ❌ | ❌ | ✅ |

## Middleware de superadmin

```javascript
// middleware/superadminAuth.js
function requireSuperadmin(req, res, next) {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  next();
}

function superadminWithAudit(req, res, next) {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  const targetTenant = req.params.tenantId || req.query.tenantId;
  if (targetTenant) {
    SuperadminAuditLog.create({
      admin_user_id: req.user.id,
      action: `${req.method} ${req.originalUrl}`,
      target_tenant: targetTenant,
      details: { query: req.query, params: req.params },
      ip_address: req.ip,
    });
  }
  next();
}
```

## API del Superadmin

```javascript
// routes/superadmin.js
// GET /api/superadmin/dashboard       → MRR, ARR, churn, desglose por pasarela y plan
// GET /api/superadmin/tenants         → lista con filtros (plan, status, provider, search)
// GET /api/superadmin/tenants/:id     → detalle completo con métricas y pagos
// POST /api/superadmin/tenants/:id/suspend    → suspender tenant
// POST /api/superadmin/tenants/:id/reactivate → reactivar tenant
// POST /api/superadmin/tenants/:id/change-plan → cambiar plan
// GET /api/superadmin/tenants/:id/branches    → sucursales con ventas del día
```

---

# PARTE 5 — FLUJO DE ONBOARDING COMPLETO

> ✅ APLICA A ESTE PROYECTO. Implementar en el sistema actual.

## Paso a paso

1. **Landing page:** Usuario elige plan
2. **Formulario de registro** (5 campos + selector de pasarela):
   - Nombre del negocio, Nombre completo, Email, Teléfono, Contraseña
   - Selector: Tarjeta (Mobbex) | MercadoPago
   - Toggle: Mensual / Anual (25% off)
3. **Backend crea recursos en transacción:**
   - `INSERT tenants` (status: pending)
   - `INSERT users` (admin del tenant, password hasheada)
   - `INSERT branches` (sucursal inicial "Principal")
   - `INSERT subscriptions` (status: pending)
   - `INSERT onboarding_registrations`
   - Llama al provider → obtiene checkoutUrl
4. **Redirect al checkout** (Mobbex o MP)
5. **Webhook confirma pago:**
   - `subscription.status → 'active'`
   - `tenant.status → 'active'`
   - Email de bienvenida con credenciales
6. **Redirect al login:** `app.huevospoint.com/login`

---

# PARTE 6 — ROADMAP DE IMPLEMENTACIÓN

> ✅ APLICA A ESTE PROYECTO. Guía de implementación por fases.

## Fase 1 — Base de datos y configuración (Semanas 1-2)
- [ ] Ejecutar todas las migraciones SQL (tablas globales + negocio)
- [ ] Verificar que TODAS las tablas de negocio tengan `tenant_id` con índice
- [ ] Insertar planes iniciales (Básico y Profesional)
- [ ] Crear cuenta en Mobbex + obtener API key y access token
- [ ] Verificar credenciales de MercadoPago (ya existentes)
- [ ] Configurar webhooks en ambas pasarelas

## Fase 2 — Multi-tenancy y capa de pagos (Semanas 2-4)
- [ ] Implementar `tenantMiddleware` (extrae tenant_id del JWT)
- [ ] Implementar `TenantRepository` base
- [ ] Migrar TODOS los repositorios/queries existentes para usar TenantRepository
- [ ] Test de aislamiento: tenant A no puede ver datos de tenant B
- [ ] Implementar `PaymentProviderFactory`, `MobbexProvider`, `MercadoPagoProvider`
- [ ] Implementar webhooks unificados
- [ ] Testear flujo completo en sandboxes

## Fase 2B — Integración MercadoPago Point + Transferencias (Semanas 3-4)
- [ ] Crear tabla `mp_incoming_payments`
- [ ] Modificar tabla `sales` (agregar source, is_auto_registered, mp_payment_id)
- [ ] Configurar webhook de Point en panel MP Developers
- [ ] Implementar `mpPointService.validateWebhookSignature()` (HMAC SHA256)
- [ ] Implementar `mpPointService.getPaymentDetails()`
- [ ] Implementar `mpPointService.processIncomingPayment()`
- [ ] Implementar endpoint `POST /api/webhooks/mercadopago-point`
- [ ] Actualización en tiempo real del dashboard (polling o SSE)
- [ ] Test E2E: pagar con Point → webhook → venta registrada
- [ ] Test E2E: transferir a cuenta MP → webhook → venta registrada

## Fase 3 — API de Onboarding (Semanas 4-6)
- [ ] `POST /api/onboarding/register`
- [ ] Middleware `subscriptionCheck`
- [ ] Middleware `requireFeature` (feature gating por plan)
- [ ] `GET /api/subscription/status`
- [ ] `POST /api/subscription/cancel`

## Fase 4 — Landing Page (Semanas 6-8)
> Esta fase corresponde al sitio web de venta, proyecto separado.

## Fase 5 — Panel Superadmin Maestro (Semanas 8-10)
- [ ] Dashboard global (MRR, ARR, churn)
- [ ] Lista de tenants con filtros
- [ ] Vista detalle de tenant con sucursales y pagos
- [ ] Acciones: suspender, reactivar, cambiar plan
- [ ] `superadmin_audit_log`

## Fase 6 — Emails + Pulido + Lanzamiento (Semanas 10-13)
- [ ] Emails: bienvenida, comprobante, fallo de pago, suspensión
- [ ] Términos y condiciones, política de privacidad
- [ ] Test end-to-end completo
- [ ] Soft launch con 2-3 distribuidoras conocidas

---

# PARTE 7 — SEGURIDAD MULTI-TENANT — CHECKLIST

```
[x] tenant_id en TODAS las tablas de negocio
[x] Índice compuesto (tenant_id + campo búsqueda) en cada tabla
[x] Middleware resuelve tenant desde JWT (no desde frontend)
[x] TenantRepository inyecta tenant_id automáticamente
[x] Superadmin auditado: toda acción cross-tenant queda logueada
[x] Test de aislamiento: tenant A no ve datos de tenant B
[x] Rate limiting por tenant (no solo por IP)
[x] Encriptación en tránsito (HTTPS) y en reposo (Neon encripta)
[x] Retornar 404 (no 403) cuando un tenant intenta acceder a recurso de otro
[x] Webhooks de pago validados (re-consultar API antes de actuar)
[x] Variables sensibles en .env (nunca en código)
[x] Modo demo con cero acceso a datos reales
```

---

# PARTE 8 — INTEGRACIÓN MERCADOPAGO POINT + TRANSFERENCIAS

> ✅ APLICA A ESTE PROYECTO. Implementar como Fase 2B del roadmap.

## Objetivo

Que toda venta procesada físicamente (terminal Point o transferencia) se registre automáticamente como venta en el sistema, sin intervención manual.

## Arquitectura

```
LOCAL FÍSICO
  Cliente paga con Point  →  MercadoPago procesa  →  Webhook enviado
  Cliente transfiere      →  MP recibe dinero     →  Webhook enviado
                                                         ↓
                                        POST /api/webhooks/mercadopago-point
                                                         ↓
                                        1. Validar firma (HMAC SHA256)
                                        2. Consultar API MP /v1/payments/{id}
                                        3. Verificar idempotencia
                                        4. Crear venta automática en DB
                                        5. Responder 200 a MP
```

## Nueva tabla

```sql
CREATE TABLE mp_incoming_payments (
  id                  SERIAL PRIMARY KEY,
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id           INT REFERENCES branches(id),
  mp_payment_id       BIGINT NOT NULL UNIQUE,     -- Idempotencia
  mp_status           VARCHAR(50) NOT NULL,
  mp_payment_type     VARCHAR(50),
  mp_payment_method   VARCHAR(50),
  mp_source           VARCHAR(50),                -- 'point', 'transfer', 'qr', 'online'
  amount              DECIMAL(12,2) NOT NULL,
  net_amount          DECIMAL(12,2),
  currency            VARCHAR(3) DEFAULT 'ARS',
  sale_id             INT REFERENCES sales(id),
  external_reference  VARCHAR(255),
  payer_email         VARCHAR(255),
  description         TEXT,
  mp_date_approved    TIMESTAMPTZ,
  raw_data            JSONB,
  processed           BOOLEAN DEFAULT false,
  processing_error    TEXT,
  created_at          TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_mp_payments_tenant ON mp_incoming_payments(tenant_id);
CREATE INDEX idx_mp_payments_mp_id ON mp_incoming_payments(mp_payment_id);
CREATE INDEX idx_mp_payments_processed ON mp_incoming_payments(tenant_id, processed);
```

## Modificaciones a tabla sales

```sql
ALTER TABLE sales ADD COLUMN source VARCHAR(50) DEFAULT 'manual';
ALTER TABLE sales ADD COLUMN is_auto_registered BOOLEAN DEFAULT false;
ALTER TABLE sales ADD COLUMN mp_payment_id BIGINT;
ALTER TABLE sales ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE sale_items ADD COLUMN description TEXT;
```

## Mapeo payment_type_id → método del sistema

| `payment_type_id` de MP | Método en Huevos Point |
|--------------------------|------------------------|
| `credit_card` | `tarjeta_credito` |
| `debit_card` | `tarjeta_debito` |
| `account_money` | `mercadopago` |
| `bank_transfer` | `transferencia` |
| `ticket` | `efectivo` |

## Actualización en tiempo real del frontend

### Opción A: Polling (más simple)
```javascript
useEffect(() => {
  const interval = setInterval(async () => {
    const res = await fetch('/api/sales/today', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setSales(data.sales);
  }, 15000);
  return () => clearInterval(interval);
}, []);
```

### Opción B: Server-Sent Events (mejor experiencia)
```javascript
// Backend
router.get('/api/sales/stream', authMiddleware, tenantMiddleware, (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  const onNewSale = (sale) => {
    if (sale.tenant_id === req.tenantId) res.write(`data: ${JSON.stringify(sale)}\n\n`);
  };
  salesEventEmitter.on('new_sale', onNewSale);
  req.on('close', () => salesEventEmitter.off('new_sale', onNewSale));
});

// Frontend
useEffect(() => {
  const es = new EventSource('/api/sales/stream');
  es.onmessage = (e) => {
    const sale = JSON.parse(e.data);
    setSales(prev => [sale, ...prev]);
  };
  return () => es.close();
}, []);
```

## Referencias de documentación MercadoPago

| Recurso | URL |
|---------|-----|
| Overview Point Integration | https://www.mercadopago.com.ar/developers/es/docs/mp-point/overview |
| Procesar pagos con Point | https://www.mercadopago.com.ar/developers/es/docs/mp-point/integration-configuration/integrate-with-pdv/payment-processing |
| Notificaciones Webhook (Point) | https://www.mercadopago.com.ar/developers/es/docs/mp-point/notifications |
| Notificaciones Webhook (General) | https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks |
| API Reference — Payments | https://www.mercadopago.com.ar/developers/es/reference/payments/_payments_id/get |
| SDK Node.js | https://www.mercadopago.com.ar/developers/es/docs/sdks-library/server-side/node |

---

*Plan v4 consolidada — 01/04/2026 — Huevos Point SaaS Ecosystem*
*Mobbex + MercadoPago | Shared Schema Multi-Tenant | Panel Superadmin | Point + Transferencias*