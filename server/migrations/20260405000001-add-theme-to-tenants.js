'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE tenants
        ADD COLUMN IF NOT EXISTS theme VARCHAR(30) DEFAULT 'verde-bosque';
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE tenants DROP COLUMN IF EXISTS theme;
    `);
  },
};
