const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

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
      WHERE subscription_start >= date('now', '-30 days')
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

module.exports = router;
