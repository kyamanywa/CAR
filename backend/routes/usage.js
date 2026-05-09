const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getUsageStats, PLAN_LIMITS } = require('../middleware/usageLimits');

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

// Get available plans
router.get('/plans', async (req, res) => {
  try {
    const plans = Object.entries(PLAN_LIMITS).map(([key, value]) => ({
      id: key,
      name: key.charAt(0).toUpperCase() + key.slice(1),
      ...value
    }));

    res.json({ data: plans });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
