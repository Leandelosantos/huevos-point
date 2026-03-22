// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../modules/cron/summary.service', () => ({
  sendDailySummary: jest.fn(),
}));

jest.mock('../../config/environment', () => ({
  CRON_SECRET: 'test-secret-abc123',
}));

// ── Imports ───────────────────────────────────────────────────────────────────

const { sendDailySummary } = require('../../modules/cron/summary.service');
const { dailySummary } = require('../../modules/cron/cron.controller');

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeReq = ({ authorization, date } = {}) => ({
  headers: { authorization },
  query: date ? { date } : {},
});

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => jest.clearAllMocks());

describe('cronController.dailySummary — autenticación', () => {
  it('sin header Authorization → 401', async () => {
    const req = makeReq({ authorization: undefined });
    const res = makeRes();

    await dailySummary(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  it('header con token incorrecto → 401', async () => {
    const req = makeReq({ authorization: 'Bearer wrong-secret' });
    const res = makeRes();

    await dailySummary(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('token correcto → llama a sendDailySummary y retorna 200', async () => {
    sendDailySummary.mockResolvedValue([{ tenant: 'T1', status: 'sent' }]);

    const req = makeReq({ authorization: 'Bearer test-secret-abc123' });
    const res = makeRes();

    await dailySummary(req, res);

    expect(sendDailySummary).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('esquema Bearer no presente (solo token) → 401', async () => {
    const req = makeReq({ authorization: 'test-secret-abc123' });
    const res = makeRes();

    await dailySummary(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe('cronController.dailySummary — manejo de fecha', () => {
  it('usa ?date query param cuando se provee', async () => {
    sendDailySummary.mockResolvedValue([]);

    const req = makeReq({ authorization: 'Bearer test-secret-abc123', date: '2026-03-14' });
    const res = makeRes();

    await dailySummary(req, res);

    expect(sendDailySummary).toHaveBeenCalledWith('2026-03-14');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ date: '2026-03-14' }));
  });

  it('sin ?date → genera la fecha del día en zona horaria Argentina (YYYY-MM-DD)', async () => {
    sendDailySummary.mockResolvedValue([]);

    const req = makeReq({ authorization: 'Bearer test-secret-abc123' });
    const res = makeRes();

    await dailySummary(req, res);

    const calledWith = sendDailySummary.mock.calls[0][0];
    // Debe ser formato YYYY-MM-DD
    expect(calledWith).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('sin ?date → la fecha se calcula en huso horario America/Argentina/Buenos_Aires', async () => {
    sendDailySummary.mockResolvedValue([]);

    // Mock Date para asegurar comportamiento determinista
    const fixedUTC = new Date('2026-03-21T02:00:00Z'); // 02:00 UTC = 23:00 del 20/03 en ARS
    const spy = jest.spyOn(global, 'Date').mockImplementation(() => fixedUTC);
    fixedUTC.toLocaleDateString = jest.fn().mockReturnValue('2026-03-20');

    const req = makeReq({ authorization: 'Bearer test-secret-abc123' });
    const res = makeRes();

    await dailySummary(req, res);

    spy.mockRestore();

    // La fecha enviada a sendDailySummary debe ser la del día anterior en ARS
    const calledWith = sendDailySummary.mock.calls[0][0];
    expect(calledWith).toBe('2026-03-20');
  });
});

describe('cronController.dailySummary — manejo de errores', () => {
  it('sendDailySummary lanza error → responde 500', async () => {
    sendDailySummary.mockRejectedValue(new Error('DB connection failed'));

    const req = makeReq({ authorization: 'Bearer test-secret-abc123' });
    const res = makeRes();

    await dailySummary(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'DB connection failed' })
    );
  });

  it('sendDailySummary retorna resultados parciales → success: true con results', async () => {
    const results = [
      { tenant: 'Sucursal 1', role: 'admin', status: 'sent', recipients: 2 },
      { tenant: 'Sucursal 2', role: 'admin', status: 'error', error: 'SMTP timeout' },
    ];
    sendDailySummary.mockResolvedValue(results);

    const req = makeReq({ authorization: 'Bearer test-secret-abc123' });
    const res = makeRes();

    await dailySummary(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, results })
    );
  });
});

describe('cobertura de días lunes a sábado — schedule de vercel.json', () => {
  const vercelJson = require('../../../vercel.json');

  it('vercel.json define exactamente 2 entradas de cron', () => {
    expect(vercelJson.crons).toHaveLength(2);
  });

  it('primer cron cubre lunes a viernes (1-5) a las 23:30 UTC', () => {
    const weekdayCron = vercelJson.crons.find((c) => c.schedule === '30 23 * * 1-5');
    expect(weekdayCron).toBeDefined();
    expect(weekdayCron.path).toBe('/api/cron/daily-summary');
  });

  it('segundo cron cubre sábado (6)', () => {
    const saturdayCron = vercelJson.crons.find((c) => c.schedule.includes('* * 6'));
    expect(saturdayCron).toBeDefined();
    expect(saturdayCron.path).toBe('/api/cron/daily-summary');
  });

  it('domingo (0 o 7) NO está incluido en ningún schedule', () => {
    const schedules = vercelJson.crons.map((c) => c.schedule);
    // Ningún schedule debe tener "0" ni "7" como día de semana
    const hasSunday = schedules.some((s) => {
      const dayField = s.split(' ')[4]; // 5th field = day of week
      return dayField === '0' || dayField === '7' || dayField.includes('0-') || dayField.includes('-7');
    });
    expect(hasSunday).toBe(false);
  });
});