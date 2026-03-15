const authService = require('./auth.service');
const { createAuditLog } = require('../../utils/auditLogger');

const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const result = await authService.login(username, password);

    await createAuditLog({
      tenantId: req.tenantId || null,
      userId: result.user.id,
      username: result.user.username,
      actionType: 'LOGIN',
      description: `Usuario ${result.user.username} inició sesión`,
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      data: result,
      message: 'Sesión iniciada correctamente',
    });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    await createAuditLog({
      tenantId: req.tenantId || null,
      userId: req.user.id,
      username: req.user.username,
      actionType: 'LOGOUT',
      description: `Usuario ${req.user.username} cerró sesión`,
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: 'Sesión cerrada correctamente',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { login, logout };
