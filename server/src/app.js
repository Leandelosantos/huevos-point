const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const errorMiddleware = require('./middlewares/errorMiddleware');
const demoMiddleware = require('./middlewares/demoMiddleware');

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

const app = express();

// Trust proxy (required for Vercel/serverless behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? (process.env.CORS_ORIGIN || true)
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:3000'],
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

// Body parsing (5mb to allow base64-encoded receipt images on purchases)
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Demo mode interceptor — must run before all routes (no DB access for role=demo)
app.use(demoMiddleware);

// API Routes
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/tenants', tenantsRoutes);
app.use('/api/purchases', purchasesRoutes);
app.use('/api/cron', cronRoutes);
app.use('/api/superadmin', superadminRoutes);

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
