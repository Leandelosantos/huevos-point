const app = require('./app');
const sequelize = require('./config/database');
const env = require('./config/environment');
const seedDatabase = require('./seed');

// Import models to register them with Sequelize
require('./models');

const runMigrations = async () => {
  // Add discount_concept to sale_items if missing (idempotent)
  const [existing] = await sequelize.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'sale_items' AND column_name = 'discount_concept'
  `);
  if (existing.length === 0) {
    await sequelize.query(`ALTER TABLE sale_items ADD COLUMN discount_concept VARCHAR(120) DEFAULT NULL`);
    console.log('✅ Migración aplicada: discount_concept en sale_items');
  }

  // Remove orphan columns status / mp_preference_id from sales if still present
  const [orphans] = await sequelize.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name IN ('status', 'mp_preference_id')
  `);
  if (orphans.length > 0) {
    await sequelize.query('ALTER TABLE sales DROP COLUMN IF EXISTS status');
    await sequelize.query('ALTER TABLE sales DROP COLUMN IF EXISTS mp_preference_id');
    await sequelize.query('DROP TYPE IF EXISTS enum_sales_status');
    console.log('✅ Migración aplicada: columnas status/mp_preference_id eliminadas de sales');
  }
};

const startServer = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos exitosa');

    // Run pending schema migrations (works in any environment)
    await runMigrations();

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
