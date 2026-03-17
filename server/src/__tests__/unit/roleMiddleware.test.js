const { requireRole } = require('../../middlewares/roleMiddleware');

// ── Helpers ───────────────────────────────────────────────────────────────────

const mockReq = (role) => ({
  user: role ? { id: 1, role } : undefined,
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('requireRole', () => {
  describe('superadmin', () => {
    it('siempre pasa independientemente del rol requerido', () => {
      const next = jest.fn();
      requireRole('admin')(mockReq('superadmin'), {}, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('pasa incluso con requireRole("employee")', () => {
      const next = jest.fn();
      requireRole('employee')(mockReq('superadmin'), {}, next);
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('admin', () => {
    it('pasa con requireRole("admin")', () => {
      const next = jest.fn();
      requireRole('admin')(mockReq('admin'), {}, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('bloqueado con requireRole("employee") → next(AppError 403)', () => {
      const next = jest.fn();
      requireRole('employee')(mockReq('admin'), {}, next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
    });
  });

  describe('employee', () => {
    it('pasa con requireRole("employee")', () => {
      const next = jest.fn();
      requireRole('employee')(mockReq('employee'), {}, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('bloqueado con requireRole("admin") → next(AppError 403)', () => {
      const next = jest.fn();
      requireRole('admin')(mockReq('employee'), {}, next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
    });
  });

  describe('múltiples roles permitidos', () => {
    it('admin pasa con requireRole("admin", "manager")', () => {
      const next = jest.fn();
      requireRole('admin', 'manager')(mockReq('admin'), {}, next);
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('sin usuario autenticado', () => {
    it('req.user undefined → next(AppError 401)', () => {
      const next = jest.fn();
      requireRole('admin')(mockReq(null), {}, next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
    });
  });
});
