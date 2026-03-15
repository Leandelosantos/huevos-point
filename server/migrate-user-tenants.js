const sequelize = require('./src/config/database');

async function migrateUserTenants() {
  try {
    console.log('Iniciando migración para Múltiples Sucursales (M:N)...');
    await sequelize.authenticate();

    // 1. Crear tabla pivot user_tenants
    console.log('1. Creando tabla intermedia "user_tenants"...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "user_tenants" (
        "user_id" INTEGER NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "tenant_id" INTEGER NOT NULL REFERENCES "tenants" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        PRIMARY KEY ("user_id", "tenant_id")
      );
    `);

    // 2. Poblar tabla pivot con los datos históricos de users.tenant_id
    console.log('2. Copiando sucursales históricas a la nueva tabla...');
    await sequelize.query(`
      INSERT INTO "user_tenants" ("user_id", "tenant_id")
      SELECT id, tenant_id FROM "users" 
      WHERE tenant_id IS NOT NULL
      ON CONFLICT DO NOTHING;
    `);

    // Note: We leave the tenant_id column in users for now to prevent breaking existing code
    // before the full backend refactor is complete. It can be dropped later if completely unused.
    console.log('Nota: el campo tenant_id en users se conservará por ahora pero su uso principal pasará a user_tenants.');

    console.log('Migración completada con éxito.');
  } catch (error) {
    console.error('Error durante la migración M:N:', error);
  } finally {
    await sequelize.close();
  }
}

migrateUserTenants();
