const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const db = require('../db');
const { getUsageStats } = require('../middleware/usageLimits');

// Get usage statistics for current dealership
router.get('/stats', auth, async (req, res) => {
  try {
    if (!req.bondId) {
      return res.status(403).json({ error: 'Only available for dealership users' });
    }

    const stats = await getUsageStats(req.bondId);
    
    if (!stats) {
      return res.status(500).json({ error: 'Failed to fetch usage stats' });
    }

    res.json({ data: stats });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get available plans (from DB)
router.get('/plans', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM subscription_plans WHERE status = 'active' ORDER BY price_monthly ASC`
    );
    res.json({ data: result.rows });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
