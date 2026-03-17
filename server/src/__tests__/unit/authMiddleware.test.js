const jwt = require('jsonwebtoken');

// authMiddleware exporta [jwtVerify, tenantMiddleware]
// Testeamos jwtVerify (índice 0) como unidad independiente

// Mock tenantMiddleware para evitar queries a DB
jest.mock('../../middlewares/tenantMiddleware', () => (req, _res, next) => {
  req.tenantId = 1;
  next();
});

const authMiddleware = require('../../middlewares/authMiddleware');
const jwtVerify = authMiddleware[0]; // solo el verificador JWT

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeToken = (payload = {}, expiresIn = '1h') =>
  jwt.sign({ id: 1, username: 'user', role: 'admin', ...payload }, 'test-secret-jest-only', { expiresIn });

const mockReq = (token) => ({
  headers: token ? { authorization: `Bearer ${token}` } : {},
});

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('authMiddleware (jwtVerify)', () => {
  describe('token válido', () => {
    it('llama next() y puebla req.user', () => {
      const next = jest.fn();
      const token = makeToken({ id: 5, role: 'admin' });

      jwtVerify(mockReq(token), mockRes(), next);

      expect(next).toHaveBeenCalledWith();
      expect(next.mock.calls[0][0]).toBeUndefined(); // sin error
    });

    it('req.user contiene los datos del payload', () => {
      let capturedReq;
      const next = jest.fn().mockImplementation(function() {
        capturedReq = this;
      });
      const req = mockReq(makeToken({ id: 7, role: 'employee' }));

      jwtVerify(req, mockRes(), next);

      expect(req.user).toMatchObject({ id: 7, role: 'employee' });
    });
  });

  describe('sin token', () => {
    it('sin header Authorization → next(AppError 401)', () => {
      const next = jest.fn();

      jwtVerify(mockReq(null), mockRes(), next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
    });

    it('header sin "Bearer " → next(AppError 401)', () => {
      const next = jest.fn();
      const req = { headers: { authorization: 'token-sin-bearer' } };

      jwtVerify(req, mockRes(), next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
    });
  });

  describe('token inválido', () => {
    it('token con firma incorrecta → next(AppError 401)', () => {
      const next = jest.fn();
      const token = jwt.sign({ id: 1 }, 'otra-clave-secreta');

      jwtVerify(mockReq(token), mockRes(), next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
    });

    it('token expirado → next(AppError 401)', () => {
      const next = jest.fn();
      const token = makeToken({}, '-1s'); // expirado hace 1 segundo

      jwtVerify(mockReq(token), mockRes(), next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
    });

    it('token malformado → next(AppError 401)', () => {
      const next = jest.fn();

      jwtVerify(mockReq('esto.no.es.un.jwt.valido'), mockRes(), next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
    });
  });
});
