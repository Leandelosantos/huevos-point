// Force Vercel's bundler to include the pg driver (Sequelize loads it dynamically)
require('pg');

const app = require('../src/app');
const sequelize = require('../src/config/database');

// Run schema migrations on cold start (idempotent, safe to run on every deploy)
const migrationPromise = (async () => {
  try {
    const [existing] = await sequelize.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'sale_items' AND column_name = 'discount_concept'
    `);
    if (existing.length === 0) {
      await sequelize.query(`ALTER TABLE sale_items ADD COLUMN discount_concept VARCHAR(120) DEFAULT NULL`);
      console.log('[migration] discount_concept added to sale_items');
    }

    const [orphans] = await sequelize.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'sales' AND column_name IN ('status', 'mp_preference_id')
    `);
    if (orphans.length > 0) {
      await sequelize.query('ALTER TABLE sales DROP COLUMN IF EXISTS status');
      await sequelize.query('ALTER TABLE sales DROP COLUMN IF EXISTS mp_preference_id');
      await sequelize.query('DROP TYPE IF EXISTS enum_sales_status');
      console.log('[migration] orphan columns removed from sales');
    }

    // Add created_at / updated_at to user_tenants if missing (Sequelize always inserts them)
    const [utCols] = await sequelize.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'user_tenants' AND column_name IN ('created_at', 'updated_at')
    `);
    const utColNames = utCols.map((r) => r.column_name);
    if (!utColNames.includes('created_at')) {
      await sequelize.query(`ALTER TABLE user_tenants ADD COLUMN created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()`);
      console.log('[migration] created_at added to user_tenants');
    }
    if (!utColNames.includes('updated_at')) {
      await sequelize.query(`ALTER TABLE user_tenants ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()`);
      console.log('[migration] updated_at added to user_tenants');
    }
  } catch (e) {
    console.error('[migration error]', e.message);
  }
})();

// Handler: wait for migrations on the first cold-start request, then pass through
let ready = false;
const handler = async (req, res) => {
  if (!ready) {
    await migrationPromise;
    ready = true;
  }
  return app(req, res);
};

module.exports = handler;
