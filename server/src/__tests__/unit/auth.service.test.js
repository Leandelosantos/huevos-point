const jwt = require('jsonwebtoken');

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../modules/auth/auth.repository', () => ({
  findByUsername: jest.fn(),
  findAllTenants: jest.fn(),
}));

// ── Imports ──────────────────────────────────────────────────────────────────

const authRepository = require('../../modules/auth/auth.repository');
const authService = require('../../modules/auth/auth.service');

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockUser = (overrides = {}) => ({
  id: 1,
  username: 'admin',
  fullName: 'Admin User',
  role: 'admin',
  tenants: [{ id: 1, name: 'Sucursal 1' }],
  validatePassword: jest.fn().mockResolvedValue(true),
  ...overrides,
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('authService.login', () => {
  describe('credenciales válidas', () => {
    it('retorna { token, user } con datos correctos', async () => {
      authRepository.findByUsername.mockResolvedValue(mockUser());

      const result = await authService.login('admin', 'password123');

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('user');
      expect(result.user.username).toBe('admin');
      expect(result.user.role).toBe('admin');
    });

    it('el token contiene id, username, role y tenants', async () => {
      authRepository.findByUsername.mockResolvedValue(mockUser());

      const { token } = await authService.login('admin', 'password123');

      const decoded = jwt.decode(token);
      expect(decoded).toMatchObject({
        id: 1,
        username: 'admin',
        role: 'admin',
      });
      expect(decoded.tenants).toBeDefined();
    });

    it('superadmin obtiene todos los tenants', async () => {
      const superadmin = mockUser({ role: 'superadmin' });
      authRepository.findByUsername.mockResolvedValue(superadmin);
      authRepository.findAllTenants.mockResolvedValue([
        { id: 1, name: 'Sucursal 1' },
        { id: 2, name: 'Sucursal 2' },
      ]);

      const result = await authService.login('superadmin', 'password123');

      expect(authRepository.findAllTenants).toHaveBeenCalled();
      expect(result.user.tenants).toHaveLength(2);
    });
  });

  describe('credenciales inválidas', () => {
    it('usuario no encontrado → lanza AppError 401', async () => {
      authRepository.findByUsername.mockResolvedValue(null);

      await expect(authService.login('nobody', 'pass'))
        .rejects.toMatchObject({ statusCode: 401 });
    });

    it('password incorrecta → lanza AppError 401', async () => {
      const user = mockUser({ validatePassword: jest.fn().mockResolvedValue(false) });
      authRepository.findByUsername.mockResolvedValue(user);

      await expect(authService.login('admin', 'wrongpass'))
        .rejects.toMatchObject({ statusCode: 401 });
    });

    it('usuario no encontrado y password incorrecta devuelven el mismo error (no enumeration)', async () => {
      authRepository.findByUsername.mockResolvedValue(null);
      const errorNotFound = await authService.login('nobody', 'pass').catch(e => e);

      const user = mockUser({ validatePassword: jest.fn().mockResolvedValue(false) });
      authRepository.findByUsername.mockResolvedValue(user);
      const errorWrongPass = await authService.login('admin', 'wrongpass').catch(e => e);

      expect(errorNotFound.message).toBe(errorWrongPass.message);
    });
  });
});
