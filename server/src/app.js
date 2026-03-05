const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const errorMiddleware = require('./middlewares/errorMiddleware');

// Register models and associations (required for Vercel serverless)
require('./models');

// Route imports
const authRoutes = require('./modules/auth/auth.routes');
const dashboardRoutes = require('./modules/dashboard/dashboard.routes');
const productsRoutes = require('./modules/products/products.routes');
const salesRoutes = require('./modules/sales/sales.routes');
const expensesRoutes = require('./modules/expenses/expenses.routes');
const auditRoutes = require('./modules/audit/audit.routes');

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

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { success: false, message: 'Demasiadas solicitudes, intente más tarde' },
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/audit-logs', auditRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'Huevos Point API running' });
});

// TEMPORARY: Debug DB config (remove after deployment is working)
app.get('/api/debug-config', (_req, res) => {
  const env = require('./config/environment');
  res.json({
    NODE_ENV: env.NODE_ENV,
    DB_HOST: env.DB_HOST,
    DB_PORT: env.DB_PORT,
    DB_USER: env.DB_USER,
    DB_NAME: env.DB_NAME,
    DB_PASSWORD_LENGTH: (env.DB_PASSWORD || '').length,
    DB_PASSWORD_LAST3: (env.DB_PASSWORD || '').slice(-3),
  });
});

// Global error handler (must be last)
app.use(errorMiddleware);

module.exports = app;
