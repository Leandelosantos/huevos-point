const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../config/database');

const SALT_ROUNDS = 10;

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: 'user_tenant_username_unique',
  },
  tenantId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'tenant_id',
    references: { model: 'tenants', key: 'id' },
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    unique: 'user_email_unique',
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  fullName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'full_name',
  },
  role: {
    type: DataTypes.ENUM('superadmin', 'admin', 'employee'),
    allowNull: false,
    defaultValue: 'employee',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active',
  },
}, {
  tableName: 'users',
  updatedAt: false,
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, SALT_ROUNDS);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, SALT_ROUNDS);
      }
    },
  },
});

User.prototype.validatePassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

User.prototype.toSafeJSON = function () {
  const { password, ...safeUser } = this.toJSON();
  return safeUser;
};

module.exports = User;
