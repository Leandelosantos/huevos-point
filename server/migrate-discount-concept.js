/**
 * Production migration script — safe to run multiple times (idempotent).
 *
 * Actions:
 *   1. Add discount_concept to sale_items (if missing)
 *   2. Remove orphan columns status / mp_preference_id from sales (if present)
 *
 * Usage:
 *   node migrate-discount-concept.js
 */
const sequelize = require('./src/config/database');

const run = async () => {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Connected.');

    // 1 — Add discount_concept to sale_items
    const [existing] = await sequelize.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'sale_items' AND column_name = 'discount_concept';
    `);

    if (existing.length === 0) {
      await sequelize.query(`
        ALTER TABLE sale_items ADD COLUMN discount_concept VARCHAR(120) DEFAULT NULL;
      `);
      console.log('[OK] discount_concept added to sale_items.');
    } else {
      console.log('[SKIP] discount_concept already exists in sale_items.');
    }

    // 2 — Remove orphan columns from sales
    const [orphans] = await sequelize.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'sales' AND column_name IN ('status', 'mp_preference_id');
    `);

    if (orphans.length > 0) {
      await sequelize.query('ALTER TABLE sales DROP COLUMN IF EXISTS status');
      await sequelize.query('ALTER TABLE sales DROP COLUMN IF EXISTS mp_preference_id');
      await sequelize.query('DROP TYPE IF EXISTS enum_sales_status');
      console.log('[OK] Removed orphan columns status / mp_preference_id from sales.');
    } else {
      console.log('[SKIP] No orphan columns in sales.');
    }

    console.log('Migration complete.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
};

run();
