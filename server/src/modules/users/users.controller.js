const usersService = require('./users.service');

const getAll = async (req, res, next) => {
  try {
    const users = await usersService.getAllUsers();
    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const user = await usersService.getUserById(req.params.id);
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const user = await usersService.createUser(req.body);
    res.status(201).json({ success: true, data: user, message: 'Usuario creado exitosamente' });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const user = await usersService.updateUser(req.params.id, req.body);
    res.json({ success: true, data: user, message: 'Usuario actualizado exitosamente' });
  } catch (error) {
    next(error);
  }
};

const deactivate = async (req, res, next) => {
  try {
    await usersService.deactivateUser(req.params.id);
    res.json({ success: true, message: 'Usuario desactivado exitosamente' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  deactivate,
};
