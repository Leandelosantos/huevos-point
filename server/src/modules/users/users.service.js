const usersRepository = require('./users.repository');
const AppError = require('../../utils/AppError');

const getAllUsers = async () => {
  return usersRepository.findAll();
};

const getUserById = async (id) => {
  const user = await usersRepository.findById(id);
  if (!user) {
    throw new AppError('Usuario no encontrado', 404);
  }
  return user;
};

const createUser = async (userData) => {
  // Normalize empty email to null to avoid unique-constraint conflicts
  if (!userData.email) userData.email = null;

  const existingUsername = await usersRepository.findByUsername(userData.username);
  if (existingUsername) {
    throw new AppError('El nombre de usuario ya está en uso', 400);
  }

  if (userData.email) {
    const existingEmail = await usersRepository.findByEmail(userData.email);
    if (existingEmail) {
      throw new AppError('El correo electrónico ya está registrado', 400);
    }
  }

  // Si no es superadmin, DEBE tener al menos una sucursal asociada
  const tenantIds = userData.tenantIds || [];
  if (userData.role !== 'superadmin' && tenantIds.length === 0) {
    throw new AppError('Debe asignar al menos una sucursal al usuario', 400);
  }

  const user = await usersRepository.create(userData, tenantIds);
  return usersRepository.findById(user.id);
};

const updateUser = async (id, updateData) => {
  // Evitar modificar la contraseña directamente aquí si está vacía
  if (updateData.password === '') {
    delete updateData.password;
  }

  if (updateData.username) {
    const existingUsername = await usersRepository.findByUsername(updateData.username);
    if (existingUsername && existingUsername.id !== parseInt(id)) {
      throw new AppError('El nombre de usuario ya está en uso', 400);
    }
  }

  if (updateData.email) {
    const existingEmail = await usersRepository.findByEmail(updateData.email);
    if (existingEmail && existingEmail.id !== parseInt(id)) {
      throw new AppError('El correo electrónico ya está en uso', 400);
    }
  }

  const tenantIds = updateData.tenantIds || [];
  if (updateData.role !== 'superadmin' && tenantIds.length === 0 && updateData.role) {
     throw new AppError('Debe asignar al menos una sucursal al usuario', 400);
  }

  const updatedUser = await usersRepository.update(id, updateData, tenantIds);
  if (!updatedUser) {
    throw new AppError('Usuario no encontrado', 404);
  }

  return usersRepository.findById(updatedUser.id);
};

const deactivateUser = async (id) => {
  const user = await usersRepository.deactivate(id);
  if (!user) {
    throw new AppError('Usuario no encontrado', 404);
  }
  return true;
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deactivateUser,
};
