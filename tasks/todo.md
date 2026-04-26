# Fase 3 — API Onboarding + Suscripciones

## Estado: COMPLETADO ✓

---

## Diagnóstico del estado actual

### Ya existe (no crear de nuevo):
- `models/Subscription.js` — OK, falta solo `trialEndsAt`
- `models/SubscriptionPlan.js` — completo
- `models/index.js` — ya tiene asociaciones Tenant↔Subscription↔SubscriptionPlan
- `Tenant.js` — ya tiene `subscription_status` y `slug`
- `utils/mailer.js` — `sendMail()` listo, vía Nodemailer/SMTP

### No existe (crear):
- Tablas DB: `subscription_payments`, `onboarding_registrations`, `contact_requests`
  - `subscription_plans` + `subscriptions` pueden existir en DB según deploy anterior
- Modelos: `SubscriptionPayment`, `OnboardingRegistration`, `ContactRequest`
- Servicios: `services/payment/` (Factory + MobbexProvider + MercadoPagoProvider)
- Módulos: `onboarding/`, `subscriptions/`, `webhooks/`
- Middlewares: `subscriptionCheck.js`, `requireFeature.js`

---

## Plan de implementación

### Paso 1 — DB migrations (server/api/index.js)
- [ ] `subscription_plans` CREATE IF NOT EXISTS + INSERT planes (ON CONFLICT DO NOTHING)
- [ ] `subscriptions` CREATE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS `trial_ends_at`
- [ ] `subscription_payments` CREATE IF NOT EXISTS
- [ ] `onboarding_registrations` CREATE IF NOT EXISTS
- [ ] `contact_requests` CREATE IF NOT EXISTS
- [ ] Índices para todas las tablas nuevas

### Paso 2 — Modelos Sequelize
- [ ] `Subscription.js` — agregar campo `trialEndsAt`
- [ ] `SubscriptionPayment.js` — nuevo modelo
- [ ] `OnboardingRegistration.js` — nuevo modelo
- [ ] `ContactRequest.js` — nuevo modelo
- [ ] `models/index.js` — registrar nuevos modelos + asociaciones

### Paso 3 — Payment services
- [ ] `services/payment/PaymentProviderFactory.js`
- [ ] `services/payment/MobbexProvider.js`
- [ ] `services/payment/MercadoPagoProvider.js`

### Paso 4 — Módulo onboarding
- [ ] `modules/onboarding/onboarding.service.js` — lógica en transacción + llamada a provider
- [ ] `modules/onboarding/onboarding.controller.js`
- [ ] `modules/onboarding/onboarding.routes.js` — GET /plans, POST /register, POST /contact

### Paso 5 — Módulo subscriptions
- [ ] `modules/subscriptions/subscriptions.service.js`
- [ ] `modules/subscriptions/subscriptions.controller.js`
- [ ] `modules/subscriptions/subscriptions.routes.js` — GET /status, POST /cancel

### Paso 6 — Módulo webhooks
- [ ] `modules/webhooks/webhooks.service.js` — `processWebhookResult()` (idempotente)
- [ ] `modules/webhooks/webhooks.controller.js`
- [ ] `modules/webhooks/webhooks.routes.js` — POST /mobbex, POST /mercadopago-subscriptions

### Paso 7 — Middlewares
- [ ] `middlewares/subscriptionCheck.js` — verifica tenant.subscription_status, carga planFeatures/planLimits
- [ ] `middlewares/requireFeature.js` — verifica req.planFeatures[featureName]

### Paso 8 — app.js
- [ ] Registrar rutas: `/api/onboarding`, `/api/subscription`, `/api/webhooks`
- [ ] Aplicar `subscriptionCheck` a todas las rutas protegidas existentes
- [ ] Configurar `express.raw()` para `/api/webhooks` (necesario para verificar firma HMAC)

### Paso 9 — environment.js + .env.example
- [ ] Agregar: MOBBEX_API_KEY, MOBBEX_ACCESS_TOKEN, MP_ACCESS_TOKEN, MP_WEBHOOK_SECRET, APP_LOGIN_URL, LANDING_URL, CONTACT_EMAIL

### Paso 10 — Dependencias
- [ ] `npm install mercadopago axios` en /server

### Paso 11 — server.js (dev)
- [ ] Agregar migrations nuevas al runner local de desarrollo

---

## Decisiones de diseño

- **Transacción Sequelize** en POST /register: si el provider falla, rollback completo
- **Idempotencia webhooks**: verificar si `external_payment_id` ya existe antes de insertar
- **Raw body para webhooks**: Mobbex usa `x-www-form-urlencoded`, MP requiere raw string para HMAC
- **subscriptionCheck bypass**: rol `superadmin` siempre pasa
- **Plan personalizado**: `is_contact_plan: true` en respuesta, no genera checkoutUrl
- **trialEndsAt**: field nuevo en Subscription model + columna en DB

---

## Rutas del módulo onboarding que NO llevan auth

```
GET  /api/onboarding/plans
POST /api/onboarding/register
POST /api/onboarding/contact
POST /api/webhooks/mobbex
POST /api/webhooks/mercadopago-subscriptions
```

## Rutas del módulo subscriptions (llevan auth)

```
GET  /api/subscription/status
POST /api/subscription/cancel
```
