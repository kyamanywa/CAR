const express = require('express');
const router = express.Router();
const db = require('../db');

const LEGACY_PLAN_LIMITS = {
  'free trial': { max_vehicles: 50, max_users: 3, max_orders_per_month: 20 },
  starter: { max_vehicles: 50, max_users: 3, max_orders_per_month: 20 },
  professional: { max_vehicles: 200, max_users: 10, max_orders_per_month: 100 },
  enterprise: { max_vehicles: 999999, max_users: 999999, max_orders_per_month: 999999 }
};

function toInt(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

async function tableExists(tableName) {
  const result = await db.query(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = $1 LIMIT 1`,
    [tableName]
  );
  return result.rows.length > 0;
}

// Get current subscription and usage
router.get('/my-subscription', async (req, res) => {
  try {
    const organizationId = req.user.foreign_bond_id || req.user.dealership_id;
    const subscriberType = req.user.foreign_bond_id ? 'supplier' : 'dealership';
    const organizationField = req.user.foreign_bond_id ? 'foreign_bond_id' : 'dealership_id';
    const organizationTable = req.user.foreign_bond_id ? 'foreign_bonds' : 'dealerships';

    if (!organizationId) {
      return res.status(400).json({ error: 'No organization is linked to this user' });
    }

    // Get current usage first (works even when subscription tables are not present)
    const vehicleCount = await db.query(
      `SELECT COUNT(*) as count FROM vehicles WHERE ${organizationField} = $1`,
      [organizationId]
    );

    const userCount = await db.query(
      `SELECT COUNT(*) as count FROM users WHERE ${organizationField} = $1 AND is_active = 1`,
      [organizationId]
    );

    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);

    const orderCountMonth = await db.query(
      `SELECT COUNT(*) as count FROM import_orders 
       WHERE ${organizationField} = $1 
         AND created_at >= $2`,
      [organizationId, firstDayOfMonth.toISOString()]
    );

    const totalOrderCount = await db.query(
      `SELECT COUNT(*) as count FROM import_orders WHERE ${organizationField} = $1`,
      [organizationId]
    );

    const usage = {
      vehicles: toInt(vehicleCount.rows[0]?.count),
      users: toInt(userCount.rows[0]?.count),
      orders_this_month: toInt(orderCountMonth.rows[0]?.count),
      orders_total: toInt(totalOrderCount.rows[0]?.count)
    };

    // Legacy subscription fields stored on organization tables.
    const legacyOrg = await db.query(
      `SELECT * FROM ${organizationTable} WHERE id = $1`,
      [organizationId]
    );

    const legacyPlanName = legacyOrg.rows[0]?.subscription_plan || 'Free Trial';
    const legacyStatus = (legacyOrg.rows[0]?.subscription_status || 'Active').toLowerCase();
    const legacyLimits = LEGACY_PLAN_LIMITS[legacyPlanName.toLowerCase()] || LEGACY_PLAN_LIMITS.starter;
    
    // Prefer subscription-system tables when available, but gracefully fallback.
    let subscription = null;
    const hasSubscriptionTables = (await tableExists('subscriptions')) && (await tableExists('subscription_plans'));
    if (hasSubscriptionTables) {
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

      if (subResult.rows.length > 0) {
        subscription = subResult.rows[0];

        if (subscription.features && typeof subscription.features === 'string') {
          try {
            subscription.features = JSON.parse(subscription.features);
          } catch (e) {
            subscription.features = [];
          }
        }
      }
    } else {
      console.warn('Subscription tables unavailable, falling back to legacy organization subscription fields');
    }

    if (!subscription) {
      subscription = {
        status: legacyStatus,
        plan_name: legacyPlanName,
        current_period_start: legacyOrg.rows[0]?.subscription_start_date || null,
        current_period_end: legacyOrg.rows[0]?.subscription_end_date || null,
        max_vehicles: legacyLimits.max_vehicles,
        max_users: legacyLimits.max_users,
        max_orders_per_month: legacyLimits.max_orders_per_month,
        message: 'Using organization subscription settings'
      };
    }

    const limits = {
      vehicles: toInt(subscription.max_vehicles) || legacyLimits.max_vehicles,
      users: toInt(subscription.max_users) || legacyLimits.max_users,
      orders: toInt(subscription.max_orders_per_month) || legacyLimits.max_orders_per_month
    };

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
      limits,
      isLimitReached: {
        vehicles: usage.vehicles >= limits.vehicles,
        users: usage.users >= limits.users,
        orders: usage.orders_this_month >= limits.orders
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
