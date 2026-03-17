const { sendDailySummary } = require('./summary.service');
const env = require('../../config/environment');

/**
 * POST /api/cron/daily-summary
 *
 * Called by Vercel Cron Jobs (or manually for testing).
 * Protected by CRON_SECRET — Vercel sets Authorization: Bearer <CRON_SECRET> automatically.
 */
const dailySummary = async (req, res) => {
  // Validate cron secret
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!env.CRON_SECRET || token !== env.CRON_SECRET) {
    return res.status(401).json({ success: false, message: 'No autorizado' });
  }

  // Allow overriding date via query param for testing: ?date=2026-03-16
  const date =
    req.query.date ||
    new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });

  try {
    console.log(`[cron] Starting daily summary for date: ${date}`);
    const results = await sendDailySummary(date);
    console.log('[cron] Daily summary done:', JSON.stringify(results));
    return res.json({ success: true, date, results });
  } catch (error) {
    console.error('[cron] Unexpected error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { dailySummary };
