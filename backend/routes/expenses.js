const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const bondFilter = require('../middleware/bondFilter');

const CATEGORIES = ['Rent/Lease', 'Staff Salaries', 'Utilities', 'Marketing', 'Repairs & Maintenance',
  'Transport & Fuel', 'Insurance', 'Licences & Fees', 'Office Supplies', 'Other'];

// GET expenses
router.get('/', auth, bondFilter, async (req, res) => {
  try {
    if (!req.isDealershipManager) return res.status(403).json({ error: 'Dealership access only' });
    const { from, to, category } = req.query;
    let where = 'WHERE dealership_id = $1';
    const params = [req.bondId];
    if (from) { params.push(from); where += ` AND expense_date >= $${params.length}`; }
    if (to)   { params.push(to);   where += ` AND expense_date <= $${params.length}`; }
    if (category) { params.push(category); where += ` AND category = $${params.length}`; }
    const result = await db.query(`SELECT * FROM expenses ${where} ORDER BY expense_date DESC`, params);
    // Summary totals
    const summary = await db.query(`
      SELECT category, COALESCE(SUM(amount),0) as total
      FROM expenses WHERE dealership_id = $1
      GROUP BY category ORDER BY total DESC
    `, [req.bondId]);
    res.json({ data: result.rows, summary: summary.rows, categories: CATEGORIES });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST create expense
router.post('/', auth, bondFilter, async (req, res) => {
  try {
    if (!req.isDealershipManager) return res.status(403).json({ error: 'Dealership access only' });
    const { category, description, amount, expense_date, receipt_ref, notes } = req.body;
    if (!category || !description || !amount || !expense_date)
      return res.status(400).json({ error: 'category, description, amount, expense_date required' });
    const result = await db.query(`
      INSERT INTO expenses (dealership_id, category, description, amount, expense_date, receipt_ref, recorded_by, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
    `, [req.bondId, category, description, parseFloat(amount), expense_date, receipt_ref || null, req.user.id, notes || null]);
    await db.saveDb();
    res.status(201).json({ data: result.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE
router.delete('/:id', auth, bondFilter, async (req, res) => {
  try {
    if (!req.isDealershipManager) return res.status(403).json({ error: 'Dealership access only' });
    await db.query('DELETE FROM expenses WHERE id=$1 AND dealership_id=$2', [req.params.id, req.bondId]);
    await db.saveDb();
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET payment aging report
router.get('/aging', auth, bondFilter, async (req, res) => {
  try {
    if (!req.isDealershipManager) return res.status(403).json({ error: 'Dealership access only' });

    // 1. Unpaid / partial local sales
    const salesResult = await db.query(`
      SELECT ls.id, ls.invoice_number, ls.sale_date, ls.selling_price_ugx,
             ls.amount_paid_ugx, (ls.selling_price_ugx - ls.amount_paid_ugx) as balance,
             ls.payment_status, c.full_name as customer_name, c.phone as customer_phone,
             v.make, v.model, v.year,
             CAST((julianday('now') - julianday(ls.sale_date)) AS INTEGER) as days_since_sale,
             'sale' as record_type
      FROM local_sales ls
      JOIN customers c ON ls.customer_id = c.id
      JOIN vehicles v ON ls.vehicle_id = v.id
      WHERE ls.dealership_id = $1
        AND ls.payment_status != 'Paid'
        AND ls.amount_paid_ugx < ls.selling_price_ugx
      ORDER BY days_since_sale DESC
    `, [req.bondId]);

    // 2. Active loans with remaining balance
    const loansResult = await db.query(`
      SELECT cl.id, cl.loan_reference, cl.start_date, cl.loan_amount,
             cl.remaining_balance, cl.monthly_payment, cl.loan_term_months,
             cl.lender_name, cl.status as loan_status,
             c.full_name as customer_name, c.phone as customer_phone,
             v.make, v.model, v.year,
             CAST((julianday('now') - julianday(COALESCE(cl.start_date, cl.created_at))) AS INTEGER) as days_since_start,
             CASE
               WHEN cl.loan_term_months IS NOT NULL AND cl.start_date IS NOT NULL
               THEN CAST((julianday(date(cl.start_date, '+' || (cl.loan_term_months * 30) || ' days')) - julianday('now')) AS INTEGER)
               ELSE NULL
             END as days_remaining
      FROM customer_loans cl
      JOIN customers c ON cl.customer_id = c.id
      LEFT JOIN vehicles v ON cl.vehicle_id = v.id
      WHERE cl.dealership_id = $1
        AND cl.status = 'active'
        AND cl.remaining_balance > 0
      ORDER BY days_remaining ASC NULLS LAST
    `, [req.bondId]);

    const rows = salesResult.rows;
    const loans = loansResult.rows;

    // Unified aging: combine sales (by days since sale) and loans (by days since start)
    // For loans, treat days_since_start as the "aging" metric, balance = remaining_balance
    const allOutstanding = [
      ...rows.map(r => ({ ...r, _type: 'sale', days_aged: r.days_since_sale })),
      ...loans.map(l => ({
        id: `loan-${l.id}`, invoice_number: l.loan_reference || `LOAN-${l.id}`,
        sale_date: l.start_date, selling_price_ugx: l.loan_amount,
        amount_paid_ugx: Number(l.loan_amount) - Number(l.remaining_balance),
        balance: l.remaining_balance, payment_status: 'Loan',
        customer_name: l.customer_name, customer_phone: l.customer_phone,
        make: l.make, model: l.model, year: l.year,
        days_aged: l.days_since_start, days_remaining: l.days_remaining,
        lender_name: l.lender_name, monthly_payment: l.monthly_payment,
        _type: 'loan'
      }))
    ];

    const aging = {
      current:   allOutstanding.filter(r => r.days_aged <= 30),
      days31_60: allOutstanding.filter(r => r.days_aged > 30 && r.days_aged <= 60),
      days61_90: allOutstanding.filter(r => r.days_aged > 60 && r.days_aged <= 90),
      over90:    allOutstanding.filter(r => r.days_aged > 90),
    };

    const loanAging = {
      overdue:  loans.filter(l => l.days_remaining !== null && l.days_remaining < 0),
      urgent:   loans.filter(l => l.days_remaining !== null && l.days_remaining >= 0 && l.days_remaining <= 30),
      upcoming: loans.filter(l => l.days_remaining !== null && l.days_remaining > 30 && l.days_remaining <= 90),
      longTerm: loans.filter(l => l.days_remaining === null || l.days_remaining > 90),
    };

    res.json({ data: allOutstanding, aging, loans, loanAging });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
