// Force Vercel's bundler to include the pg driver (Sequelize loads it dynamically)
require('pg');

const app = require('../src/app');

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
