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

    // Add payment_splits to sales if missing
    const [paymentSplitsCol] = await sequelize.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'sales' AND column_name = 'payment_splits'
    `);
    if (paymentSplitsCol.length === 0) {
      await sequelize.query(`ALTER TABLE sales ADD COLUMN payment_splits TEXT DEFAULT NULL`);
      console.log('[migration] payment_splits added to sales');
    }

    // api_keys + api_key_usage tables for the public read-only API
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id SERIAL PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        key_prefix VARCHAR(12) NOT NULL,
        key_hash VARCHAR(255) NOT NULL UNIQUE,
        business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
        tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
        scopes TEXT[] NOT NULL DEFAULT ARRAY['read:all']::TEXT[],
        is_active BOOLEAN NOT NULL DEFAULT true,
        rate_limit_per_min INTEGER NOT NULL DEFAULT 60,
        last_used_at TIMESTAMPTZ,
        expires_at TIMESTAMPTZ,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT api_keys_scope_check CHECK (business_id IS NOT NULL OR tenant_id IS NOT NULL)
      )
    `);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS api_keys_key_hash_idx ON api_keys (key_hash)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS api_keys_business_idx ON api_keys (business_id) WHERE is_active = true`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS api_keys_tenant_idx ON api_keys (tenant_id) WHERE is_active = true`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS api_keys_prefix_idx ON api_keys (key_prefix)`);
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS api_key_usage (
        id BIGSERIAL PRIMARY KEY,
        api_key_id INTEGER NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
        endpoint VARCHAR(200) NOT NULL,
        method VARCHAR(10) NOT NULL,
        status_code INTEGER NOT NULL,
        ip_address INET,
        response_time_ms INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS api_key_usage_key_created_idx ON api_key_usage (api_key_id, created_at DESC)`);
    console.log('[migration] api_keys + api_key_usage ensured');

    // Performance indexes — composite indexes for multi-tenant filtered queries
    await sequelize.query(`CREATE INDEX IF NOT EXISTS sales_tenant_date_idx ON sales (tenant_id, sale_date)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS expenses_tenant_date_idx ON expenses (tenant_id, expense_date)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS sale_items_sale_id_idx ON sale_items (sale_id)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS sale_items_product_id_idx ON sale_items (product_id)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS audit_logs_tenant_created_idx ON audit_logs (tenant_id, created_at DESC)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS products_tenant_active_idx ON products (tenant_id, is_active)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS purchases_tenant_date_idx ON purchases (tenant_id, purchase_date)`);
    // Composite index for dashboard/metrics join: sale_items → products
    await sequelize.query(`CREATE INDEX IF NOT EXISTS sale_items_product_sale_idx ON sale_items (product_id, sale_id)`);
    // FK indexes for egg category lookups
    await sequelize.query(`CREATE INDEX IF NOT EXISTS purchases_category_id_idx ON purchases (category_id)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS products_category_id_idx ON products (category_id)`);
    console.log('[migration] performance indexes ensured');

    // ── Equivalencias huevos: egg_categories + alteraciones products/purchases ──
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS egg_categories (
        id SERIAL PRIMARY KEY,
        tenant_id INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name VARCHAR(50) NOT NULL,
        stock_units DECIMAL(12,2) NOT NULL DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS egg_categories_tenant_idx ON egg_categories (tenant_id, is_active)`);
    // Drop any legacy global unique constraints (named constraints via ALTER TABLE)
    const [constraints] = await sequelize.query(`
      SELECT constraint_name FROM information_schema.table_constraints
      WHERE table_name = 'egg_categories' AND constraint_type = 'UNIQUE'
    `);
    for (const { constraint_name } of constraints) {
      if (constraint_name !== 'egg_categories_pkey') {
        await sequelize.query(`ALTER TABLE egg_categories DROP CONSTRAINT IF EXISTS "${constraint_name}"`);
      }
    }
    // Drop any legacy global unique indexes (direct CREATE UNIQUE INDEX — not found via table_constraints)
    await sequelize.query(`DROP INDEX IF EXISTS egg_categories_name_key`);
    await sequelize.query(`DROP INDEX IF EXISTS egg_categories_name_key1`);
    await sequelize.query(`DROP INDEX IF EXISTS egg_categories_tenant_id_name_key`);
    await sequelize.query(`DROP INDEX IF EXISTS egg_categories_tenant_name_unique`);
    // Create partial unique index (only active rows). Allows recreating a category with the same name after deletion.
    await sequelize.query(`CREATE UNIQUE INDEX IF NOT EXISTS egg_categories_active_name_uidx ON egg_categories(tenant_id, name) WHERE is_active = true`);
    // Hard-delete orphaned inactive categories (left over from old soft-delete logic)
    await sequelize.query(`DELETE FROM egg_categories WHERE is_active = false`);
    console.log('[migration] egg_categories partial unique index ensured');

    const [eggsCrateCol] = await sequelize.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'egg_categories' AND column_name = 'eggs_per_crate'
    `);
    if (eggsCrateCol.length === 0) {
      await sequelize.query(`ALTER TABLE egg_categories ADD COLUMN eggs_per_crate INT NOT NULL DEFAULT 360`);
      console.log('[migration] eggs_per_crate added to egg_categories');
    }

    // Products: drop ALL legacy unique constraints on name (global or per-tenant)
    // These constraints block bulkCreate of presentations when recreating a deleted category
    await sequelize.query(`ALTER TABLE products DROP CONSTRAINT IF EXISTS product_tenant_name_unique`);
    await sequelize.query(`ALTER TABLE products DROP CONSTRAINT IF EXISTS products_tenant_id_name_key`);
    await sequelize.query(`ALTER TABLE products DROP CONSTRAINT IF EXISTS products_name_key`);
    await sequelize.query(`ALTER TABLE products DROP CONSTRAINT IF EXISTS products_name_key1`);
    await sequelize.query(`DROP INDEX IF EXISTS products_name_key`);
    await sequelize.query(`DROP INDEX IF EXISTS products_name_key1`);
    // Create correct partial unique index: only active rows, scoped by tenant
    await sequelize.query(`CREATE UNIQUE INDEX IF NOT EXISTS products_active_name_uidx ON products(tenant_id, name) WHERE is_active = true`);
    // Hard-delete orphaned inactive egg_categories
    await sequelize.query(`DELETE FROM egg_categories WHERE is_active = false`);

    // Add category_id and units_per_presentation to products
    const [catCol] = await sequelize.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'products' AND column_name = 'category_id'
    `);
    if (catCol.length === 0) {
      await sequelize.query(`ALTER TABLE products ADD COLUMN category_id INT REFERENCES egg_categories(id)`);
      await sequelize.query(`ALTER TABLE products ADD COLUMN units_per_presentation INT DEFAULT 1`);
      console.log('[migration] category_id + units_per_presentation added to products');
    }
    // Hard-delete orphaned inactive presentations — column guaranteed to exist at this point
    await sequelize.query(`DELETE FROM products WHERE is_active = false AND units_per_presentation > 1`);
    console.log('[migration] products & egg_categories partial unique indexes ensured');

    // Add category_id to purchases, make product_id nullable, quantity to DECIMAL
    const [purCatCol] = await sequelize.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'purchases' AND column_name = 'category_id'
    `);
    if (purCatCol.length === 0) {
      await sequelize.query(`ALTER TABLE purchases ADD COLUMN category_id INT REFERENCES egg_categories(id)`);
      console.log('[migration] category_id added to purchases');
    }
    // Make product_id nullable (for new category-based purchases)
    await sequelize.query(`ALTER TABLE purchases ALTER COLUMN product_id DROP NOT NULL`);
    // Make price and margin_amount nullable (new purchases don't set selling price)
    await sequelize.query(`ALTER TABLE purchases ALTER COLUMN price DROP NOT NULL`);
    await sequelize.query(`ALTER TABLE purchases ALTER COLUMN margin_amount DROP NOT NULL`);
    // Change quantity to DECIMAL for fractional cajones (0.5, 1.5)
    await sequelize.query(`ALTER TABLE purchases ALTER COLUMN quantity TYPE DECIMAL(10,2)`);
    console.log('[migration] egg equivalences schema ensured');

    // ── Promo x2 maples: agregar presentación a categorías existentes ────────
    await sequelize.query(`
      INSERT INTO products (tenant_id, name, category_id, units_per_presentation, unit_price, stock_quantity, is_active, created_at, updated_at)
      SELECT
        c.tenant_id,
        'Promo x2 maples ' || c.name,
        c.id,
        ROUND(c.eggs_per_crate::numeric / 12) * 2,
        0,
        0,
        true,
        now(),
        now()
      FROM egg_categories c
      WHERE c.is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM products p
          WHERE p.category_id = c.id
            AND p.name = 'Promo x2 maples ' || c.name
            AND p.is_active = true
        )
    `);
    console.log('[migration] promo x2 maples presentations ensured');

    // ── Fase 3: Suscripciones + Onboarding ──────────────────────────────────
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        display_name VARCHAR(100) NOT NULL,
        description TEXT,
        price_monthly DECIMAL(12,2) NOT NULL,
        price_yearly DECIMAL(12,2) NOT NULL,
        max_branches INT NOT NULL DEFAULT 1,
        max_users INT NOT NULL DEFAULT 3,
        features JSONB NOT NULL DEFAULT '{}',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    await sequelize.query(`
      INSERT INTO subscription_plans (name, display_name, description, price_monthly, price_yearly, max_branches, max_users, features, created_at, updated_at)
      VALUES
        ('basico', 'Plan Básico', 'Gestión esencial para distribuidoras pequeñas', 15000, 135000, 1, 3,
         '{"ventas":true,"egresos":true,"stock":true,"compras_basico":true,"dashboard":true,"email_diario":true,"clientes":false,"auditoria":false,"exportacion_excel":false,"mp_point":false,"metricas_avanzadas":false,"descuentos_item":false}'::jsonb, now(), now()),
        ('profesional', 'Plan Profesional', 'Control total para distribuidoras en crecimiento', 35000, 315000, 5, -1,
         '{"ventas":true,"egresos":true,"stock":true,"compras_basico":true,"compras_avanzado":true,"dashboard":true,"email_diario":true,"clientes":true,"auditoria":true,"exportacion_excel":true,"mp_point":true,"metricas_avanzadas":true,"descuentos_item":true}'::jsonb, now(), now()),
        ('personalizado', 'Plan Personalizado', 'Todo lo del Plan Profesional + desarrollo a medida', 0, 0, -1, -1,
         '{"ventas":true,"egresos":true,"stock":true,"compras_basico":true,"compras_avanzado":true,"dashboard":true,"email_diario":true,"clientes":true,"auditoria":true,"exportacion_excel":true,"mp_point":true,"metricas_avanzadas":true,"descuentos_item":true,"desarrollo_a_medida":true}'::jsonb, now(), now())
      ON CONFLICT DO NOTHING
    `);
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        tenant_id INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        plan_id INT NOT NULL REFERENCES subscription_plans(id),
        billing_cycle VARCHAR(10) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        payment_provider VARCHAR(20) NOT NULL,
        mobbex_subscription_uid VARCHAR(255),
        mobbex_subscriber_uid VARCHAR(255),
        mp_preapproval_id VARCHAR(255),
        mp_payer_email VARCHAR(255),
        current_period_start TIMESTAMPTZ,
        current_period_end TIMESTAMPTZ,
        trial_ends_at TIMESTAMPTZ,
        cancelled_at TIMESTAMPTZ,
        suspended_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS subscription_payments (
        id SERIAL PRIMARY KEY,
        subscription_id INT NOT NULL REFERENCES subscriptions(id),
        tenant_id INT NOT NULL REFERENCES tenants(id),
        amount DECIMAL(12,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'ARS',
        status VARCHAR(20) NOT NULL,
        payment_provider VARCHAR(20) NOT NULL,
        external_payment_id VARCHAR(255),
        provider_status VARCHAR(50),
        provider_detail VARCHAR(100),
        payment_date TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS onboarding_registrations (
        id SERIAL PRIMARY KEY,
        business_name VARCHAR(200) NOT NULL,
        business_type VARCHAR(100),
        contact_name VARCHAR(200) NOT NULL,
        contact_email VARCHAR(255) NOT NULL UNIQUE,
        contact_phone VARCHAR(50),
        plan_id INT REFERENCES subscription_plans(id),
        billing_cycle VARCHAR(10),
        payment_provider VARCHAR(20),
        status VARCHAR(20) DEFAULT 'pending',
        tenant_id INT REFERENCES tenants(id),
        user_id INT,
        subscription_id INT REFERENCES subscriptions(id),
        temp_password_hash VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT now(),
        completed_at TIMESTAMPTZ
      )
    `);
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS contact_requests (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        business_name VARCHAR(200),
        message TEXT NOT NULL,
        plan_id INT REFERENCES subscription_plans(id),
        status VARCHAR(20) DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    console.log('[migration] Fase 3: subscription_plans + subscriptions + payments + onboarding ensured');
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
