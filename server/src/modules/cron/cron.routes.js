const { Router } = require('express');
const { dailySummary } = require('./cron.controller');

const router = Router();

// No auth middleware — the controller validates CRON_SECRET directly,
// which is how Vercel Cron Jobs authenticate.
router.get('/daily-summary', dailySummary);

module.exports = router;
