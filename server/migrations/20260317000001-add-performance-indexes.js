'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // sales: dashboard diario y metrics mensual filtran por (tenant_id, sale_date)
    await queryInterface.addIndex('sales', ['tenant_id', 'sale_date'], {
      name: 'sales_tenant_date_idx',
    });

    // expenses: mismo patrón que sales
    await queryInterface.addIndex('expenses', ['tenant_id', 'expense_date'], {
      name: 'expenses_tenant_date_idx',
    });

    // sale_items: JOIN frecuente desde sales para cargar detalle de movimientos
    await queryInterface.addIndex('sale_items', ['sale_id'], {
      name: 'sale_items_sale_id_idx',
    });

    await queryInterface.addIndex('sale_items', ['product_id'], {
      name: 'sale_items_product_id_idx',
    });

    // audit_logs: paginación por tenant ordenada por fecha desc
    await queryInterface.addIndex('audit_logs', ['tenant_id', 'created_at'], {
      name: 'audit_logs_tenant_created_idx',
    });

    // products: filtro de stock activo por tenant (StockPage, SaleModal dropdown)
    await queryInterface.addIndex('products', ['tenant_id', 'is_active'], {
      name: 'products_tenant_active_idx',
    });

    // purchases: historial por tenant ordenado por fecha
    await queryInterface.addIndex('purchases', ['tenant_id', 'purchase_date'], {
      name: 'purchases_tenant_date_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('sales', 'sales_tenant_date_idx');
    await queryInterface.removeIndex('expenses', 'expenses_tenant_date_idx');
    await queryInterface.removeIndex('sale_items', 'sale_items_sale_id_idx');
    await queryInterface.removeIndex('sale_items', 'sale_items_product_id_idx');
    await queryInterface.removeIndex('audit_logs', 'audit_logs_tenant_created_idx');
    await queryInterface.removeIndex('products', 'products_tenant_active_idx');
    await queryInterface.removeIndex('purchases', 'purchases_tenant_date_idx');
  },
};
