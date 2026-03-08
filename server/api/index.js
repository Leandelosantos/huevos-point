// Force Vercel's bundler to include the pg driver (Sequelize loads it dynamically)
require('pg');

const app = require('../src/app');

// Temporary route to sync the production database schema
app.get('/api/sync-db', async (req, res) => {
  try {
    const sequelize = require('../src/config/database');
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    res.status(200).json({ success: true, message: 'Production database synchronized successfully' });
  } catch (error) {
    console.error('DB Sync Error:', error);
    res.status(500).json({ success: false, error: error.message, stack: error.stack });
  }
});

// Wrap the app to catch unhandled errors that cause Vercel 500 crashes
module.exports = async (req, res) => {
  try {
    return await app(req, res);
  } catch (error) {
    console.error('CRITICAL VERCEL CRASH:', error, error.stack);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Critical Serverless Crash', error: error.message, stack: error.stack });
    }
  }
};
