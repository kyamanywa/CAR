const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// Run once — cached promise so every route handler doesn't repeat the work
let _initPromise = null;
function ensureSubscriptionTables() {
  if (_initPromise) return _initPromise;
  _initPromise = _doInit();
  return _initPromise;
}

async function _doInit() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS subscription_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      target_user_type TEXT NOT NULL,
      price_monthly REAL DEFAULT 0,
      price_yearly REAL DEFAULT 0,
      currency TEXT DEFAULT 'USD',
      features TEXT,
      max_vehicles INTEGER,
      max_users INTEGER,
      max_orders_per_month INTEGER,
      commission_percentage REAL DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_id INTEGER,
      subscriber_type TEXT NOT NULL,
      subscriber_id INTEGER NOT NULL,
      status TEXT DEFAULT 'active',
      billing_cycle TEXT DEFAULT 'monthly',
      current_period_start TEXT,
      current_period_end TEXT,
      trial_ends_at TEXT,
      canceled_at TEXT,
      payment_gateway TEXT,
      gateway_subscription_id TEXT,
      gateway_customer_id TEXT,
      payment_method_id TEXT,
      billing_email TEXT,
      billing_name TEXT,
      billing_phone TEXT,
      billing_address TEXT,
      current_vehicles_count INTEGER DEFAULT 0,
      current_users_count INTEGER DEFAULT 0,
      current_month_orders INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await ensureDefaultPlans();
  console.log('✓ Subscription tables and plans initialized');
}

// Canonical plan definitions — single source of truth for the whole system
const CANONICAL_PLANS = [
  {
    name: 'Starter',
    description: 'Perfect for small operations',
    price_monthly: 49, price_yearly: 490,
    max_vehicles: 50, max_users: 3, max_orders_per_month: 20,
    commission_percentage: 0,
    features: JSON.stringify(['50 vehicles', '20 orders per month', '3 team members', 'Email notifications', 'Basic reports'])
  },
  {
    name: 'Professional',
    description: 'For growing businesses',
    price_monthly: 199, price_yearly: 1990,
    max_vehicles: 200, max_users: 10, max_orders_per_month: 100,
    commission_percentage: 0,
    features: JSON.stringify(['200 vehicles', '100 orders per month', '10 team members', 'Email & SMS notifications', 'Advanced analytics', 'Priority support'])
  },
  {
    name: 'Enterprise',
    description: 'For large scale operations',
    price_monthly: 499, price_yearly: 4990,
    max_vehicles: 999999, max_users: 999999, max_orders_per_month: 999999,
    commission_percentage: 0,
    features: JSON.stringify(['Unlimited vehicles', 'Unlimited orders', 'Unlimited team members', 'All notifications', 'Custom reports', 'API access', 'Dedicated support'])
  }
];

async function ensureDefaultPlans() {
  for (const type of ['supplier', 'dealership']) {
    const canonicalNames = CANONICAL_PLANS.map((plan) => plan.name.toLowerCase());

    for (const plan of CANONICAL_PLANS) {
      const existing = await db.query(
        `SELECT id FROM subscription_plans
         WHERE LOWER(name) = $1 AND target_user_type = $2
         ORDER BY id ASC
         LIMIT 1`,
        [plan.name.toLowerCase(), type]
      );

      if (existing.rows.length > 0) {
        await db.query(
          `UPDATE subscription_plans
           SET description = $1,
               price_monthly = $2,
               price_yearly = $3,
               currency = 'USD',
               features = $4,
               max_vehicles = $5,
               max_users = $6,
               max_orders_per_month = $7,
               commission_percentage = $8,
               status = 'active',
               updated_at = datetime('now')
           WHERE id = $9`,
          [
            plan.description,
            plan.price_monthly,
            plan.price_yearly,
            plan.features,
            plan.max_vehicles,
            plan.max_users,
            plan.max_orders_per_month,
            plan.commission_percentage,
            existing.rows[0].id
          ]
        );
      } else {
        await db.query(
          `INSERT INTO subscription_plans
             (name, description, target_user_type, price_monthly, price_yearly, features,
              max_vehicles, max_users, max_orders_per_month, commission_percentage)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [plan.name, plan.description, type, plan.price_monthly, plan.price_yearly,
           plan.features, plan.max_vehicles, plan.max_users, plan.max_orders_per_month,
           plan.commission_percentage]
        );
      }

      await db.query(
        `UPDATE subscription_plans
         SET status = 'inactive', updated_at = datetime('now')
         WHERE target_user_type = $1
           AND status = 'active'
           AND LOWER(name) NOT IN ($2, $3, $4)`,
        [type, canonicalNames[0], canonicalNames[1], canonicalNames[2]]
      );

      console.log(`✅ Ensured canonical subscription plans for ${type}`);
    }
  }

  await db.saveDb();
}

// ========== SUBSCRIPTION PLANS ==========

// Admin: Get all plans (including inactive)
router.get('/admin/plans', auth, async (req, res) => {
  try {
    await ensureSubscriptionTables();

    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { target_user_type, status } = req.query;

    let query = 'SELECT * FROM subscription_plans WHERE 1=1';
    const params = [];

    if (target_user_type) {
      params.push(target_user_type);
      query += ` AND target_user_type = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    query += ' ORDER BY target_user_type, price_monthly ASC';

    const result = await db.query(query, params);
    res.json({ data: result.rows });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all subscription plans
router.get('/plans', async (req, res) => {
  try {
    await ensureSubscriptionTables();

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
    await ensureSubscriptionTables();

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
    await ensureSubscriptionTables();

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
    await ensureSubscriptionTables();

    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const {
      name, description, target_user_type, price_monthly, price_yearly, features,
      max_vehicles, max_users, max_orders_per_month, commission_percentage, status
    } = req.body;
    
    const result = await db.query(`
      UPDATE subscription_plans 
      SET name = $1, description = $2, target_user_type = $3, price_monthly = $4, price_yearly = $5,
          features = $6, max_vehicles = $7, max_users = $8, max_orders_per_month = $9,
          commission_percentage = $10, status = $11, updated_at = NOW()
      WHERE id = $12
      RETURNING *
    `, [name, description, target_user_type, price_monthly, price_yearly, JSON.stringify(features),
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

// Admin: Deactivate plan (soft) or hard-delete (?force=true)
router.delete('/plans/:id', auth, async (req, res) => {
  try {
    await ensureSubscriptionTables();

    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (req.query.force === 'true') {
      // Hard delete — remove the plan permanently
      await db.query('DELETE FROM subscription_plans WHERE id = $1', [req.params.id]);
      return res.json({ message: 'Plan permanently deleted' });
    }

    const result = await db.query(
      `UPDATE subscription_plans
       SET status = 'inactive', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    res.json({ data: result.rows[0], message: 'Plan deactivated' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: List all tenants with their current plan assignment
router.get('/admin/subscribers', auth, async (req, res) => {
  try {
    await ensureSubscriptionTables();
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });

    const suppliersRes = await db.query(`
      SELECT fb.id, fb.name, 'supplier' AS subscriber_type,
        s.id AS subscription_id, s.plan_id, sp.name AS plan_name,
        s.status AS subscription_status, s.billing_cycle,
        sp.price_monthly, sp.price_yearly
      FROM foreign_bonds fb
      LEFT JOIN subscriptions s ON s.subscriber_type = 'supplier' AND s.subscriber_id = fb.id
      LEFT JOIN subscription_plans sp ON sp.id = s.plan_id
    `);

    const dealershipsRes = await db.query(`
      SELECT d.id, d.name, 'dealership' AS subscriber_type,
        s.id AS subscription_id, s.plan_id, sp.name AS plan_name,
        s.status AS subscription_status, s.billing_cycle,
        sp.price_monthly, sp.price_yearly
      FROM dealerships d
      LEFT JOIN subscriptions s ON s.subscriber_type = 'dealership' AND s.subscriber_id = d.id
      LEFT JOIN subscription_plans sp ON sp.id = s.plan_id
    `);

    res.json({ data: [...suppliersRes.rows, ...dealershipsRes.rows] });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Assign plan to a tenant — also syncs payment amount
router.post('/admin/assign', auth, async (req, res) => {
  try {
    await ensureSubscriptionTables();
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });

    const { subscriber_type, subscriber_id, plan_id, billing_cycle } = req.body;
    if (!subscriber_type || !subscriber_id || !plan_id) {
      return res.status(400).json({ error: 'subscriber_type, subscriber_id and plan_id are required' });
    }

    // Fetch the plan to sync amounts
    const planRes = await db.query('SELECT * FROM subscription_plans WHERE id = $1', [plan_id]);
    if (planRes.rows.length === 0) return res.status(404).json({ error: 'Plan not found' });
    const plan = planRes.rows[0];

    const cycle = billing_cycle || 'monthly';
    const periodStart = new Date().toISOString();
    const periodEnd = new Date();
    if (cycle === 'yearly') periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    else periodEnd.setMonth(periodEnd.getMonth() + 1);

    // Upsert subscription
    const existing = await db.query(
      'SELECT id FROM subscriptions WHERE subscriber_type = $1 AND subscriber_id = $2',
      [subscriber_type, subscriber_id]
    );

    let subResult;
    if (existing.rows.length > 0) {
      subResult = await db.query(
        `UPDATE subscriptions SET plan_id=$1, status='active', billing_cycle=$2,
           current_period_start=$3, current_period_end=$4, updated_at=datetime('now')
         WHERE subscriber_type=$5 AND subscriber_id=$6 RETURNING *`,
        [plan_id, cycle, periodStart, periodEnd.toISOString(), subscriber_type, subscriber_id]
      );
    } else {
      subResult = await db.query(
        `INSERT INTO subscriptions (plan_id, subscriber_type, subscriber_id, status, billing_cycle,
           current_period_start, current_period_end)
         VALUES ($1,$2,$3,'active',$4,$5,$6) RETURNING *`,
        [plan_id, subscriber_type, subscriber_id, cycle, periodStart, periodEnd.toISOString()]
      );
    }

    // Sync payment amount AND dates on the org record
    const amount = cycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
    try {
      if (subscriber_type === 'supplier') {
        await db.query(
          `UPDATE foreign_bonds SET subscription_plan=$1, subscription_amount=$2,
            subscription_start_date=$3, subscription_end_date=$4, subscription_status='active' WHERE id=$5`,
          [plan.name, amount, periodStart, periodEnd.toISOString(), subscriber_id]
        );
      } else {
        await db.query(
          `UPDATE dealerships SET subscription_plan=$1, subscription_amount=$2,
            subscription_start_date=$3, subscription_end_date=$4, subscription_status='active' WHERE id=$5`,
          [plan.name, amount, periodStart, periodEnd.toISOString(), subscriber_id]
        );
      }
    } catch (_) {
      // column may not exist in this environment — non-fatal
    }

    await db.saveDb();
    res.json({ data: subResult.rows[0], message: `Plan "${plan.name}" assigned successfully` });
  } catch (error) {
    console.error('Error assigning plan:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// ========== SUBSCRIPTIONS ==========

// Get my subscription (for suppliers and dealerships)
router.get('/my-subscription', auth, async (req, res) => {
  try {
    await ensureSubscriptionTables();

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
    await ensureSubscriptionTables();

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
    await ensureSubscriptionTables();

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

    // Sync subscription_amount and plan name on the org record
    try {
      const planRes = await db.query('SELECT * FROM subscription_plans WHERE id = $1', [plan_id]);
      if (planRes.rows.length > 0) {
        const plan = planRes.rows[0];
        const amount = billing_cycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
        if (subscriberType === 'supplier') {
          await db.query(
            `UPDATE foreign_bonds SET subscription_plan=$1, subscription_amount=$2,
              subscription_start_date=$3, subscription_end_date=$4, subscription_status='active' WHERE id=$5`,
            [plan.name, amount, periodStart.toISOString(), periodEnd.toISOString(), subscriberId]
          );
        } else {
          await db.query(
            `UPDATE dealerships SET subscription_plan=$1, subscription_amount=$2,
              subscription_start_date=$3, subscription_end_date=$4, subscription_status='active' WHERE id=$5`,
            [plan.name, amount, periodStart.toISOString(), periodEnd.toISOString(), subscriberId]
          );
        }
        await db.saveDb();
      }
    } catch (_) { /* non-fatal */ }

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
    await ensureSubscriptionTables();

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
    await ensureSubscriptionTables();

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
    await ensureSubscriptionTables();

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
    await ensureSubscriptionTables();

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
