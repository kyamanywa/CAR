const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/loans — all loans for my dealership
router.get('/', async (req, res) => {
  try {
    if (!req.user.dealership_id) return res.status(403).json({ error: 'Dealership users only' });
    const result = await db.query(`
      SELECT cl.*, c.full_name as customer_name, c.phone as customer_phone,
             v.make, v.model, v.year, v.chassis_number
      FROM customer_loans cl
      JOIN customers c ON cl.customer_id = c.id
      LEFT JOIN vehicles v ON cl.vehicle_id = v.id
      WHERE cl.dealership_id = $1
      ORDER BY cl.created_at DESC
    `, [req.user.dealership_id]);
    res.json({ data: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/loans/customer/:customerId — loans for one customer
router.get('/customer/:customerId', async (req, res) => {
  try {
    if (!req.user.dealership_id) return res.status(403).json({ error: 'Dealership users only' });
    const result = await db.query(`
      SELECT cl.*, c.full_name as customer_name,
             v.make, v.model, v.year, v.chassis_number,
             (SELECT COALESCE(SUM(lp.amount),0) FROM loan_payments lp WHERE lp.loan_id = cl.id) as total_paid
      FROM customer_loans cl
      JOIN customers c ON cl.customer_id = c.id
      LEFT JOIN vehicles v ON cl.vehicle_id = v.id
      WHERE cl.customer_id = $1 AND cl.dealership_id = $2
      ORDER BY cl.created_at DESC
    `, [req.params.customerId, req.user.dealership_id]);
    res.json({ data: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/loans — create loan
router.post('/', async (req, res) => {
  try {
    if (!req.user.dealership_id) return res.status(403).json({ error: 'Dealership users only' });
    const {
      customer_id, vehicle_id, loan_amount, down_payment, monthly_payment,
      loan_term_months, interest_rate, lender_name, loan_reference,
      start_date, notes
    } = req.body;
    if (!customer_id || !loan_amount) return res.status(400).json({ error: 'customer_id and loan_amount required' });
    const remaining = Number(loan_amount) - Number(down_payment || 0);
    const result = await db.query(`
      INSERT INTO customer_loans (customer_id, dealership_id, vehicle_id, loan_amount, down_payment,
        monthly_payment, loan_term_months, interest_rate, lender_name, loan_reference,
        start_date, remaining_balance, notes, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'active') RETURNING *
    `, [customer_id, req.user.dealership_id, vehicle_id || null, loan_amount, down_payment || 0,
        monthly_payment || null, loan_term_months || null, interest_rate || 0,
        lender_name || null, loan_reference || null, start_date || null, remaining, notes || null]);

    // If a vehicle is linked, decrement its stock quantity
    if (vehicle_id) {
      const veh = await db.query(
        'SELECT quantity FROM vehicles WHERE id = $1 AND dealership_id = $2',
        [vehicle_id, req.user.dealership_id]
      );
      if (veh.rows.length > 0) {
        const newQty = Math.max(0, (veh.rows[0].quantity || 1) - 1);
        await db.query(
          'UPDATE vehicles SET quantity = $1, status = CASE WHEN $1 = 0 THEN \'Reserved\' ELSE status END WHERE id = $2',
          [newQty, vehicle_id]
        );
      }
    }

    await db.saveDb();
    res.status(201).json({ data: result.rows[0], message: 'Loan created' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/loans/:id — update loan status (e.g. mark as defaulted)
router.patch('/:id', async (req, res) => {
  try {
    if (!req.user.dealership_id) return res.status(403).json({ error: 'Dealership users only' });
    const { status, notes } = req.body;
    await db.query(
      'UPDATE customer_loans SET status=$1, notes=$2 WHERE id=$3 AND dealership_id=$4',
      [status, notes, req.params.id, req.user.dealership_id]
    );
    // When defaulted or settled manually, mark vehicle as Sold
    if (status === 'defaulted' || status === 'settled') {
      const loanData = await db.query(
        'SELECT vehicle_id FROM customer_loans WHERE id=$1',
        [req.params.id]
      );
      const vehicleId = loanData.rows[0]?.vehicle_id;
      if (vehicleId) {
        await db.query(
          "UPDATE vehicles SET status='Sold' WHERE id=$1",
          [vehicleId]
        );
      }
    }
    await db.saveDb();
    res.json({ message: 'Loan updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/loans/:id/payments — record a payment
router.post('/:id/payments', async (req, res) => {
  try {
    if (!req.user.dealership_id) return res.status(403).json({ error: 'Dealership users only' });
    const { amount, payment_date, notes } = req.body;
    if (!amount || !payment_date) return res.status(400).json({ error: 'amount and payment_date required' });

    // Verify ownership
    const loanCheck = await db.query(
      'SELECT id, remaining_balance FROM customer_loans WHERE id=$1 AND dealership_id=$2',
      [req.params.id, req.user.dealership_id]
    );
    if (loanCheck.rows.length === 0) return res.status(404).json({ error: 'Loan not found' });

    await db.query(
      'INSERT INTO loan_payments (loan_id, amount, payment_date, notes) VALUES ($1,$2,$3,$4)',
      [req.params.id, amount, payment_date, notes || null]
    );

    // Update remaining balance
    const newBalance = Math.max(0, (loanCheck.rows[0].remaining_balance || 0) - Number(amount));
    const newStatus = newBalance <= 0 ? 'settled' : 'active';
    await db.query(
      'UPDATE customer_loans SET remaining_balance=$1, status=$2 WHERE id=$3',
      [newBalance, newStatus, req.params.id]
    );

    // When fully settled, mark the linked vehicle as Sold
    if (newStatus === 'settled') {
      const loanData = await db.query(
        'SELECT vehicle_id FROM customer_loans WHERE id=$1',
        [req.params.id]
      );
      const vehicleId = loanData.rows[0]?.vehicle_id;
      if (vehicleId) {
        await db.query(
          "UPDATE vehicles SET status='Sold' WHERE id=$1",
          [vehicleId]
        );
      }
    }

    await db.saveDb();
    res.status(201).json({ message: 'Payment recorded', remaining_balance: newBalance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/loans/:id/payments — payment history
router.get('/:id/payments', async (req, res) => {
  try {
    if (!req.user.dealership_id) return res.status(403).json({ error: 'Dealership users only' });
    const result = await db.query(
      'SELECT * FROM loan_payments WHERE loan_id=$1 ORDER BY payment_date DESC',
      [req.params.id]
    );
    res.json({ data: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
