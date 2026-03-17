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

    // Add receipt columns to purchases if missing
    const [receiptCol] = await sequelize.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'purchases' AND column_name = 'receipt_data'
    `);
    if (receiptCol.length === 0) {
      await sequelize.query(`ALTER TABLE purchases ADD COLUMN receipt_data TEXT DEFAULT NULL`);
      await sequelize.query(`ALTER TABLE purchases ADD COLUMN receipt_mime_type VARCHAR(50) DEFAULT NULL`);
      console.log('[migration] receipt_data and receipt_mime_type added to purchases');
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

    // Performance indexes — composite indexes for multi-tenant filtered queries
    await sequelize.query(`CREATE INDEX IF NOT EXISTS sales_tenant_date_idx ON sales (tenant_id, sale_date)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS expenses_tenant_date_idx ON expenses (tenant_id, expense_date)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS sale_items_sale_id_idx ON sale_items (sale_id)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS sale_items_product_id_idx ON sale_items (product_id)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS audit_logs_tenant_created_idx ON audit_logs (tenant_id, created_at DESC)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS products_tenant_active_idx ON products (tenant_id, is_active)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS purchases_tenant_date_idx ON purchases (tenant_id, purchase_date)`);
    console.log('[migration] performance indexes ensured');
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
