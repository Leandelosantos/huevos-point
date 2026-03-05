const { Sequelize } = require('sequelize');
const env = require('./environment');

const isProduction = env.NODE_ENV === 'production';

const sequelizeOptions = {
  dialect: 'postgres',
  dialectOptions: {
    ssl: isProduction ? {
      require: true,
      rejectUnauthorized: false,
    } : false,
  },
  logging: isProduction ? false : console.log,
  define: {
    underscored: true,
    timestamps: true,
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
};

// Support DATABASE_URL (used by Vercel/cloud environments) or individual vars
const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, sequelizeOptions)
  : new Sequelize(env.DB_NAME, env.DB_USER, env.DB_PASSWORD, {
      host: env.DB_HOST,
      port: env.DB_PORT,
      ...sequelizeOptions,
    });

module.exports = sequelize;
