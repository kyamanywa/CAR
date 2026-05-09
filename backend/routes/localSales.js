const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const bondFilter = require('../middleware/bondFilter');

// Get all local sales
router.get('/', auth, bondFilter, async (req, res) => {
  try {
    const { payment_status } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    // Filter by dealership for dealership managers
    if (req.isDealershipManager) {
      params.push(req.bondId);
      whereClause += ` AND ls.dealership_id = $${params.length}`;
    } else if (req.isForeignBondUser) {
      // Suppliers don't have sales
      return res.json({ data: [] });
    }
    
    if (payment_status) {
      params.push(payment_status);
      whereClause += ` AND ls.payment_status = $${params.length}`;
    }
    
    const query = `
      SELECT ls.*, v.make, v.model, v.year, v.chassis_number, v.color,
        d.name as dealership_name,
        c.full_name as customer_name, c.phone as customer_phone,
        (ls.selling_price_ugx - ls.amount_paid_ugx) as balance
      FROM local_sales ls
      JOIN vehicles v ON ls.vehicle_id = v.id
      JOIN dealerships d ON ls.dealership_id = d.id
      JOIN customers c ON ls.customer_id = c.id
      ${whereClause}
      ORDER BY ls.sale_date DESC
    `;
    
    const result = await db.query(query, params);
    res.json({ data: result.rows });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get sale by ID
router.get('/:id', auth, bondFilter, async (req, res) => {
  try {
    let whereClause = 'WHERE ls.id = $1';
    const params = [req.params.id];
    
    if (req.isDealershipManager) {
      params.push(req.bondId);
      whereClause += ` AND ls.dealership_id = $${params.length}`;
    }
    
    const result = await db.query(`
      SELECT ls.*, v.make, v.model, v.year, v.chassis_number, v.color, v.engine_cc, v.mileage,
        d.name as dealership_name,
        c.full_name as customer_name, c.phone as customer_phone, c.email as customer_email,
        c.national_id as customer_national_id, c.address as customer_address,
        (ls.selling_price_ugx - ls.amount_paid_ugx) as balance,
        (ls.selling_price_ugx - ls.total_cost_ugx) as profit
      FROM local_sales ls
      JOIN vehicles v ON ls.vehicle_id = v.id
      JOIN dealerships d ON ls.dealership_id = d.id
      JOIN customers c ON ls.customer_id = c.id
      ${whereClause}
    `, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    
    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get sales stats
router.get('/stats/summary', auth, bondFilter, async (req, res) => {
  try {
    const { period } = req.query;
    let dateFilter = '';
    
    if (period === 'week') dateFilter = "AND sale_date >= datetime('now', '-7 days')";
    if (period === 'month') dateFilter = "AND sale_date >= datetime('now', '-30 days')";
    if (period === 'year') dateFilter = "AND sale_date >= datetime('now', '-365 days')";
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (req.isDealershipManager) {
      params.push(req.bondId);
      whereClause += ` AND dealership_id = $${params.length}`;
    } else if (req.isForeignBondUser) {
      // Suppliers don't have sales
      return res.json({ data: { 
        total_sales: 0, total_revenue: 0, total_profit: 0, outstanding: 0,
        paid_count: 0, partial_count: 0, pending_count: 0 
      }});
    }
    
    const result = await db.query(`
      SELECT 
        COUNT(*) as total_sales,
        COALESCE(SUM(selling_price_ugx), 0) as total_revenue,
        COALESCE(SUM(selling_price_ugx - total_cost_ugx), 0) as total_profit,
        COALESCE(SUM(CASE WHEN payment_status != 'Paid' THEN selling_price_ugx - amount_paid_ugx ELSE 0 END), 0) as outstanding,
        SUM(CASE WHEN payment_status = 'Paid' THEN 1 ELSE 0 END) as paid_count,
        SUM(CASE WHEN payment_status = 'Partial' THEN 1 ELSE 0 END) as partial_count,
        SUM(CASE WHEN payment_status = 'Pending' THEN 1 ELSE 0 END) as pending_count
      FROM local_sales
      ${whereClause} ${dateFilter}
    `, params);
    
    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create sale
router.post('/', auth, bondFilter, async (req, res) => {
  try {
    const { 
      vehicle_id, customer_id, 
      selling_price_ugx, amount_paid_ugx, payment_method, notes
    } = req.body;
    
    // Get dealership_id from authenticated user
    const dealership_id = req.isDealershipManager ? req.bondId : req.body.dealership_id;
    
    if (!dealership_id) {
      return res.status(400).json({ error: 'dealership_id is required' });
    }
    
    // Get vehicle cost
    const vehicleResult = await db.query(
      'SELECT total_cost_ugx, status, dealership_id FROM vehicles WHERE id = $1',
      [vehicle_id]
    );
    
    if (vehicleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    
    const vehicle = vehicleResult.rows[0];
    
    // Check vehicle belongs to this dealership and is available
    if (vehicle.dealership_id !== dealership_id) {
      return res.status(403).json({ error: 'Vehicle does not belong to your dealership' });
    }
    
    if (vehicle.status !== 'In Stock') {
      return res.status(400).json({ error: 'Vehicle is not available for sale' });
    }
    
    // Generate invoice number
    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
    
    // Determine payment status
    let paymentStatus = 'Pending';
    if (amount_paid_ugx >= selling_price_ugx) paymentStatus = 'Paid';
    else if (amount_paid_ugx > 0) paymentStatus = 'Partial';
    
    const result = await db.query(
      `INSERT INTO local_sales (
        invoice_number, vehicle_id, dealership_id, customer_id,
        total_cost_ugx, selling_price_ugx, amount_paid_ugx, 
        payment_status, payment_method, notes, sale_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP) RETURNING *`,
      [invoiceNumber, vehicle_id, dealership_id, customer_id,
       vehicle.total_cost_ugx, selling_price_ugx, amount_paid_ugx, 
       paymentStatus, payment_method, notes]
    );

    // Update vehicle status to Sold
    await db.query(
      'UPDATE vehicles SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['Sold', vehicle_id]
    );

    res.status(201).json({ 
      message: 'Sale created successfully',
      data: result.rows[0] 
    });
  } catch (error) {
    console.error('Error creating sale:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Update payment
router.patch('/:id/payment', auth, async (req, res) => {
  try {
    const { amount_paid_ugx } = req.body;
    
    // Get current sale
    const saleResult = await db.query('SELECT * FROM local_sales WHERE id = $1', [req.params.id]);
    if (saleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    
    const sale = saleResult.rows[0];
    const newAmountPaid = parseFloat(sale.amount_paid_ugx) + parseFloat(amount_paid_ugx);
    
    let paymentStatus = 'Partial';
    if (newAmountPaid >= parseFloat(sale.selling_price_ugx)) paymentStatus = 'Paid';
    
    const result = await db.query(
      `UPDATE local_sales SET amount_paid_ugx = $1, payment_status = $2, updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [newAmountPaid, paymentStatus, req.params.id]
    );
    
    res.json({ data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete sale
router.delete('/:id', auth, bondFilter, async (req, res) => {
  try {
    // Get sale details
    const saleResult = await db.query(
      'SELECT vehicle_id, dealership_id FROM local_sales WHERE id = $1',
      [req.params.id]
    );
    
    if (saleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    
    const sale = saleResult.rows[0];
    
    // Check ownership for dealership managers
    if (req.isDealershipManager && sale.dealership_id !== req.bondId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Delete the sale
    await db.query('DELETE FROM local_sales WHERE id = $1', [req.params.id]);
    
    // Return vehicle to stock
    await db.query(
      'UPDATE vehicles SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['In Stock', sale.vehicle_id]
    );
    
    res.json({ message: 'Sale deleted and vehicle returned to stock' });
  } catch (error) {
    console.error('Error deleting sale:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
