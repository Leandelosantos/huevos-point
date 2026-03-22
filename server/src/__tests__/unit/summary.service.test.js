// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../models', () => ({
  Tenant:  { findAll: jest.fn() },
  User:    { findAll: jest.fn() },
  Sale:    { sum: jest.fn(), findAll: jest.fn() },
  SaleItem: {},
  Product:  {},
  Expense: { sum: jest.fn(), findAll: jest.fn() },
}));

jest.mock('../../config/database', () => ({
  query: jest.fn().mockResolvedValue([]),
  QueryTypes: { SELECT: 'SELECT' },
}));

jest.mock('../../modules/cron/email.template', () => ({
  buildSummaryEmail:      jest.fn().mockReturnValue('<html>summary</html>'),
  buildConsolidatedEmail: jest.fn().mockReturnValue('<html>consolidated</html>'),
}));

jest.mock('../../utils/mailer', () => ({
  sendMail: jest.fn().mockResolvedValue(undefined),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

const { Tenant, User, Sale, Expense } = require('../../models');
const sequelize = require('../../config/database');
const { sendMail } = require('../../utils/mailer');
const { buildSummaryEmail, buildConsolidatedEmail } = require('../../modules/cron/email.template');
const { sendDailySummary } = require('../../modules/cron/summary.service');

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockTenant = (overrides = {}) => ({
  id: 1,
  name: 'Sucursal Test',
  isActive: true,
  ...overrides,
});

const mockAdminUser = (overrides = {}) => ({
  id: 10,
  username: 'admin',
  email: 'admin@test.com',
  role: 'admin',
  isActive: true,
  ...overrides,
});

const mockSuperadminUser = (overrides = {}) => ({
  id: 99,
  username: 'superadmin',
  email: 'super@test.com',
  role: 'superadmin',
  isActive: true,
  ...overrides,
});

const setupEmptySaleDay = () => {
  Sale.sum.mockResolvedValue(null);
  Expense.sum.mockResolvedValue(null);
  Sale.findAll.mockResolvedValue([]);
  Expense.findAll.mockResolvedValue([]);
  sequelize.query.mockResolvedValue([]);
};

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => jest.clearAllMocks());

describe('sendDailySummary — envío a admins', () => {
  it('envía email al admin cuando el tenant tiene admins con email', async () => {
    Tenant.findAll.mockResolvedValue([mockTenant()]);
    setupEmptySaleDay();
    User.findAll
      .mockResolvedValueOnce([mockAdminUser()])   // getTenantAdminEmails
      .mockResolvedValueOnce([]);                 // getSuperadminEmails

    const results = await sendDailySummary('2026-03-21');

    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['admin@test.com'],
        subject: expect.stringContaining('Sucursal Test'),
      })
    );

    const adminResult = results.find((r) => r.role === 'admin');
    expect(adminResult?.status).toBe('sent');
    expect(adminResult?.recipients).toBe(1);
  });

  it('omite el tenant cuando no hay admins con email', async () => {
    Tenant.findAll.mockResolvedValue([mockTenant()]);
    setupEmptySaleDay();
    User.findAll
      .mockResolvedValueOnce([])  // getTenantAdminEmails → vacío
      .mockResolvedValueOnce([]); // getSuperadminEmails

    const results = await sendDailySummary('2026-03-21');

    const adminResult = results.find((r) => r.role === 'admin');
    expect(adminResult?.status).toBe('skipped');
    expect(adminResult?.reason).toBe('no admins with email');
  });

  it('deduplicar emails: no envía dos veces al mismo destinatario', async () => {
    Tenant.findAll.mockResolvedValue([mockTenant()]);
    setupEmptySaleDay();
    User.findAll
      .mockResolvedValueOnce([
        mockAdminUser({ id: 10, email: 'admin@test.com' }),
        mockAdminUser({ id: 11, email: 'admin@test.com' }), // mismo email
      ])
      .mockResolvedValueOnce([]);

    await sendDailySummary('2026-03-21');

    const adminCall = sendMail.mock.calls.find(() => true);
    expect(adminCall[0].to).toHaveLength(1);
    expect(adminCall[0].to[0]).toBe('admin@test.com');
  });
});

describe('sendDailySummary — envío a superadmins', () => {
  it('envía email consolidado a superadmins', async () => {
    Tenant.findAll.mockResolvedValue([mockTenant()]);
    setupEmptySaleDay();
    User.findAll
      .mockResolvedValueOnce([mockAdminUser()])
      .mockResolvedValueOnce([mockSuperadminUser()]);

    const results = await sendDailySummary('2026-03-21');

    expect(sendMail).toHaveBeenCalledTimes(2); // admin + superadmin
    const superResult = results.find((r) => r.role === 'superadmin');
    expect(superResult?.status).toBe('sent');
    expect(superResult?.recipients).toBe(1);
  });

  it('omite superadmin cuando no hay usuarios con email', async () => {
    Tenant.findAll.mockResolvedValue([mockTenant()]);
    setupEmptySaleDay();
    User.findAll
      .mockResolvedValueOnce([mockAdminUser()])
      .mockResolvedValueOnce([]); // sin superadmins

    const results = await sendDailySummary('2026-03-21');

    const superResult = results.find((r) => r.role === 'superadmin');
    expect(superResult?.status).toBe('skipped');
  });

  it('omite superadmin cuando no hay tenants con datos', async () => {
    Tenant.findAll.mockResolvedValue([]); // sin tenants activos
    User.findAll.mockResolvedValue([mockSuperadminUser()]);

    const results = await sendDailySummary('2026-03-21');

    const superResult = results.find((r) => r.role === 'superadmin');
    expect(superResult?.status).toBe('skipped');
  });

  it('email consolidado incluye datos de todos los tenants', async () => {
    Tenant.findAll.mockResolvedValue([mockTenant({ id: 1 }), mockTenant({ id: 2, name: 'Sucursal 2' })]);
    setupEmptySaleDay();
    Sale.sum.mockResolvedValue(null);
    Expense.sum.mockResolvedValue(null);

    User.findAll
      .mockResolvedValueOnce([])                  // admin tenant 1
      .mockResolvedValueOnce([])                  // admin tenant 2
      .mockResolvedValueOnce([mockSuperadminUser()]);

    await sendDailySummary('2026-03-21');

    expect(buildConsolidatedEmail).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ tenantName: 'Sucursal Test' }),
        expect.objectContaining({ tenantName: 'Sucursal 2' }),
      ]),
      '2026-03-21'
    );
  });
});

describe('sendDailySummary — resiliencia ante errores', () => {
  it('error en un tenant no interrumpe el procesamiento del resto', async () => {
    // Sucursal Error se procesa primero (id: 1), Sucursal OK segundo (id: 2)
    Tenant.findAll.mockResolvedValue([
      mockTenant({ id: 1, name: 'Sucursal Error' }),
      mockTenant({ id: 2, name: 'Sucursal OK' }),
    ]);

    // El primer tenant falla en la consulta de DB
    Sale.sum
      .mockRejectedValueOnce(new Error('DB timeout'))  // tenant 1 (Sucursal Error) falla
      .mockResolvedValueOnce(null);                    // tenant 2 (Sucursal OK) ok
    Expense.sum.mockResolvedValue(null);
    Sale.findAll.mockResolvedValue([]);
    Expense.findAll.mockResolvedValue([]);
    sequelize.query.mockResolvedValue([]);

    User.findAll.mockResolvedValue([]); // sin admins ni superadmins

    const results = await sendDailySummary('2026-03-21');

    const errorResult = results.find((r) => r.status === 'error');
    expect(errorResult).toBeDefined();
    expect(errorResult.tenant).toBe('Sucursal Error');
  });

  it('error de SMTP en un tenant no bloquea el siguiente', async () => {
    Tenant.findAll.mockResolvedValue([
      mockTenant({ id: 1, name: 'Sucursal 1' }),
      mockTenant({ id: 2, name: 'Sucursal 2' }),
    ]);
    setupEmptySaleDay();
    User.findAll
      .mockResolvedValueOnce([mockAdminUser({ email: 'a@test.com' })]) // tenant 1
      .mockResolvedValueOnce([mockAdminUser({ email: 'b@test.com' })]) // tenant 2
      .mockResolvedValueOnce([]); // superadmins

    sendMail
      .mockRejectedValueOnce(new Error('SMTP timeout'))  // falla en sucursal 1
      .mockResolvedValue(undefined);                     // ok en sucursal 2

    const results = await sendDailySummary('2026-03-21');

    const errorResult = results.find((r) => r.status === 'error' && r.role === 'admin');
    expect(errorResult?.tenant).toBe('Sucursal 1');

    const sentResult = results.find((r) => r.status === 'sent' && r.role === 'admin');
    expect(sentResult?.tenant).toBe('Sucursal 2');
  });
});

describe('sendDailySummary — asunto del email', () => {
  it('asunto del email contiene el nombre del tenant', async () => {
    Tenant.findAll.mockResolvedValue([mockTenant({ name: 'Huevos del Norte' })]);
    setupEmptySaleDay();
    User.findAll
      .mockResolvedValueOnce([mockAdminUser()])
      .mockResolvedValueOnce([]);

    await sendDailySummary('2026-03-21');

    const subject = sendMail.mock.calls[0][0].subject;
    expect(subject).toContain('Huevos del Norte');
  });

  it('asunto contiene el día de la semana en español', async () => {
    Tenant.findAll.mockResolvedValue([mockTenant()]);
    setupEmptySaleDay();
    User.findAll
      .mockResolvedValueOnce([mockAdminUser()])
      .mockResolvedValueOnce([]);

    // 2026-03-20 es viernes
    await sendDailySummary('2026-03-20');

    const subject = sendMail.mock.calls[0][0].subject;
    expect(subject.toLowerCase()).toContain('viernes');
  });
});

describe('sendDailySummary — cálculo de paymentTotals', () => {
  it('acumula totales por método de pago correctamente', async () => {
    Tenant.findAll.mockResolvedValue([mockTenant()]);
    Sale.sum.mockResolvedValue(3200);
    Expense.sum.mockResolvedValue(0);
    Sale.findAll.mockResolvedValue([
      { id: 1, totalAmount: '1500.00', paymentMethod: 'Efectivo', createdAt: new Date(), items: [] },
      { id: 2, totalAmount: '1200.00', paymentMethod: 'Tarjeta',  createdAt: new Date(), items: [] },
      { id: 3, totalAmount:  '500.00', paymentMethod: 'Efectivo', createdAt: new Date(), items: [] },
    ]);
    Expense.findAll.mockResolvedValue([]);
    sequelize.query.mockResolvedValue([]);
    User.findAll
      .mockResolvedValueOnce([mockAdminUser()])
      .mockResolvedValueOnce([]);

    await sendDailySummary('2026-03-21');

    // buildSummaryEmail recibe el data con paymentTotals calculado
    const dataArg = buildSummaryEmail.mock.calls[0][1];
    expect(dataArg.paymentTotals['Efectivo']).toBe(2000);
    expect(dataArg.paymentTotals['Tarjeta']).toBe(1200);
  });
});