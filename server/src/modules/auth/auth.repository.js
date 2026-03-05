const { User } = require('../../models');

const findByUsername = async (username) => {
  return User.findOne({ where: { username, isActive: true } });
};

const findById = async (id) => {
  return User.findByPk(id, { attributes: { exclude: ['password'] } });
};

module.exports = { findByUsername, findById };
