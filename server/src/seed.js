const { Tenant, User, Product } = require('./models');

const seedDatabase = async () => {
  try {
    // Seed Tenants
    const tenantRoosevelt = await Tenant.findOrCreate({
      where: { name: 'Sucursal Roosevelt' },
      defaults: { name: 'Sucursal Roosevelt', isActive: true },
    });
    const tenantAmenabar = await Tenant.findOrCreate({
      where: { name: 'Sucursal Amenabar' },
      defaults: { name: 'Sucursal Amenabar', isActive: true },
    });

    const defaultTenantId = tenantRoosevelt[0].id;

    // Seed admin user if none exists
    const adminExists = await User.findOne({ where: { username: 'admin' } });
    if (!adminExists) {
      await User.create({
        username: 'admin',
        password: 'admin123',
        fullName: 'Administrador',
        role: 'admin',
        tenantId: defaultTenantId,
      });
      console.log('✅ Usuario admin creado (admin / admin123)');
    }

    // Seed employee user if none exists
    const employeeExists = await User.findOne({ where: { username: 'empleado' } });
    if (!employeeExists) {
      await User.create({
        username: 'empleado',
        password: 'empleado123',
        fullName: 'Empleado Demo',
        role: 'employee',
        tenantId: defaultTenantId,
      });
      console.log('✅ Usuario empleado creado (empleado / empleado123)');
    }

    // Seed sample products if none exist
    const productCount = await Product.count();
    if (productCount === 0) {
      const sampleProducts = [
        { name: 'Maple de Huevos x30', stockQuantity: 50, unitPrice: 5500.00, tenantId: defaultTenantId },
        { name: 'Huevos Sueltos x12', stockQuantity: 100, unitPrice: 2200.00, tenantId: defaultTenantId },
        { name: 'Huevos de Campo x12', stockQuantity: 30, unitPrice: 3500.00, tenantId: defaultTenantId },
        { name: 'Huevos Blancos x30', stockQuantity: 40, unitPrice: 6000.00, tenantId: defaultTenantId },
        { name: 'Maple de Huevos x15', stockQuantity: 60, unitPrice: 3000.00, tenantId: defaultTenantId },
      ];

      await Product.bulkCreate(sampleProducts);
      console.log('✅ Productos de ejemplo creados');
    }

    console.log('✅ Seed completado');
  } catch (error) {
    console.error('❌ Error en seed:', error.message);
  }
};

module.exports = seedDatabase;
