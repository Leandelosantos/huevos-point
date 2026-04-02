'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // 1. New columns on tenants
    await queryInterface.sequelize.query(`
      ALTER TABLE tenants
        ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'active',
        ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
    `);

    // 2. New columns on sales
    await queryInterface.sequelize.query(`
      ALTER TABLE sales
        ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual',
        ADD COLUMN IF NOT EXISTS is_auto_registered BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS mp_payment_id BIGINT;
    `);

    // 3. New column on sale_items
    await queryInterface.sequelize.query(`
      ALTER TABLE sale_items
        ADD COLUMN IF NOT EXISTS description TEXT;
    `);

    // 4. subscription_plans
    await queryInterface.sequelize.query(`
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
      );
    `);

    // 5. subscriptions
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        tenant_id INT NOT NULL REFERENCES tenants(id),
        plan_id INT NOT NULL REFERENCES subscription_plans(id),
        billing_cycle VARCHAR(10) NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        payment_provider VARCHAR(20) NOT NULL CHECK (payment_provider IN ('mobbex', 'mercadopago')),
        mobbex_subscription_uid VARCHAR(255),
        mobbex_subscriber_uid VARCHAR(255),
        mp_preapproval_id VARCHAR(255),
        mp_payer_email VARCHAR(255),
        current_period_start TIMESTAMPTZ,
        current_period_end TIMESTAMPTZ,
        cancelled_at TIMESTAMPTZ,
        suspended_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
    `);

    // 6. subscription_payments
    await queryInterface.sequelize.query(`
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
      );
    `);

    // 7. superadmin_audit_log
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS superadmin_audit_log (
        id SERIAL PRIMARY KEY,
        admin_user_id INT NOT NULL,
        action TEXT NOT NULL,
        target_tenant INT REFERENCES tenants(id),
        details JSONB DEFAULT '{}',
        ip_address INET,
        created_at TIMESTAMPTZ DEFAULT now()
      );
    `);

    // 8. mp_incoming_payments
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS mp_incoming_payments (
        id SERIAL PRIMARY KEY,
        tenant_id INT NOT NULL REFERENCES tenants(id),
        branch_id INT REFERENCES tenants(id),
        mp_payment_id BIGINT NOT NULL UNIQUE,
        mp_status VARCHAR(50) NOT NULL,
        mp_payment_type VARCHAR(50),
        mp_payment_method VARCHAR(50),
        mp_source VARCHAR(50),
        amount DECIMAL(12,2) NOT NULL,
        net_amount DECIMAL(12,2),
        currency VARCHAR(3) DEFAULT 'ARS',
        sale_id INT REFERENCES sales(id),
        external_reference VARCHAR(255),
        payer_email VARCHAR(255),
        payer_identification VARCHAR(50),
        description TEXT,
        mp_date_approved TIMESTAMPTZ,
        raw_data JSONB,
        processed BOOLEAN DEFAULT false,
        processing_error TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      );
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS mp_incoming_payments;');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS superadmin_audit_log;');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS subscription_payments;');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS subscriptions;');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS subscription_plans;');
    await queryInterface.sequelize.query(`
      ALTER TABLE sale_items DROP COLUMN IF EXISTS description;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE sales
        DROP COLUMN IF EXISTS source,
        DROP COLUMN IF EXISTS is_auto_registered,
        DROP COLUMN IF EXISTS mp_payment_id;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE tenants
        DROP COLUMN IF EXISTS subscription_status,
        DROP COLUMN IF EXISTS slug;
    `);
  },
};