const jwt = require('jsonwebtoken');
const env = require('../../config/environment');
const authRepository = require('./auth.repository');
const AppError = require('../../utils/AppError');

const login = async (username, password) => {
  const user = await authRepository.findByUsername(username);

  if (!user) {
    throw new AppError('Credenciales incorrectas', 401);
  }

  const isValidPassword = await user.validatePassword(password);

  if (!isValidPassword) {
    throw new AppError('Credenciales incorrectas', 401);
  }

  const payload = {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
  };

  const token = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });

  return { token, user: payload };
};

module.exports = { login };
