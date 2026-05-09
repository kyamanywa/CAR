const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const flutterwaveService = require('../services/flutterwaveService');
const emailService = require('../services/emailService');

// Get Flutterwave public key
router.get('/config', (req, res) => {
  res.json({ 
    public_key: flutterwaveService.getPublicKey(),
    plans: flutterwaveService.PLAN_PRICES
  });
});

// Initiate Mobile Money payment
router.post('/mobile-money', auth, async (req, res) => {
  try {
    const { phone_number, network, plan, duration_months } = req.body;
    
    if (!phone_number || !network || !plan) {
      return res.status(400).json({ error: 'Phone number, network, and plan are required' });
    }

    // Get dealership details
    const dealershipQuery = await db.query(
      'SELECT id, name, email FROM dealerships WHERE id = $1',
      [req.bondId]
    );

    if (dealershipQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Dealership not found' });
    }

    const dealership = dealershipQuery.rows[0];

    // Initiate payment
    const result = await flutterwaveService.initiateMobileMoneyPayment({
      dealership_id: dealership.id,
      dealership_name: dealership.name,
      email: dealership.email,
      phone_number: phone_number,
      plan: plan,
      duration_months: duration_months || 1
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error, details: result.details });
    }

    // Log payment attempt
    await db.query(
      `INSERT INTO payment_transactions (dealership_id, tx_ref, amount, plan, duration_months, status, payment_method)
       VALUES ($1, $2, $3, $4, $5, 'pending', 'mobile_money')`,
      [dealership.id, result.tx_ref, result.amount, plan, duration_months || 1]
    );

    await db.saveDb();

    res.json({ 
      success: true, 
      data: result 
    });
  } catch (error) {
    console.error('Mobile Money payment error:', error);
    res.status(500).json({ error: 'Payment initialization failed' });
  }
});

// Initiate card payment
router.post('/card', auth, async (req, res) => {
  try {
    const { plan, duration_months } = req.body;
    
    if (!plan) {
      return res.status(400).json({ error: 'Plan is required' });
    }

    // Get dealership details
    const dealershipQuery = await db.query(
      'SELECT id, name, email FROM dealerships WHERE id = $1',
      [req.bondId]
    );

    if (dealershipQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Dealership not found' });
    }

    const dealership = dealershipQuery.rows[0];

    // Initiate payment
    const result = await flutterwaveService.initiateCardPayment({
      dealership_id: dealership.id,
      dealership_name: dealership.name,
      email: dealership.email,
      plan: plan,
      duration_months: duration_months || 1
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Log payment attempt
    await db.query(
      `INSERT INTO payment_transactions (dealership_id, tx_ref, amount, plan, duration_months, status, payment_method)
       VALUES ($1, $2, $3, $4, $5, 'pending', 'card')`,
      [dealership.id, result.tx_ref, result.amount, plan, duration_months || 1]
    );

    await db.saveDb();

    res.json({ 
      success: true, 
      data: result 
    });
  } catch (error) {
    console.error('Card payment error:', error);
    res.status(500).json({ error: 'Payment initialization failed' });
  }
});

// Verify payment
router.get('/verify/:transaction_id', auth, async (req, res) => {
  try {
    const result = await flutterwaveService.verifyPayment(req.params.transaction_id);
    
    if (result.success) {
      // Update payment transaction record
      const updateQuery = await db.query(
        `UPDATE payment_transactions 
         SET status = 'completed', transaction_id = $1, updated_at = CURRENT_TIMESTAMP
         WHERE tx_ref = $2 RETURNING *`,
        [req.params.transaction_id, result.tx_ref]
      );

      if (updateQuery.rows.length > 0) {
        const transaction = updateQuery.rows[0];
        
        // Calculate new subscription end date
        const endDate = flutterwaveService.calculateSubscriptionEndDate(transaction.duration_months);
        
        // Update dealership subscription
        await db.query(
          `UPDATE dealerships 
           SET subscription_plan = $1, 
               subscription_status = 'active',
               subscription_start_date = CURRENT_TIMESTAMP,
               subscription_end_date = $2,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $3`,
          [transaction.plan, endDate, transaction.dealership_id]
        );

        await db.saveDb();

        // Send confirmation email
        try {
          const dealershipQuery = await db.query(
            'SELECT name, email FROM dealerships WHERE id = $1',
            [transaction.dealership_id]
          );
          
          if (dealershipQuery.rows.length > 0) {
            const dealership = dealershipQuery.rows[0];
            // Email would be sent here (template needed)
            console.log(`Payment confirmed for ${dealership.name}`);
          }
        } catch (emailError) {
          console.error('Email notification error:', emailError);
        }
      }
    }

    res.json({ 
      success: result.success, 
      data: result 
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Flutterwave webhook handler
router.post('/webhook', express.json(), async (req, res) => {
  try {
    const secretHash = process.env.FLUTTERWAVE_SECRET_HASH;
    const signature = req.headers['verif-hash'];

    // Verify webhook signature
    if (!signature || signature !== secretHash) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const payload = req.body;

    if (payload.status === 'successful') {
      const { tx_ref, transaction_id, amount } = payload.data;

      // Find transaction
      const transactionQuery = await db.query(
        'SELECT * FROM payment_transactions WHERE tx_ref = $1',
        [tx_ref]
      );

      if (transactionQuery.rows.length > 0) {
        const transaction = transactionQuery.rows[0];

        // Update transaction status
        await db.query(
          `UPDATE payment_transactions 
           SET status = 'completed', transaction_id = $1, updated_at = CURRENT_TIMESTAMP
           WHERE tx_ref = $2`,
          [transaction_id, tx_ref]
        );

        // Calculate subscription end date
        const endDate = flutterwaveService.calculateSubscriptionEndDate(transaction.duration_months);

        // Activate subscription
        await db.query(
          `UPDATE dealerships 
           SET subscription_plan = $1, 
               subscription_status = 'active',
               subscription_start_date = CURRENT_TIMESTAMP,
               subscription_end_date = $2,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $3`,
          [transaction.plan, endDate, transaction.dealership_id]
        );

        await db.saveDb();

        console.log(`✅ Subscription activated for dealership ${transaction.dealership_id}`);
      }
    }

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Get payment history
router.get('/history', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM payment_transactions 
       WHERE dealership_id = $1 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [req.bondId]
    );

    res.json({ data: result.rows });
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

module.exports = router;
