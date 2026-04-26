const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const errorMiddleware = require('./middlewares/errorMiddleware');
const demoMiddleware = require('./middlewares/demoMiddleware');
const subscriptionCheck = require('./middlewares/subscriptionCheck');

// Register models and associations (required for Vercel serverless)
require('./models');

// Route imports
const authRoutes = require('./modules/auth/auth.routes');
const dashboardRoutes = require('./modules/dashboard/dashboard.routes');
const productsRoutes = require('./modules/products/products.routes');
const salesRoutes = require('./modules/sales/sales.routes');
const expensesRoutes = require('./modules/expenses/expenses.routes');
const auditRoutes = require('./modules/audit/audit.routes');
const metricsRoutes = require('./modules/metrics/metrics.routes');
const usersRoutes = require('./modules/users/users.routes');
const tenantsRoutes = require('./modules/tenants/tenants.routes');
const purchasesRoutes = require('./modules/purchases/purchases.routes');
const cronRoutes = require('./modules/cron/cron.routes');
const superadminRoutes = require('./modules/superadmin/superadmin.routes');
const publicApiRoutes = require('./modules/public/public.routes');
const apiKeysRoutes = require('./modules/apiKeys/apiKeys.routes');
const onboardingRoutes = require('./modules/onboarding/onboarding.routes');
const subscriptionsRoutes = require('./modules/subscriptions/subscriptions.routes');
const webhooksRoutes = require('./modules/webhooks/webhooks.routes');

const app = express();

// Trust proxy (required for Vercel/serverless behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? (process.env.CORS_ORIGIN || true)
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:3000', 'http://localhost:3001', 'http://localhost:4000'],
  credentials: true,
}));

// Rate limiting — general
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, message: 'Demasiadas solicitudes, intente más tarde' },
});
app.use(limiter);

// Rate limiting — strict for login (brute-force protection)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Demasiados intentos de inicio de sesión, intente en 15 minutos' },
});

// Rate limiting — public API for satellite systems (per IP, in addition to per-key limit)
const publicApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiadas solicitudes a la API pública, intente en 1 minuto' },
});

// Capturar rawBody para webhooks de MercadoPago (necesario para verificar firma HMAC)
// Debe ir ANTES de express.json
app.use('/api/webhooks/mercadopago-subscriptions', express.raw({ type: '*/*', limit: '1mb' }), (req, _res, next) => {
  req.rawBody = req.body;
  req.body = req.body.length ? JSON.parse(req.body.toString()) : {};
  next();
});

// Body parsing (5mb to allow base64-encoded receipt images on purchases)
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Demo mode interceptor — must run before all routes (no DB access for role=demo)
app.use(demoMiddleware);

// ── Rutas públicas (sin auth) ────────────────────────────────────────────────
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/webhooks', webhooksRoutes);

// ── Rutas protegidas con JWT ─────────────────────────────────────────────────
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authRoutes);

// subscriptionCheck se aplica a todas las rutas que requieren tenant activo
app.use('/api/dashboard', subscriptionCheck, dashboardRoutes);
app.use('/api/products', subscriptionCheck, productsRoutes);
app.use('/api/sales', subscriptionCheck, salesRoutes);
app.use('/api/expenses', subscriptionCheck, expensesRoutes);
app.use('/api/audit-logs', subscriptionCheck, auditRoutes);
app.use('/api/metrics', subscriptionCheck, metricsRoutes);
app.use('/api/users', subscriptionCheck, usersRoutes);
app.use('/api/tenants', tenantsRoutes);
app.use('/api/purchases', subscriptionCheck, purchasesRoutes);
app.use('/api/cron', cronRoutes);
app.use('/api/superadmin', superadminRoutes);

// Suscripción del tenant actual (auth requerida, subscriptionCheck no aplica aquí)
app.use('/api/subscription', subscriptionsRoutes);

// Internal admin: API key management (JWT + superadmin)
app.use('/api/admin/api-keys', apiKeysRoutes);

// External read-only API for satellite systems (API key auth)
app.use('/api/public/v1', publicApiLimiter, publicApiRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'Huevos Point API running' });
});



// Global error handler (must be last)
app.use(errorMiddleware);

module.exports = app;
