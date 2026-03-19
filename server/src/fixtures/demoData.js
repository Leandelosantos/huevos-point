'use strict';

/**
 * Datos ficticios para el modo Demo.
 * NUNCA se conecta a la base de datos. Solo es leído por demoMiddleware.
 */

const TODAY = '2026-03-19';
const t = (time) => `${TODAY}T${time}:00.000Z`; // helper timestamp

// ── Productos ──────────────────────────────────────────────────────────────
const products = [
  { id: 1, name: 'Huevos Blancos x30',    stockQuantity: 85,  unitPrice: 1200.00, isActive: true, tenantId: 0, createdAt: t('08:00'), updatedAt: t('08:00') },
  { id: 2, name: 'Huevos Marrones x30',   stockQuantity: 62,  unitPrice: 1350.00, isActive: true, tenantId: 0, createdAt: t('08:00'), updatedAt: t('08:00') },
  { id: 3, name: 'Huevos de Codorniz x24',stockQuantity: 18,  unitPrice: 800.00,  isActive: true, tenantId: 0, createdAt: t('08:00'), updatedAt: t('08:00') },
  { id: 4, name: 'Huevo Blanco Jumbo x12',stockQuantity: 44,  unitPrice: 650.00,  isActive: true, tenantId: 0, createdAt: t('08:00'), updatedAt: t('08:00') },
  { id: 5, name: 'Huevo Marrón Extra x12',stockQuantity: 31,  unitPrice: 720.00,  isActive: true, tenantId: 0, createdAt: t('08:00'), updatedAt: t('08:00') },
  { id: 6, name: 'Bandejas Plásticas',     stockQuantity: 210, unitPrice: 150.00,  isActive: true, tenantId: 0, createdAt: t('08:00'), updatedAt: t('08:00') },
  { id: 7, name: 'Cartón x6 unidades',    stockQuantity: 15,  unitPrice: 90.00,   isActive: true, tenantId: 0, createdAt: t('08:00'), updatedAt: t('08:00') },
];

// ── Ventas del día (para dashboard) ───────────────────────────────────────
const salesMovements = [
  {
    id: 101,
    type: 'VENTA',
    amount: 2400.00,
    discountAmount: 0,
    paymentMethod: 'Efectivo',
    description: 'Huevos Blancos x30 x2',
    details: [{ productName: 'Huevos Blancos x30', quantity: 2, discount: 0, discountConcept: null }],
    user: 'María López',
    createdAt: t('08:30'),
  },
  {
    id: 102,
    type: 'VENTA',
    amount: 1567.50,
    discountAmount: 82.50,
    paymentMethod: 'Tarjeta',
    description: 'Huevos Marrones x30 x1 + Bandejas Plásticas x2 (-5% cliente frecuente)',
    details: [
      { productName: 'Huevos Marrones x30', quantity: 1, discount: 5, discountConcept: 'Cliente frecuente' },
      { productName: 'Bandejas Plásticas',   quantity: 2, discount: 5, discountConcept: 'Cliente frecuente' },
    ],
    user: 'Carlos Rodríguez',
    createdAt: t('10:15'),
  },
  {
    id: 103,
    type: 'VENTA',
    amount: 1950.00,
    discountAmount: 0,
    paymentMethod: 'MercadoPago',
    description: 'Huevo Blanco Jumbo x12 x3',
    details: [{ productName: 'Huevo Blanco Jumbo x12', quantity: 3, discount: 0, discountConcept: null }],
    user: 'María López',
    createdAt: t('12:00'),
  },
  {
    id: 104,
    type: 'VENTA',
    amount: 800.00,
    discountAmount: 0,
    paymentMethod: 'Efectivo',
    description: 'Huevos de Codorniz x24 x1',
    details: [{ productName: 'Huevos de Codorniz x24', quantity: 1, discount: 0, discountConcept: null }],
    user: 'Carlos Rodríguez',
    createdAt: t('14:30'),
  },
];

const expensesMovements = [
  {
    id: 201,
    type: 'EGRESO',
    amount: 500.00,
    discountAmount: 0,
    paymentMethod: 'Caja',
    description: 'Viáticos repartidor',
    details: [],
    user: 'María López',
    createdAt: t('08:00'),
  },
  {
    id: 202,
    type: 'EGRESO',
    amount: 1200.00,
    discountAmount: 0,
    paymentMethod: 'Caja',
    description: 'Gas y electricidad local',
    details: [],
    user: 'Carlos Rodríguez',
    createdAt: t('13:00'),
  },
];

const totalIncome   = salesMovements.reduce((sum, s) => sum + s.amount, 0);   // 6717.50
const totalExpenses = expensesMovements.reduce((sum, e) => sum + e.amount, 0); // 1700.00

const dashboard = {
  summary: {
    date: TODAY,
    totalIncome,
    totalExpenses,
    netBalance: totalIncome - totalExpenses,
  },
  movements: [
    ...salesMovements,
    ...expensesMovements,
  ].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
};

// ── Historial de ventas (admin) ────────────────────────────────────────────
const sales = [
  {
    id: 101, userId: 10, totalAmount: 2400.00, paymentMethod: 'Efectivo',
    saleDate: TODAY, tenantId: 0, createdAt: t('08:30'), updatedAt: t('08:30'),
    user: { username: 'mlopez', fullName: 'María López' },
    items: [{ id: 1001, saleId: 101, productId: 1, quantity: 2, unitPrice: 1200.00, subtotal: 2400.00, discount: 0, discountConcept: null, product: { name: 'Huevos Blancos x30' } }],
  },
  {
    id: 102, userId: 11, totalAmount: 1567.50, paymentMethod: 'Tarjeta',
    saleDate: TODAY, tenantId: 0, createdAt: t('10:15'), updatedAt: t('10:15'),
    user: { username: 'crodriguez', fullName: 'Carlos Rodríguez' },
    items: [
      { id: 1002, saleId: 102, productId: 2, quantity: 1, unitPrice: 1350.00, subtotal: 1282.50, discount: 5, discountConcept: 'Cliente frecuente', product: { name: 'Huevos Marrones x30' } },
      { id: 1003, saleId: 102, productId: 6, quantity: 2, unitPrice: 150.00,  subtotal: 285.00,  discount: 5, discountConcept: 'Cliente frecuente', product: { name: 'Bandejas Plásticas' } },
    ],
  },
  {
    id: 103, userId: 10, totalAmount: 1950.00, paymentMethod: 'MercadoPago',
    saleDate: TODAY, tenantId: 0, createdAt: t('12:00'), updatedAt: t('12:00'),
    user: { username: 'mlopez', fullName: 'María López' },
    items: [{ id: 1004, saleId: 103, productId: 4, quantity: 3, unitPrice: 650.00, subtotal: 1950.00, discount: 0, discountConcept: null, product: { name: 'Huevo Blanco Jumbo x12' } }],
  },
  {
    id: 104, userId: 11, totalAmount: 800.00, paymentMethod: 'Efectivo',
    saleDate: TODAY, tenantId: 0, createdAt: t('14:30'), updatedAt: t('14:30'),
    user: { username: 'crodriguez', fullName: 'Carlos Rodríguez' },
    items: [{ id: 1005, saleId: 104, productId: 3, quantity: 1, unitPrice: 800.00, subtotal: 800.00, discount: 0, discountConcept: null, product: { name: 'Huevos de Codorniz x24' } }],
  },
];

// ── Egresos (admin) ────────────────────────────────────────────────────────
const expenses = [
  { id: 201, userId: 10, concept: 'Viáticos repartidor',    amount: 500.00,  expenseDate: TODAY, tenantId: 0, createdAt: t('08:00'), updatedAt: t('08:00'), user: { username: 'mlopez',      fullName: 'María López'      } },
  { id: 202, userId: 11, concept: 'Gas y electricidad local', amount: 1200.00, expenseDate: TODAY, tenantId: 0, createdAt: t('13:00'), updatedAt: t('13:00'), user: { username: 'crodriguez', fullName: 'Carlos Rodríguez' } },
];

// ── Métricas ───────────────────────────────────────────────────────────────
const metrics = {
  currentMonthTop: [
    { productId: 1, name: 'Huevos Blancos x30',     totalSold: 320 },
    { productId: 2, name: 'Huevos Marrones x30',    totalSold: 245 },
    { productId: 4, name: 'Huevo Blanco Jumbo x12', totalSold: 178 },
    { productId: 3, name: 'Huevos de Codorniz x24', totalSold: 92  },
    { productId: 6, name: 'Bandejas Plásticas',     totalSold: 85  },
  ],
  previousMonthTop: [
    { productId: 1, name: 'Huevos Blancos x30',     totalSold: 298 },
    { productId: 2, name: 'Huevos Marrones x30',    totalSold: 267 },
    { productId: 4, name: 'Huevo Blanco Jumbo x12', totalSold: 155 },
    { productId: 5, name: 'Huevo Marrón Extra x12', totalSold: 112 },
    { productId: 3, name: 'Huevos de Codorniz x24', totalSold: 78  },
  ],
  lowStockProducts: [
    { id: 3, name: 'Huevos de Codorniz x24', stockQuantity: 18 },
    { id: 7, name: 'Cartón x6 unidades',     stockQuantity: 15 },
  ],
};

const monthlyBalance = {
  totalIncome: 48500.00,
  totalExpenses: 12300.00,
  netBalance: 36200.00,
  year: 2026,
  month: 3,
};

// ── Compras ────────────────────────────────────────────────────────────────
const purchasesList = [
  { id: 301, tenantId: 0, productId: 1, userId: 10, quantity: 100, cost: 900.00,  price: 1200.00, marginAmount: 300.00, provider: 'La Granja SRL',      purchaseDate: '2026-03-10', createdAt: '2026-03-10T09:00:00.000Z', updatedAt: '2026-03-10T09:00:00.000Z', hasReceipt: false, product: { id: 1, name: 'Huevos Blancos x30'    }, user: { id: 10, username: 'mlopez',      fullName: 'María López'      } },
  { id: 302, tenantId: 0, productId: 2, userId: 11, quantity: 80,  cost: 1000.00, price: 1350.00, marginAmount: 350.00, provider: 'Ovopro S.A.',         purchaseDate: '2026-03-05', createdAt: '2026-03-05T10:30:00.000Z', updatedAt: '2026-03-05T10:30:00.000Z', hasReceipt: true,  product: { id: 2, name: 'Huevos Marrones x30'   }, user: { id: 11, username: 'crodriguez', fullName: 'Carlos Rodríguez' } },
  { id: 303, tenantId: 0, productId: 4, userId: 10, quantity: 50,  cost: 480.00,  price: 650.00,  marginAmount: 170.00, provider: 'La Granja SRL',      purchaseDate: '2026-03-01', createdAt: '2026-03-01T11:00:00.000Z', updatedAt: '2026-03-01T11:00:00.000Z', hasReceipt: false, product: { id: 4, name: 'Huevo Blanco Jumbo x12' }, user: { id: 10, username: 'mlopez',      fullName: 'María López'      } },
  { id: 304, tenantId: 0, productId: 6, userId: 11, quantity: 200, cost: 80.00,   price: 150.00,  marginAmount: 70.00,  provider: 'Envases del Sur',     purchaseDate: '2026-02-20', createdAt: '2026-02-20T09:00:00.000Z', updatedAt: '2026-02-20T09:00:00.000Z', hasReceipt: false, product: { id: 6, name: 'Bandejas Plásticas'    }, user: { id: 11, username: 'crodriguez', fullName: 'Carlos Rodríguez' } },
  { id: 305, tenantId: 0, productId: 3, userId: 10, quantity: 30,  cost: 550.00,  price: 800.00,  marginAmount: 250.00, provider: 'Granja Patagónica',   purchaseDate: '2026-02-15', createdAt: '2026-02-15T14:00:00.000Z', updatedAt: '2026-02-15T14:00:00.000Z', hasReceipt: true,  product: { id: 3, name: 'Huevos de Codorniz x24' }, user: { id: 10, username: 'mlopez',      fullName: 'María López'      } },
  { id: 306, tenantId: 0, productId: 5, userId: 11, quantity: 60,  cost: 520.00,  price: 720.00,  marginAmount: 200.00, provider: 'Ovopro S.A.',         purchaseDate: '2026-02-10', createdAt: '2026-02-10T08:00:00.000Z', updatedAt: '2026-02-10T08:00:00.000Z', hasReceipt: false, product: { id: 5, name: 'Huevo Marrón Extra x12' }, user: { id: 11, username: 'crodriguez', fullName: 'Carlos Rodríguez' } },
];

const purchasesPage = {
  total: purchasesList.length,
  purchases: purchasesList,
  totalPages: 1,
  currentPage: 1,
};

// ── Log de auditoría ───────────────────────────────────────────────────────
const auditLogs = {
  total: 20,
  logs: [
    { id: 401, tenantId: 0, userId: 10, username: 'mlopez',      actionType: 'LOGIN',              entity: 'users',    entityId: 10,  description: 'Inicio de sesión exitoso',                          previousData: null, newData: null, ipAddress: '192.168.1.10', createdAt: t('08:00') },
    { id: 402, tenantId: 0, userId: 11, username: 'crodriguez',  actionType: 'LOGIN',              entity: 'users',    entityId: 11,  description: 'Inicio de sesión exitoso',                          previousData: null, newData: null, ipAddress: '192.168.1.11', createdAt: t('08:05') },
    { id: 403, tenantId: 0, userId: 10, username: 'mlopez',      actionType: 'EGRESO',             entity: 'expenses', entityId: 201, description: 'Egreso registrado: Viáticos repartidor — $500.00',  previousData: null, newData: { concept: 'Viáticos repartidor', amount: 500 }, ipAddress: '192.168.1.10', createdAt: t('08:01') },
    { id: 404, tenantId: 0, userId: 10, username: 'mlopez',      actionType: 'VENTA',              entity: 'sales',    entityId: 101, description: 'Venta registrada — Total: $2400.00 (Efectivo)',      previousData: null, newData: { totalAmount: 2400, paymentMethod: 'Efectivo' }, ipAddress: '192.168.1.10', createdAt: t('08:30') },
    { id: 405, tenantId: 0, userId: 11, username: 'crodriguez',  actionType: 'VENTA',              entity: 'sales',    entityId: 102, description: 'Venta registrada — Total: $1567.50 (Tarjeta)',      previousData: null, newData: { totalAmount: 1567.5, paymentMethod: 'Tarjeta' }, ipAddress: '192.168.1.11', createdAt: t('10:15') },
    { id: 406, tenantId: 0, userId: 10, username: 'mlopez',      actionType: 'VENTA',              entity: 'sales',    entityId: 103, description: 'Venta registrada — Total: $1950.00 (MercadoPago)',  previousData: null, newData: { totalAmount: 1950, paymentMethod: 'MercadoPago' }, ipAddress: '192.168.1.10', createdAt: t('12:00') },
    { id: 407, tenantId: 0, userId: 11, username: 'crodriguez',  actionType: 'EGRESO',             entity: 'expenses', entityId: 202, description: 'Egreso registrado: Gas y electricidad local — $1200', previousData: null, newData: { concept: 'Gas y electricidad local', amount: 1200 }, ipAddress: '192.168.1.11', createdAt: t('13:00') },
    { id: 408, tenantId: 0, userId: 11, username: 'crodriguez',  actionType: 'VENTA',              entity: 'sales',    entityId: 104, description: 'Venta registrada — Total: $800.00 (Efectivo)',       previousData: null, newData: { totalAmount: 800, paymentMethod: 'Efectivo' }, ipAddress: '192.168.1.11', createdAt: t('14:30') },
    { id: 409, tenantId: 0, userId: 10, username: 'mlopez',      actionType: 'PRODUCTO_ACTUALIZADO', entity: 'products', entityId: 1,  description: 'Producto actualizado: Huevos Blancos x30',         previousData: { unitPrice: 1100 }, newData: { unitPrice: 1200 }, ipAddress: '192.168.1.10', createdAt: '2026-03-18T16:00:00.000Z' },
    { id: 410, tenantId: 0, userId: 10, username: 'mlopez',      actionType: 'COMPRA',             entity: 'purchases', entityId: 301, description: 'Compra registrada: 100x Huevos Blancos x30 — La Granja SRL', previousData: null, newData: { quantity: 100, cost: 900 }, ipAddress: '192.168.1.10', createdAt: '2026-03-10T09:00:00.000Z' },
    { id: 411, tenantId: 0, userId: 11, username: 'crodriguez',  actionType: 'COMPRA',             entity: 'purchases', entityId: 302, description: 'Compra registrada: 80x Huevos Marrones x30 — Ovopro S.A.', previousData: null, newData: { quantity: 80, cost: 1000 }, ipAddress: '192.168.1.11', createdAt: '2026-03-05T10:30:00.000Z' },
    { id: 412, tenantId: 0, userId: 10, username: 'mlopez',      actionType: 'COMPRA',             entity: 'purchases', entityId: 303, description: 'Compra registrada: 50x Huevo Blanco Jumbo x12 — La Granja SRL', previousData: null, newData: { quantity: 50, cost: 480 }, ipAddress: '192.168.1.10', createdAt: '2026-03-01T11:00:00.000Z' },
    { id: 413, tenantId: 0, userId: 11, username: 'crodriguez',  actionType: 'PRODUCTO_CREADO',    entity: 'products', entityId: 7,   description: 'Producto creado: Cartón x6 unidades',              previousData: null, newData: { name: 'Cartón x6 unidades', unitPrice: 90 }, ipAddress: '192.168.1.11', createdAt: '2026-02-28T09:00:00.000Z' },
    { id: 414, tenantId: 0, userId: 10, username: 'mlopez',      actionType: 'CAMBIAR_SUCURSAL',   entity: 'tenants',  entityId: 0,   description: 'Cambio de sucursal: Huevos Point',                 previousData: null, newData: null, ipAddress: '192.168.1.10', createdAt: '2026-02-25T08:00:00.000Z' },
    { id: 415, tenantId: 0, userId: 11, username: 'crodriguez',  actionType: 'COMPRA',             entity: 'purchases', entityId: 304, description: 'Compra registrada: 200x Bandejas Plásticas — Envases del Sur', previousData: null, newData: { quantity: 200, cost: 80 }, ipAddress: '192.168.1.11', createdAt: '2026-02-20T09:00:00.000Z' },
    { id: 416, tenantId: 0, userId: 10, username: 'mlopez',      actionType: 'COMPRA',             entity: 'purchases', entityId: 305, description: 'Compra registrada: 30x Huevos de Codorniz x24 — Granja Patagónica', previousData: null, newData: { quantity: 30, cost: 550 }, ipAddress: '192.168.1.10', createdAt: '2026-02-15T14:00:00.000Z' },
    { id: 417, tenantId: 0, userId: 11, username: 'crodriguez',  actionType: 'COMPRA',             entity: 'purchases', entityId: 306, description: 'Compra registrada: 60x Huevo Marrón Extra x12 — Ovopro S.A.', previousData: null, newData: { quantity: 60, cost: 520 }, ipAddress: '192.168.1.11', createdAt: '2026-02-10T08:00:00.000Z' },
    { id: 418, tenantId: 0, userId: 10, username: 'mlopez',      actionType: 'PRODUCTO_ACTUALIZADO', entity: 'products', entityId: 2, description: 'Producto actualizado: Huevos Marrones x30',         previousData: { unitPrice: 1250 }, newData: { unitPrice: 1350 }, ipAddress: '192.168.1.10', createdAt: '2026-02-05T17:00:00.000Z' },
    { id: 419, tenantId: 0, userId: 11, username: 'crodriguez',  actionType: 'LOGOUT',             entity: 'users',    entityId: 11,  description: 'Cierre de sesión',                                 previousData: null, newData: null, ipAddress: '192.168.1.11', createdAt: '2026-02-01T18:00:00.000Z' },
    { id: 420, tenantId: 0, userId: 10, username: 'mlopez',      actionType: 'LOGOUT',             entity: 'users',    entityId: 10,  description: 'Cierre de sesión',                                 previousData: null, newData: null, ipAddress: '192.168.1.10', createdAt: '2026-02-01T18:30:00.000Z' },
  ],
};

module.exports = {
  products,
  dashboard,
  sales,
  expenses,
  metrics,
  monthlyBalance,
  purchasesPage,
  auditLogs,
};