'use strict';

const jwt = require('jsonwebtoken');
const env = require('../config/environment');
const demoData = require('../fixtures/demoData');

/**
 * Intercepta TODAS las peticiones de usuarios con role === 'demo'.
 * - GETs: devuelve datos ficticios sin tocar la BD.
 * - Mutaciones (POST/PUT/DELETE): devuelve respuesta exitosa falsa sin tocar la BD.
 * - /api/users y /api/tenants: bloqueados con 403.
 *
 * Se monta ANTES de todas las rutas en app.js para garantizar que ningún
 * middleware posterior (tenantMiddleware, controladores) acceda a la BD.
 */
const demoMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return next();

  let decoded;
  try {
    decoded = jwt.verify(authHeader.slice(7), env.JWT_SECRET);
  } catch {
    // Token inválido o expirado → dejar que authMiddleware lo maneje
    return next();
  }

  if (decoded.role !== 'demo') return next();

  // ── A partir de aquí, usuario en modo demo ──────────────────────────────

  const { path, method } = req;

  // Bloquear rutas con datos reales de clientes
  if (
    path.startsWith('/api/users') ||
    path.startsWith('/api/tenants') ||
    path.startsWith('/api/cron')
  ) {
    return res.status(403).json({
      success: false,
      message: 'Sección no disponible en modo demo',
    });
  }

  // Logout: limpiar sesión sin consultar BD
  if (path === '/api/auth/logout' && method === 'POST') {
    return res.json({ success: true, message: 'Sesión cerrada correctamente' });
  }

  // Log de auditoría: silenciar sin escribir a BD
  if (path === '/api/audit-logs/action' && method === 'POST') {
    return res.json({ success: true, message: 'Acción registrada (modo demo)' });
  }

  // ── Seleccionar dataset según sucursal activa ───────────────────────────
  const isDemo2 = req.headers['x-tenant-id'] === '-1';
  const d = {
    dashboard:      isDemo2 ? demoData.dashboard2      : demoData.dashboard,
    products:       isDemo2 ? demoData.products2       : demoData.products,
    sales:          isDemo2 ? demoData.sales2          : demoData.sales,
    expenses:       isDemo2 ? demoData.expenses2       : demoData.expenses,
    auditLogs:      isDemo2 ? demoData.auditLogs2      : demoData.auditLogs,
    metrics:        isDemo2 ? demoData.metrics2        : demoData.metrics,
    monthlyBalance: isDemo2 ? demoData.monthlyBalance2 : demoData.monthlyBalance,
    purchasesPage:  isDemo2 ? demoData.purchasesPage2  : demoData.purchasesPage,
  };

  // ── GETs: devolver datos ficticios ──────────────────────────────────────
  if (method === 'GET') {
    if (path === '/api/dashboard/summary') {
      return res.json({ success: true, data: d.dashboard });
    }
    if (path === '/api/products') {
      return res.json({ success: true, data: d.products });
    }
    if (path === '/api/sales') {
      return res.json({ success: true, data: d.sales });
    }
    if (path === '/api/expenses') {
      return res.json({ success: true, data: d.expenses });
    }
    if (path === '/api/audit-logs') {
      return res.json({ success: true, data: d.auditLogs });
    }
    if (path === '/api/metrics') {
      return res.json({ success: true, data: d.metrics });
    }
    if (path === '/api/metrics/monthly-balance') {
      return res.json({ success: true, data: d.monthlyBalance });
    }
    if (path === '/api/purchases') {
      return res.json({ success: true, data: d.purchasesPage });
    }
    if (/^\/api\/purchases\/\d+\/receipt$/.test(path)) {
      return res.json({ success: true, data: { receiptData: null, receiptMimeType: null } });
    }
    // Health check y cualquier otro GET público: pasar al siguiente
    return next();
  }

  // ── Mutaciones: éxito simulado, sin escritura en BD ─────────────────────
  const fakeId = Math.floor(Math.random() * 9000) + 1000;
  const statusCode = method === 'POST' ? 201 : 200;

  const messages = {
    POST:   'Registro simulado correctamente (modo demo — datos no guardados)',
    PUT:    'Actualización simulada correctamente (modo demo — datos no guardados)',
    DELETE: 'Eliminación simulada correctamente (modo demo — datos no guardados)',
  };

  return res.status(statusCode).json({
    success: true,
    data: { id: fakeId, ...req.body },
    message: messages[method] || 'Operación simulada (modo demo)',
  });
};

module.exports = demoMiddleware;