const db = require('../db');

// Fallback limits used only when no plan is found in subscription_plans table
const FALLBACK_LIMITS = { max_vehicles: 50, max_orders: 20, max_users: 3 };

async function getPlanLimits(planName, targetType) {
  try {
    const result = await db.query(
      `SELECT max_vehicles, max_users, max_orders_per_month FROM subscription_plans
       WHERE LOWER(name) = LOWER($1) AND LOWER(target_user_type) = LOWER($2) AND status = 'active'
       LIMIT 1`,
      [planName || '', targetType || 'dealership']
    );
    if (result.rows.length > 0) {
      const r = result.rows[0];
      return {
        max_vehicles: r.max_vehicles || FALLBACK_LIMITS.max_vehicles,
        max_orders: r.max_orders_per_month || FALLBACK_LIMITS.max_orders,
        max_users: r.max_users || FALLBACK_LIMITS.max_users,
      };
    }
  } catch (_) {}
  return FALLBACK_LIMITS;
}

// Check if dealership can add more vehicles
async function checkVehicleLimit(req, res, next) {
  try {
    if (!req.bondId) {
      return next(); // Skip for non-dealership users
    }

    // Get dealership subscription plan
    const dealershipQuery = await db.query(
      'SELECT subscription_plan, subscription_status FROM dealerships WHERE id = $1',
      [req.bondId]
    );

    if (dealershipQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Dealership not found' });
    }

    const { subscription_plan, subscription_status } = dealershipQuery.rows[0];

    // Check if subscription is active (case-insensitive)
    if (subscription_status?.toLowerCase() !== 'active') {
      return res.status(403).json({ 
        error: 'Subscription inactive. Please renew your subscription to continue.',
        subscription_status 
      });
    }

    const plan = await getPlanLimits(subscription_plan, 'dealership');

    // Count current vehicles
    const countQuery = await db.query(
      'SELECT COALESCE(SUM(quantity), 0) as total FROM vehicles WHERE dealership_id = $1',
      [req.bondId]
    );

    const currentCount = parseInt(countQuery.rows[0].total) || 0;
    const requestedQuantity = parseInt(req.body.quantity) || 1;

    if (currentCount + requestedQuantity > plan.max_vehicles) {
      return res.status(403).json({
        error: 'Vehicle limit reached',
        current: currentCount,
        limit: plan.max_vehicles,
        plan: subscription_plan,
        message: `Your ${subscription_plan} plan allows ${plan.max_vehicles} vehicles. You currently have ${currentCount}. Upgrade to add more vehicles.`,
        upgrade_url: '/subscription'
      });
    }

    // Attach usage info to request
    req.usageInfo = {
      current: currentCount,
      limit: plan.max_vehicles,
      plan: subscription_plan
    };

    next();
  } catch (error) {
    console.error('Usage limit check error:', error);
    next(); // Don't block on error
  }
}

// Check if dealership can add more orders
async function checkOrderLimit(req, res, next) {
  try {
    if (!req.bondId) {
      return next(); // Skip for non-dealership users
    }

    // Get dealership subscription plan
    const dealershipQuery = await db.query(
      'SELECT subscription_plan, subscription_status FROM dealerships WHERE id = $1',
      [req.bondId]
    );

    if (dealershipQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Dealership not found' });
    }

    const { subscription_plan, subscription_status } = dealershipQuery.rows[0];

    // Check if subscription is active (case-insensitive)
    if (subscription_status?.toLowerCase() !== 'active') {
      return res.status(403).json({ 
        error: 'Subscription inactive. Please renew your subscription to continue.',
        subscription_status 
      });
    }

    const plan = await getPlanLimits(subscription_plan, 'dealership');

    // Count current orders (last 30 days)
    const countQuery = await db.query(
      `SELECT COUNT(*) as total FROM import_orders 
       WHERE dealership_id = $1 AND created_at >= date('now', '-30 days')`,
      [req.bondId]
    );

    const currentCount = parseInt(countQuery.rows[0].total) || 0;

    if (currentCount >= plan.max_orders) {
      return res.status(403).json({
        error: 'Order limit reached',
        current: currentCount,
        limit: plan.max_orders,
        plan: subscription_plan,
        message: `Your ${subscription_plan} plan allows ${plan.max_orders} orders per month. Upgrade for more capacity.`,
        upgrade_url: '/subscription'
      });
    }

    // Attach usage info to request
    req.orderUsage = {
      current: currentCount,
      limit: plan.max_orders,
      plan: subscription_plan
    };

    next();
  } catch (error) {
    console.error('Order limit check error:', error);
    next(); // Don't block on error
  }
}

// Check if dealership can add more team members
async function checkUserLimit(req, res, next) {
  try {
    const dealershipId = req.body.dealership_id || req.bondId;
    
    if (!dealershipId) {
      return next(); // Skip for non-dealership users
    }

    // Get dealership subscription plan
    const dealershipQuery = await db.query(
      'SELECT subscription_plan, subscription_status FROM dealerships WHERE id = $1',
      [dealershipId]
    );

    if (dealershipQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Dealership not found' });
    }

    const { subscription_plan, subscription_status } = dealershipQuery.rows[0];

    // Check if subscription is active (case-insensitive)
    if (subscription_status?.toLowerCase() !== 'active') {
      return res.status(403).json({ 
        error: 'Subscription inactive',
        subscription_status 
      });
    }

    const plan = await getPlanLimits(subscription_plan, 'dealership');

    // Count current team members
    const countQuery = await db.query(
      'SELECT COUNT(*) as total FROM users WHERE dealership_id = $1',
      [dealershipId]
    );

    const currentCount = parseInt(countQuery.rows[0].total) || 0;

    if (currentCount >= plan.max_users) {
      return res.status(403).json({
        error: 'User limit reached',
        current: currentCount,
        limit: plan.max_users,
        plan: subscription_plan,
        message: `Your ${subscription_plan} plan allows ${plan.max_users} team members. Upgrade for more users.`,
        upgrade_url: '/subscription'
      });
    }

    next();
  } catch (error) {
    console.error('User limit check error:', error);
    next(); // Don't block on error
  }
}

// Get usage statistics for current dealership
async function getUsageStats(dealershipId) {
  try {
    const dealershipQuery = await db.query(
      'SELECT subscription_plan FROM dealerships WHERE id = $1',
      [dealershipId]
    );

    const subscription_plan = dealershipQuery.rows[0]?.subscription_plan || 'Starter';
    const plan = await getPlanLimits(subscription_plan, 'dealership');

    // Get vehicle count
    const vehicleCount = await db.query(
      'SELECT COALESCE(SUM(quantity), 0) as total FROM vehicles WHERE dealership_id = $1',
      [dealershipId]
    );

    // Get order count (last 30 days)
    const orderCount = await db.query(
      `SELECT COUNT(*) as total FROM import_orders 
       WHERE dealership_id = $1 AND created_at >= date('now', '-30 days')`,
      [dealershipId]
    );

    // Get user count
    const userCount = await db.query(
      'SELECT COUNT(*) as total FROM users WHERE dealership_id = $1',
      [dealershipId]
    );

    return {
      plan: subscription_plan,
      vehicles: {
        used: parseInt(vehicleCount.rows[0].total) || 0,
        limit: plan.max_vehicles,
        percentage: Math.round(((parseInt(vehicleCount.rows[0].total) || 0) / plan.max_vehicles) * 100)
      },
      orders: {
        used: parseInt(orderCount.rows[0].total) || 0,
        limit: plan.max_orders,
        percentage: Math.round(((parseInt(orderCount.rows[0].total) || 0) / plan.max_orders) * 100)
      },
      users: {
        used: parseInt(userCount.rows[0].total) || 0,
        limit: plan.max_users,
        percentage: Math.round(((parseInt(userCount.rows[0].total) || 0) / plan.max_users) * 100)
      }
    };
  } catch (error) {
    console.error('Get usage stats error:', error);
    return null;
  }
}

module.exports = {
  checkVehicleLimit,
  checkOrderLimit,
  checkUserLimit,
  getUsageStats,
};
