// Configuración global para todos los tests del backend
// Se ejecuta ANTES de que se carguen los módulos en cada test file

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-jest-only';
process.env.JWT_EXPIRES_IN = '1h';
process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';
process.env.CRON_SECRET = 'test-cron-secret';
