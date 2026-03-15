const sequelize = require('./src/config/database');
const { Tenant, User, Product, Sale, Expense } = require('./src/models');

const migrateTenants = async () => {
  try {
    console.log('🚀 Iniciando migración a Multitenant...');

    // 1. Sync the Tenant model to create the table
    await Tenant.sync({ alter: true });
    console.log('✅ Tabla tenants creada o verificada.');

    // 2. Create the default tenant (Roosevelt)
    const [defaultTenant] = await Tenant.findOrCreate({
      where: { name: 'Sucursal Roosevelt' },
      defaults: { name: 'Sucursal Roosevelt', isActive: true },
    });
    
    // Also create Amenabar
    await Tenant.findOrCreate({
      where: { name: 'Sucursal Amenabar' },
      defaults: { name: 'Sucursal Amenabar', isActive: true },
    });
    console.log(`✅ Inquilinos iniciales creados. Default ID: ${defaultTenant.id}`);

    // 3. Add column to existing tables allowing null temporarily (via raw queries to be safe)
    const tables = ['users', 'products', 'sales', 'expenses'];
    
    for (const table of tables) {
      console.log(`⏳ Procesando tabla: ${table}...`);
      
      // Check if column exists
      const [results] = await sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='${table}' AND column_name='tenant_id';
      `);
      
      if (results.length === 0) {
        // Add column allowing NULL first
        await sequelize.query(`ALTER TABLE ${table} ADD COLUMN tenant_id INTEGER REFERENCES tenants(id);`);
        console.log(`  - Columna tenant_id agregada a ${table}.`);
        
        // Update existing records to the default tenant
        await sequelize.query(`UPDATE ${table} SET tenant_id = ${defaultTenant.id} WHERE tenant_id IS NULL;`);
        console.log(`  - Registros en ${table} actualizados al tenant por defecto.`);
        
        // Alter column to NOT NULL
        await sequelize.query(`ALTER TABLE ${table} ALTER COLUMN tenant_id SET NOT NULL;`);
        console.log(`  - Restricción NOT NULL aplicada en ${table}.`);
      } else {
        console.log(`  - La tabla ${table} ya tiene la columna tenant_id.`);
      }
    }

    console.log('🎉 Migración completada exitosamente.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    process.exit(1);
  }
};

migrateTenants();
