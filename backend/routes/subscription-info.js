const express = require('express');
const router = express.Router();
const db = require('../db');

// Get current subscription and usage
router.get('/my-subscription', async (req, res) => {
  try {
    const organizationId = req.user.foreign_bond_id || req.user.dealership_id;
    const subscriberType = req.user.foreign_bond_id ? 'supplier' : 'dealership';
    const organizationField = req.user.foreign_bond_id ? 'foreign_bond_id' : 'dealership_id';
    
    // Get subscription
    const subResult = await db.query(
      `SELECT s.*, p.name as plan_name, p.price_monthly, p.price_yearly, 
              p.max_vehicles, p.max_users, p.max_orders_per_month, p.features
       FROM subscriptions s
       JOIN subscription_plans p ON s.plan_id = p.id
       WHERE s.subscriber_id = $1 AND s.subscriber_type = $2 
         AND s.status IN ('active', 'trial', 'past_due')
       ORDER BY s.id DESC LIMIT 1`,
      [organizationId, subscriberType]
    );
    
    let subscription = null;
    let usage = {
      vehicles: 0,
      users: 0,
      orders_this_month: 0
    };
    
    if (subResult.rows.length > 0) {
      subscription = subResult.rows[0];
      
      // Get current usage
      const vehicleCount = await db.query(
        `SELECT COUNT(*) as count FROM vehicles WHERE ${organizationField} = $1`,
        [organizationId]
      );
      
      const userCount = await db.query(
        `SELECT COUNT(*) as count FROM users WHERE ${organizationField} = $1 AND is_active = 1`,
        [organizationId]
      );
      
      // Orders this month (for suppliers: orders FROM buyers; for dealerships: orders TO suppliers)
      const firstDayOfMonth = new Date();
      firstDayOfMonth.setDate(1);
      firstDayOfMonth.setHours(0, 0, 0, 0);
      
      const orderCount = await db.query(
        `SELECT COUNT(*) as count FROM import_orders 
         WHERE ${organizationField} = $1 
           AND created_at >= $2`,
        [organizationId, firstDayOfMonth.toISOString()]
      );
      
      usage = {
        vehicles: vehicleCount.rows[0].count,
        users: userCount.rows[0].count,
        orders_this_month: orderCount.rows[0].count
      };
      
      // Parse features if it's a string
      if (subscription.features && typeof subscription.features === 'string') {
        try {
          subscription.features = JSON.parse(subscription.features);
        } catch (e) {
          subscription.features = [];
        }
      }
    } else {
      // No subscription found - return free tier info
      subscription = {
        status: 'none',
        plan_name: 'No Subscription',
        message: 'Subscribe to unlock full features',
        max_vehicles: 5,
        max_users: 1,
        max_orders_per_month: 10
      };
      
      // Still calculate usage
      const vehicleCount = await db.query(
        `SELECT COUNT(*) as count FROM vehicles WHERE ${organizationField} = $1`,
        [organizationId]
      );
      
      const userCount = await db.query(
        `SELECT COUNT(*) as count FROM users WHERE ${organizationField} = $1 AND is_active = 1`,
        [organizationId]
      );
      
      usage = {
        vehicles: vehicleCount.rows[0].count,
        users: userCount.rows[0].count,
        orders_this_month: 0
      };
    }
    
    // Calculate days remaining
    let daysRemaining = null;
    if (subscription.current_period_end) {
      const endDate = new Date(subscription.current_period_end);
      const today = new Date();
      daysRemaining = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
    }
    
    res.json({
      subscription,
      usage,
      daysRemaining,
      limits: {
        vehicles: subscription.max_vehicles,
        users: subscription.max_users,
        orders: subscription.max_orders_per_month
      },
      isLimitReached: {
        vehicles: usage.vehicles >= subscription.max_vehicles,
        users: usage.users >= subscription.max_users,
        orders: usage.orders_this_month >= subscription.max_orders_per_month
      }
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

// Check if action is allowed (enforce limits)
router.post('/check-limit', async (req, res) => {
  try {
    const { action } = req.body; // 'add_vehicle', 'add_user', 'create_order'
    
    const organizationId = req.user.foreign_bond_id || req.user.dealership_id;
    const subscriberType = req.user.foreign_bond_id ? 'supplier' : 'dealership';
    const organizationField = req.user.foreign_bond_id ? 'foreign_bond_id' : 'dealership_id';
    
    // Get subscription limits
    const subResult = await db.query(
      `SELECT p.max_vehicles, p.max_users, p.max_orders_per_month
       FROM subscriptions s
       JOIN subscription_plans p ON s.plan_id = p.id
       WHERE s.subscriber_id = $1 AND s.subscriber_type = $2 AND s.status = 'active'
       LIMIT 1`,
      [organizationId, subscriberType]
    );
    
    let limits = { max_vehicles: 5, max_users: 1, max_orders_per_month: 10 }; // Free tier
    
    if (subResult.rows.length > 0) {
      limits = subResult.rows[0];
    }
    
    let allowed = true;
    let message = '';
    let currentCount = 0;
    
    if (action === 'add_vehicle') {
      const count = await db.query(
        `SELECT COUNT(*) as count FROM vehicles WHERE ${organizationField} = $1`,
        [organizationId]
      );
      currentCount = count.rows[0].count;
      
      if (currentCount >= limits.max_vehicles) {
        allowed = false;
        message = `Vehicle limit reached (${limits.max_vehicles}). Please upgrade your plan.`;
      }
    } else if (action === 'add_user') {
      const count = await db.query(
        `SELECT COUNT(*) as count FROM users WHERE ${organizationField} = $1 AND is_active = 1`,
        [organizationId]
      );
      currentCount = count.rows[0].count;
      
      if (currentCount >= limits.max_users) {
        allowed = false;
        message = `User limit reached (${limits.max_users}). Please upgrade your plan.`;
      }
    } else if (action === 'create_order') {
      const firstDayOfMonth = new Date();
      firstDayOfMonth.setDate(1);
      firstDayOfMonth.setHours(0, 0, 0, 0);
      
      const count = await db.query(
        `SELECT COUNT(*) as count FROM import_orders 
         WHERE ${organizationField} = $1 AND created_at >= $2`,
        [organizationId, firstDayOfMonth.toISOString()]
      );
      currentCount = count.rows[0].count;
      
      if (currentCount >= limits.max_orders_per_month) {
        allowed = false;
        message = `Monthly order limit reached (${limits.max_orders_per_month}). Please upgrade your plan.`;
      }
    }
    
    res.json({
      allowed,
      message,
      currentCount,
      limit: action === 'add_vehicle' ? limits.max_vehicles :
             action === 'add_user' ? limits.max_users :
             limits.max_orders_per_month
    });
  } catch (error) {
    console.error('Error checking limit:', error);
    res.status(500).json({ error: 'Failed to check limit' });
  }
});

module.exports = router;
