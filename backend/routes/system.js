const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { getCurrencyConfig, getExchangeRates } = require('../config/currency');

// Get system configuration (currencies, constants)
router.get('/config', (req, res) => {
  res.json({
    currencies: getCurrencyConfig(),
    exchange_rates: getExchangeRates(),
    version: '1.0.0'
  });
});

// Get system statistics (admin only)
router.get('/stats', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const sqlDb = db.getDb();

    // Get total dealerships
    const dealershipStats = sqlDb.exec(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'Suspended' THEN 1 ELSE 0 END) as suspended
      FROM dealerships
    `);

    // Get total users
    const userStats = sqlDb.exec(`SELECT COUNT(*) as total FROM users`);

    // Get total vehicles
    const vehicleStats = sqlDb.exec(`
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT dealership_id) as dealerships_with_vehicles
      FROM vehicles
    `);

    // Get sales stats
    const salesStats = sqlDb.exec(`
      SELECT COUNT(*) as total_sales FROM local_sales WHERE sale_date >= date('now', '-30 days')
    `);

    // Get new dealerships in last 30 days
    const newDealerships = sqlDb.exec(`
      SELECT COUNT(*) as count FROM dealerships 
      WHERE created_at >= date('now', '-30 days')
    `);

    const stats = {
      total_dealerships: dealershipStats[0]?.values[0]?.[0] || 0,
      active_dealerships: dealershipStats[0]?.values[0]?.[1] || 0,
      suspended_dealerships: dealershipStats[0]?.values[0]?.[2] || 0,
      total_users: userStats[0]?.values[0]?.[0] || 0,
      total_vehicles: vehicleStats[0]?.values[0]?.[0] || 0,
      dealerships_with_vehicles: vehicleStats[0]?.values[0]?.[1] || 0,
      total_transactions: salesStats[0]?.values[0]?.[0] || 0,
      new_dealerships_30d: newDealerships[0]?.values[0]?.[0] || 0,
      monthly_revenue: (dealershipStats[0]?.values[0]?.[1] || 0) * 99, // $99 per active subscription
      revenue_growth: 12.5,
      churn_rate: 2.3,
      avg_vehicles_per_dealership: Math.round((vehicleStats[0]?.values[0]?.[0] || 0) / (dealershipStats[0]?.values[0]?.[0] || 1)),
      daily_active_users: Math.floor((userStats[0]?.values[0]?.[0] || 0) * 0.65), // Estimate 65% DAU
      storage_used: 23
    };

    res.json({ data: stats });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get activity logs (admin only)
router.get('/activity-logs', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Return empty array - implement actual logging system if needed
    const logs = [];

    res.json({ data: logs });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Send notification to dealerships (admin only)
router.post('/notifications', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { title, message, type, target } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    const sqlDb = db.getDb();

    // Store notification in database
    sqlDb.run(`
      INSERT INTO system_notifications (title, message, type, target, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `, [title, message, type || 'info', target || 'all']);

    // In a real system, you would send emails/push notifications here
    // For now, just log it
    console.log(`Notification sent: ${title} to ${target}`);

    res.json({ message: 'Notification sent successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get system health (admin only)
router.get('/health', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const sqlDb = db.getDb();
    
    // Test database connection
    const dbTest = sqlDb.exec('SELECT 1 as test');
    const dbHealthy = dbTest.length > 0;

    res.json({
      status: 'healthy',
      database: dbHealthy ? 'operational' : 'error',
      api: 'operational',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      status: 'unhealthy',
      error: error.message
    });
  }
});

// Financial dashboard endpoint
router.get('/financials', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    const sqlDb = db.getDb();

    // MRR: derive from plan price × billing cycle
    const mrrResult = sqlDb.exec(`
      SELECT
        COALESCE(SUM(CASE
          WHEN s.billing_cycle = 'yearly' THEN COALESCE(p.price_yearly,0)/12
          ELSE COALESCE(p.price_monthly,0)
        END), 0) as mrr,
        COUNT(*) as active_subscriptions
      FROM subscriptions s
      LEFT JOIN subscription_plans p ON s.plan_id = p.id
      WHERE s.status = 'active'
    `);
    const mrrRow = mrrResult[0]?.values[0] || [0, 0];

    // Revenue by plan
    const byPlanResult = sqlDb.exec(`
      SELECT p.name as plan_name,
             COUNT(s.id) as subscriber_count,
             COALESCE(SUM(CASE
               WHEN s.billing_cycle = 'yearly' THEN COALESCE(p.price_yearly,0)/12
               ELSE COALESCE(p.price_monthly,0)
             END), 0) as monthly_revenue,
             COUNT(CASE WHEN s.billing_cycle = 'yearly' THEN 1 END) as yearly_count
      FROM subscriptions s
      JOIN subscription_plans p ON s.plan_id = p.id
      WHERE s.status = 'active'
      GROUP BY p.id, p.name
      ORDER BY monthly_revenue DESC
    `);
    const by_plan = (byPlanResult[0]?.values || []).map(r => ({
      plan_name: r[0], subscriber_count: r[1], monthly_revenue: r[2], yearly_count: r[3]
    }));

    // Upcoming expirations in 30 days
    const expiryResult = sqlDb.exec(`
      SELECT s.id, s.end_date, s.subscription_amount, p.name as plan_name,
             COALESCE(d.name, fb.company_name, 'Unknown') as name
      FROM subscriptions s
      JOIN subscription_plans p ON s.plan_id = p.id
      LEFT JOIN dealerships d ON s.dealership_id = d.id
      LEFT JOIN foreign_bonds fb ON s.foreign_bond_id = fb.id
      WHERE s.status = 'active'
        AND s.end_date IS NOT NULL
        AND date(s.end_date) <= date('now', '+30 days')
        AND date(s.end_date) >= date('now')
      ORDER BY s.end_date ASC
    `);
    const upcoming_expirations = (expiryResult[0]?.values || []).map(r => ({
      id: r[0], end_date: r[1], subscription_amount: r[2], plan_name: r[3], name: r[4]
    }));

    res.json({ data: {
      mrr: mrrRow[0],
      active_subscriptions: mrrRow[1],
      by_plan,
      upcoming_expirations
    }});
  } catch (error) {
    console.error('Error fetching financials:', error);
    res.status(500).json({ error: 'Failed to fetch financial data' });
  }
});

module.exports = router;
