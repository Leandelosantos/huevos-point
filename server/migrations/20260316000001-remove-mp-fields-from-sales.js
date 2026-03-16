'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn('sales', 'status');
    await queryInterface.removeColumn('sales', 'mp_preference_id');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('sales', 'status', {
      type: Sequelize.ENUM('PENDING', 'COMPLETED', 'CANCELLED'),
      allowNull: false,
      defaultValue: 'COMPLETED',
    });
    await queryInterface.addColumn('sales', 'mp_preference_id', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },
};
