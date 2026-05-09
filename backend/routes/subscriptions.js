const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// ========== SUBSCRIPTION PLANS ==========

// Get all subscription plans
router.get('/plans', async (req, res) => {
  try {
    const { target_user_type } = req.query;
    
    let query = 'SELECT * FROM subscription_plans WHERE status = $1';
    const params = ['active'];
    
    if (target_user_type) {
      params.push(target_user_type);
      query += ` AND target_user_type = $${params.length}`;
    }
    
    query += ' ORDER BY price_monthly ASC';
    
    const result = await db.query(query, params);
    res.json({ data: result.rows });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single plan
router.get('/plans/:id', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM subscription_plans WHERE id = $1',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    
    res.json({ data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Create subscription plan
router.post('/plans', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const {
      name, description, target_user_type, price_monthly, price_yearly,
      features, max_vehicles, max_users, max_orders_per_month, commission_percentage
    } = req.body;
    
    const result = await db.query(`
      INSERT INTO subscription_plans (
        name, description, target_user_type, price_monthly, price_yearly,
        features, max_vehicles, max_users, max_orders_per_month, commission_percentage
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [name, description, target_user_type, price_monthly, price_yearly,
        JSON.stringify(features), max_vehicles, max_users, max_orders_per_month, commission_percentage]);
    
    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Update subscription plan
router.put('/plans/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const {
      name, description, price_monthly, price_yearly, features,
      max_vehicles, max_users, max_orders_per_month, commission_percentage, status
    } = req.body;
    
    const result = await db.query(`
      UPDATE subscription_plans 
      SET name = $1, description = $2, price_monthly = $3, price_yearly = $4,
          features = $5, max_vehicles = $6, max_users = $7, max_orders_per_month = $8,
          commission_percentage = $9, status = $10, updated_at = NOW()
      WHERE id = $11
      RETURNING *
    `, [name, description, price_monthly, price_yearly, JSON.stringify(features),
        max_vehicles, max_users, max_orders_per_month, commission_percentage, status, req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    
    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== SUBSCRIPTIONS ==========

// Get my subscription (for suppliers and dealerships)
router.get('/my-subscription', auth, async (req, res) => {
  try {
    const subscriberType = req.user.role === 'foreign_bond_user' ? 'supplier' : 'dealership';
    const subscriberId = req.user.foreign_bond_id || req.user.dealership_id;
    
    if (!subscriberId) {
      return res.status(400).json({ error: 'No subscriber ID found' });
    }
    
    const result = await db.query(`
      SELECT s.*, sp.name as plan_name, sp.features as plan_features,
             sp.max_vehicles, sp.max_users, sp.max_orders_per_month
      FROM subscriptions s
      LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
      WHERE s.subscriber_type = $1 AND s.subscriber_id = $2
    `, [subscriberType, subscriberId]);
    
    if (result.rows.length === 0) {
      return res.json({ data: null }); // No subscription yet
    }
    
    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Get all subscriptions
router.get('/subscriptions', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { status, subscriber_type } = req.query;
    
    let query = `
      SELECT s.*, sp.name as plan_name,
        CASE 
          WHEN s.subscriber_type = 'supplier' THEN fb.name
          WHEN s.subscriber_type = 'dealership' THEN d.name
        END as subscriber_name
      FROM subscriptions s
      LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
      LEFT JOIN foreign_bonds fb ON s.subscriber_type = 'supplier' AND s.subscriber_id = fb.id
      LEFT JOIN dealerships d ON s.subscriber_type = 'dealership' AND s.subscriber_id = d.id
      WHERE 1=1
    `;
    const params = [];
    
    if (status) {
      params.push(status);
      query += ` AND s.status = $${params.length}`;
    }
    
    if (subscriber_type) {
      params.push(subscriber_type);
      query += ` AND s.subscriber_type = $${params.length}`;
    }
    
    query += ' ORDER BY s.created_at DESC';
    
    const result = await db.query(query, params);
    res.json({ data: result.rows });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create subscription (called after payment gateway confirmation)
// This is a placeholder - integrate with your payment gateway
router.post('/subscriptions', auth, async (req, res) => {
  try {
    const {
      plan_id, billing_cycle, billing_email, billing_name, billing_phone,
      payment_gateway, gateway_customer_id, gateway_subscription_id
    } = req.body;
    
    const subscriberType = req.user.role === 'foreign_bond_user' ? 'supplier' : 'dealership';
    const subscriberId = req.user.foreign_bond_id || req.user.dealership_id;
    
    if (!subscriberId) {
      return res.status(400).json({ error: 'No subscriber ID found' });
    }
    
    // Calculate period dates
    const periodStart = new Date();
    const periodEnd = new Date();
    if (billing_cycle === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }
    
    // TODO: Integrate with payment gateway here
    // - Create customer in payment gateway
    // - Set up subscription in payment gateway
    // - Get gateway IDs
    // For now, we'll use placeholder values
    
    const result = await db.query(`
      INSERT INTO subscriptions (
        plan_id, subscriber_type, subscriber_id, status, billing_cycle,
        current_period_start, current_period_end, billing_email, billing_name,
        billing_phone, payment_gateway, gateway_customer_id, gateway_subscription_id
      )
      VALUES ($1, $2, $3, 'active', $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (subscriber_type, subscriber_id) 
      DO UPDATE SET 
        plan_id = $1, billing_cycle = $4, status = 'active',
        current_period_start = $5, current_period_end = $6,
        updated_at = NOW()
      RETURNING *
    `, [plan_id, subscriberType, subscriberId, billing_cycle, periodStart, periodEnd,
        billing_email, billing_name, billing_phone, payment_gateway,
        gateway_customer_id, gateway_subscription_id]);
    
    res.status(201).json({ 
      data: result.rows[0],
      message: 'Subscription created. Integrate payment gateway for live payments.'
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Cancel subscription
router.post('/subscriptions/cancel', auth, async (req, res) => {
  try {
    const subscriberType = req.user.role === 'foreign_bond_user' ? 'supplier' : 'dealership';
    const subscriberId = req.user.foreign_bond_id || req.user.dealership_id;
    
    // TODO: Cancel subscription in payment gateway
    
    const result = await db.query(`
      UPDATE subscriptions 
      SET status = 'canceled', canceled_at = NOW(), updated_at = NOW()
      WHERE subscriber_type = $1 AND subscriber_id = $2
      RETURNING *
    `, [subscriberType, subscriberId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
    }
    
    res.json({ 
      data: result.rows[0],
      message: 'Subscription canceled'
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== INVOICES ==========

// Get my invoices
router.get('/my-invoices', auth, async (req, res) => {
  try {
    const subscriberType = req.user.role === 'foreign_bond_user' ? 'supplier' : 'dealership';
    const subscriberId = req.user.foreign_bond_id || req.user.dealership_id;
    
    const result = await db.query(`
      SELECT * FROM invoices
      WHERE subscriber_type = $1 AND subscriber_id = $2
      ORDER BY created_at DESC
    `, [subscriberType, subscriberId]);
    
    res.json({ data: result.rows });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Get all invoices
router.get('/invoices', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { status, subscriber_type } = req.query;
    
    let query = `
      SELECT i.*,
        CASE 
          WHEN i.subscriber_type = 'supplier' THEN fb.name
          WHEN i.subscriber_type = 'dealership' THEN d.name
        END as subscriber_name
      FROM invoices i
      LEFT JOIN foreign_bonds fb ON i.subscriber_type = 'supplier' AND i.subscriber_id = fb.id
      LEFT JOIN dealerships d ON i.subscriber_type = 'dealership' AND i.subscriber_id = d.id
      WHERE 1=1
    `;
    const params = [];
    
    if (status) {
      params.push(status);
      query += ` AND i.status = $${params.length}`;
    }
    
    if (subscriber_type) {
      params.push(subscriber_type);
      query += ` AND i.subscriber_type = $${params.length}`;
    }
    
    query += ' ORDER BY i.created_at DESC';
    
    const result = await db.query(query, params);
    res.json({ data: result.rows });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== PAYMENT GATEWAY WEBHOOKS ==========

// Webhook endpoint for payment gateway callbacks
// This endpoint should NOT require authentication (gateway will call it)
router.post('/webhook/:gateway', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const gateway = req.params.gateway; // 'stripe', 'flutterwave', etc.
    
    // TODO: Verify webhook signature based on gateway
    // TODO: Process webhook event (payment success, failure, subscription update, etc.)
    
    console.log(`Webhook received from ${gateway}:`, req.body);
    
    // Example handling:
    // if (gateway === 'stripe') {
    //   const event = req.body;
    //   
    //   switch (event.type) {
    //     case 'invoice.payment_succeeded':
    //       // Update invoice status to paid
    //       break;
    //     case 'customer.subscription.deleted':
    //       // Cancel subscription
    //       break;
    //   }
    // }
    
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: 'Webhook processing failed' });
  }
});

// ========== USAGE TRACKING ==========

// Check usage limits
router.get('/usage/check', auth, async (req, res) => {
  try {
    const subscriberType = req.user.role === 'foreign_bond_user' ? 'supplier' : 'dealership';
    const subscriberId = req.user.foreign_bond_id || req.user.dealership_id;
    
    const subscription = await db.query(`
      SELECT s.*, sp.max_vehicles, sp.max_users, sp.max_orders_per_month
      FROM subscriptions s
      LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
      WHERE s.subscriber_type = $1 AND s.subscriber_id = $2
    `, [subscriberType, subscriberId]);
    
    if (subscription.rows.length === 0) {
      return res.json({ 
        withinLimits: false,
        message: 'No active subscription'
      });
    }
    
    const sub = subscription.rows[0];
    
    const withinLimits = {
      vehicles: sub.max_vehicles === null || sub.current_vehicles_count <= sub.max_vehicles,
      users: sub.max_users === null || sub.current_users_count <= sub.max_users,
      orders: sub.max_orders_per_month === null || sub.current_month_orders <= sub.max_orders_per_month
    };
    
    res.json({
      withinLimits: withinLimits.vehicles && withinLimits.users && withinLimits.orders,
      details: withinLimits,
      current: {
        vehicles: sub.current_vehicles_count,
        users: sub.current_users_count,
        orders: sub.current_month_orders
      },
      limits: {
        vehicles: sub.max_vehicles,
        users: sub.max_users,
        orders: sub.max_orders_per_month
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
