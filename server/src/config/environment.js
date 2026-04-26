const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const NODE_ENV = process.env.NODE_ENV || 'development';

// Fail fast if critical secrets are missing in production
if (NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is required in production');
}

const environment = {
  NODE_ENV,
  PORT: parseInt(process.env.PORT, 10) || 3001,
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT, 10) || 5432,
  DB_NAME: process.env.DB_NAME || 'huevos_point',
  DB_USER: process.env.DB_USER || 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD || 'postgres',
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',
  // Email (SMTP)
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: process.env.SMTP_PORT || '587',
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_FROM_NAME: process.env.SMTP_FROM_NAME || 'Huevos Point',
  SMTP_FROM_EMAIL: process.env.SMTP_FROM_EMAIL || '',
  // Cron
  CRON_SECRET: process.env.CRON_SECRET || '',
  // Demo mode
  DEMO_PASSWORD: process.env.DEMO_PASSWORD || 'demo2025',
  // Mobbex
  MOBBEX_API_KEY: process.env.MOBBEX_API_KEY || '',
  MOBBEX_ACCESS_TOKEN: process.env.MOBBEX_ACCESS_TOKEN || '',
  // MercadoPago
  MP_ACCESS_TOKEN: process.env.MP_ACCESS_TOKEN || '',
  MP_WEBHOOK_SECRET: process.env.MP_WEBHOOK_SECRET || '',
  // URLs
  APP_LOGIN_URL: process.env.APP_LOGIN_URL || 'https://app.huevospoint.com/login',
  LANDING_URL: process.env.LANDING_URL || 'https://huevospoint.com',
  // Contact
  CONTACT_EMAIL: process.env.CONTACT_EMAIL || 'leandrodelosantos@gmail.com',
};

module.exports = environment;
