const sequelize = require('./src/config/database');
const bcrypt = require('bcryptjs');

async function migrateSuperAdmin() {
  try {
    console.log('Iniciando migración para Super Administrador...');
    await sequelize.authenticate();

    // 1. Agregar columna email a users si no existe
    const [emailColumn] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='users' and column_name='email';
    `);
    
    if (emailColumn.length === 0) {
      console.log('Agregando columna "email" a "users"...');
      await sequelize.query(`ALTER TABLE "users" ADD COLUMN "email" VARCHAR(255);`);
      await sequelize.query(`ALTER TABLE "users" ADD CONSTRAINT "user_email_unique" UNIQUE ("email");`);
    }

    // 2. Hacer tenant_id nullable en users
    console.log('Relajando restricción de tenant_id en "users"...');
    await sequelize.query(`ALTER TABLE "users" ALTER COLUMN "tenant_id" DROP NOT NULL;`);

    // 3. Extender ENUM de roles para soportar 'superadmin'
    // Postgres requiere sintaxis especial para alterar ENUM
    const [enumCheck] = await sequelize.query(`
      SELECT enumlabel 
      FROM pg_enum 
      JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
      WHERE pg_type.typname = 'enum_users_role' AND enumlabel = 'superadmin';
    `);

    if (enumCheck.length === 0) {
      console.log('Añadiendo "superadmin" al ENUM de roles...');
      await sequelize.query(`ALTER TYPE "enum_users_role" ADD VALUE 'superadmin';`);
    }

    // 4. Crear o actualizar el usuario Súper Administrador
    console.log('Configurando perfil maestro: leanSuper...');
    const superAdminPassword = await bcrypt.hash('37007484Lean', 10);
    
    const [existingSuper] = await sequelize.query(`
      SELECT id FROM "users" WHERE username = 'leanSuper';
    `);

    if (existingSuper.length === 0) {
      await sequelize.query(`
        INSERT INTO "users" (username, password, full_name, role, tenant_id, is_active, email, created_at)
        VALUES (
          'leanSuper', 
          '${superAdminPassword}', 
          'Lean Super Admin', 
          'superadmin', 
          NULL, 
          true, 
          'lean@huevospoint.com',
          NOW()
        );
      `);
      console.log('Usuario leanSuper insertado exitosamente.');
    } else {
      await sequelize.query(`
        UPDATE "users" 
        SET password = '${superAdminPassword}', 
            role = 'superadmin', 
            tenant_id = NULL,
            email = 'lean@huevospoint.com'
        WHERE username = 'leanSuper';
      `);
      console.log('Usuario leanSuper actualizado exitosamente.');
    }

    console.log('Migración completada con éxito.');
  } catch (error) {
    console.error('Error durante la migración:', error);
  } finally {
    await sequelize.close();
  }
}

migrateSuperAdmin();
