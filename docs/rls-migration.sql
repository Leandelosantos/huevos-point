-- ============================================================
-- RLS MIGRATION — Huevos Point
-- Generado: 2026-05-14
-- ¡NO ejecutar en producción sin backup previo!
-- Ejecutar en Supabase SQL Editor (o psql)
-- ============================================================
--
-- MECANISMO:
--   El backend llama SET LOCAL app.tenant_id = '<id>' y
--   SET LOCAL app.role = '<role>' dentro de una transacción
--   al inicio de cada request (ver rls.middleware.js).
--   Las políticas leen esas variables con current_setting().
--
-- IMPORTANTE — Supabase:
--   El rol 'postgres' (service role) tiene SUPERUSER y
--   bypassea RLS por defecto. Usamos FORCE ROW LEVEL SECURITY
--   en cada tabla para que incluso ese rol sea alcanzado.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. FUNCIONES HELPER
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION app_tenant_id() RETURNS INTEGER AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '')::INTEGER;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION app_role() RETURNS TEXT AS $$
  SELECT COALESCE(NULLIF(current_setting('app.role', true), ''), 'employee');
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_superadmin() RETURNS BOOLEAN AS $$
  SELECT current_setting('app.role', true) = 'superadmin';
$$ LANGUAGE SQL STABLE SECURITY DEFINER;


-- ────────────────────────────────────────────────────────────
-- 2. TABLAS CON tenant_id — Aislamiento estándar
-- ────────────────────────────────────────────────────────────

-- ── tenants ──────────────────────────────────────────────────
-- Tabla raíz. Superadmin ve todo; tenant solo ve su fila.
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenants_isolation ON tenants;
CREATE POLICY tenants_isolation ON tenants
  FOR ALL
  USING (
    is_superadmin()
    OR id = app_tenant_id()
  );


-- ── users ────────────────────────────────────────────────────
-- tenant_id nullable: superadmins tienen tenant_id = NULL.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_isolation ON users;
CREATE POLICY users_isolation ON users
  FOR ALL
  USING (
    is_superadmin()
    OR tenant_id = app_tenant_id()
    OR tenant_id IS NULL  -- superadmin rows no quedan huérfanas
  );

-- Nota: si un admin solo debe ver su tenant, la condición
-- `tenant_id IS NULL` puede removerse. Ajustar según decisión.


-- ── user_tenants (tabla pivot) ────────────────────────────────
ALTER TABLE user_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tenants FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_tenants_isolation ON user_tenants;
CREATE POLICY user_tenants_isolation ON user_tenants
  FOR ALL
  USING (
    is_superadmin()
    OR tenant_id = app_tenant_id()
  );


-- ── products ─────────────────────────────────────────────────
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE products FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS products_isolation ON products;
CREATE POLICY products_isolation ON products
  FOR ALL
  USING (
    is_superadmin()
    OR tenant_id = app_tenant_id()
  );


-- ── sales ────────────────────────────────────────────────────
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sales_isolation ON sales;
CREATE POLICY sales_isolation ON sales
  FOR ALL
  USING (
    is_superadmin()
    OR tenant_id = app_tenant_id()
  );


-- ── sale_items ───────────────────────────────────────────────
-- Sin tenant_id propio — acceso via JOIN a sales.
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sale_items_isolation ON sale_items;
CREATE POLICY sale_items_isolation ON sale_items
  FOR ALL
  USING (
    is_superadmin()
    OR EXISTS (
      SELECT 1 FROM sales s
      WHERE s.id = sale_items.sale_id
        AND s.tenant_id = app_tenant_id()
    )
  );


-- ── expenses ─────────────────────────────────────────────────
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS expenses_isolation ON expenses;
CREATE POLICY expenses_isolation ON expenses
  FOR ALL
  USING (
    is_superadmin()
    OR tenant_id = app_tenant_id()
  );


-- ── purchases ────────────────────────────────────────────────
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS purchases_isolation ON purchases;
CREATE POLICY purchases_isolation ON purchases
  FOR ALL
  USING (
    is_superadmin()
    OR tenant_id = app_tenant_id()
  );


-- ── audit_logs ───────────────────────────────────────────────
-- tenant_id nullable (logs de superadmin no tienen tenant).
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_logs_isolation ON audit_logs;
CREATE POLICY audit_logs_isolation ON audit_logs
  FOR ALL
  USING (
    is_superadmin()
    OR tenant_id = app_tenant_id()
  );


-- ── egg_categories ───────────────────────────────────────────
ALTER TABLE egg_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE egg_categories FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS egg_categories_isolation ON egg_categories;
CREATE POLICY egg_categories_isolation ON egg_categories
  FOR ALL
  USING (
    is_superadmin()
    OR tenant_id = app_tenant_id()
  );


-- ── subscriptions ────────────────────────────────────────────
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subscriptions_isolation ON subscriptions;
CREATE POLICY subscriptions_isolation ON subscriptions
  FOR ALL
  USING (
    is_superadmin()
    OR tenant_id = app_tenant_id()
  );


-- ── subscription_payments ────────────────────────────────────
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_payments FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subscription_payments_isolation ON subscription_payments;
CREATE POLICY subscription_payments_isolation ON subscription_payments
  FOR ALL
  USING (
    is_superadmin()
    OR tenant_id = app_tenant_id()
  );


-- ── onboarding_registrations ─────────────────────────────────
-- tenant_id nullable (puede registrarse antes de tener tenant).
ALTER TABLE onboarding_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_registrations FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS onboarding_registrations_isolation ON onboarding_registrations;
CREATE POLICY onboarding_registrations_isolation ON onboarding_registrations
  FOR ALL
  USING (
    is_superadmin()
    OR tenant_id = app_tenant_id()
    OR tenant_id IS NULL  -- registros pre-onboarding sin tenant aún
  );


-- ── api_keys ─────────────────────────────────────────────────
-- Puede ser scoped por tenant_id o por businessId (nullable).
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS api_keys_isolation ON api_keys;
CREATE POLICY api_keys_isolation ON api_keys
  FOR ALL
  USING (
    is_superadmin()
    OR tenant_id = app_tenant_id()
    -- business-scoped keys: el tenant debe pertenecer al business
    OR (
      tenant_id IS NULL
      AND business_id IN (
        SELECT t.business_id FROM tenants t WHERE t.id = app_tenant_id()
      )
    )
  );


-- ── mp_incoming_payments ─────────────────────────────────────
ALTER TABLE mp_incoming_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mp_incoming_payments FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mp_incoming_payments_isolation ON mp_incoming_payments;
CREATE POLICY mp_incoming_payments_isolation ON mp_incoming_payments
  FOR ALL
  USING (
    is_superadmin()
    OR tenant_id = app_tenant_id()
  );


-- ────────────────────────────────────────────────────────────
-- 3. TABLAS GLOBALES (sin tenant_id)
-- ────────────────────────────────────────────────────────────

-- ── subscription_plans ───────────────────────────────────────
-- Catálogo global. Todos pueden leer; solo superadmin escribe.
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subscription_plans_read ON subscription_plans;
CREATE POLICY subscription_plans_read ON subscription_plans
  FOR SELECT
  USING (true);  -- lectura pública (catálogo)

DROP POLICY IF EXISTS subscription_plans_write ON subscription_plans;
CREATE POLICY subscription_plans_write ON subscription_plans
  FOR ALL
  USING (is_superadmin());


-- ── contact_requests ─────────────────────────────────────────
-- Formulario de contacto. INSERT público; SELECT solo superadmin.
ALTER TABLE contact_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_requests FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS contact_requests_insert ON contact_requests;
CREATE POLICY contact_requests_insert ON contact_requests
  FOR INSERT
  WITH CHECK (true);  -- cualquier llamada puede insertar (form público)

DROP POLICY IF EXISTS contact_requests_select ON contact_requests;
CREATE POLICY contact_requests_select ON contact_requests
  FOR SELECT
  USING (is_superadmin());


-- ── superadmin_audit_log ─────────────────────────────────────
-- Solo superadmin accede.
ALTER TABLE superadmin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE superadmin_audit_log FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS superadmin_audit_log_isolation ON superadmin_audit_log;
CREATE POLICY superadmin_audit_log_isolation ON superadmin_audit_log
  FOR ALL
  USING (is_superadmin());


-- ────────────────────────────────────────────────────────────
-- 4. VERIFICACIÓN
-- ────────────────────────────────────────────────────────────
-- Correr para confirmar que todas las tablas tienen RLS activo:
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled,
  forcerowsecurity AS rls_forced
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'tenants','users','user_tenants','products','sales','sale_items',
    'expenses','purchases','audit_logs','egg_categories','subscriptions',
    'subscription_payments','onboarding_registrations','api_keys',
    'mp_incoming_payments','subscription_plans','contact_requests',
    'superadmin_audit_log'
  )
ORDER BY tablename;

-- Correr para ver todas las políticas creadas:
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
