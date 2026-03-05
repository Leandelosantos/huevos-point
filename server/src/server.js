const app = require('./app');
const sequelize = require('./config/database');
const env = require('./config/environment');
const seedDatabase = require('./seed');

// Import models to register them with Sequelize
require('./models');

const startServer = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos exitosa');

    // Sync models (creates tables if they don't exist)
    await sequelize.sync({ alter: env.NODE_ENV === 'development' });
    console.log('✅ Modelos sincronizados');

    // Run seed
    await seedDatabase();

    // Start HTTP server
    app.listen(env.PORT, () => {
      console.log(`🥚 Huevos Point API corriendo en http://localhost:${env.PORT}`);
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error.message);
    process.exit(1);
  }
};

startServer();
