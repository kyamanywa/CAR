const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const bondFilter = require('../middleware/bondFilter');
const { getUsdToUgxRate } = require('../config/currency');
const auditLog = require('../middleware/auditLog');

// Get all local sales
router.get('/', auth, bondFilter, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return res.status(403).json({ error: 'Platform admin cannot access tenant sales data' });
    }

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
    if (req.user.role === 'admin') {
      return res.status(403).json({ error: 'Platform admin cannot access tenant sales data' });
    }

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
    if (req.user.role === 'admin') {
      return res.status(403).json({ error: 'Platform admin cannot access tenant sales data' });
    }

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
router.post('/', auth, bondFilter, auditLog('local_sales'), async (req, res) => {
  try {
    if (!req.isDealershipManager) {
      return res.status(403).json({ error: 'Only dealership users can create sales' });
    }

    const { 
      vehicle_id, customer_id, 
      selling_price_ugx, amount_paid_ugx, notes,
      discount_ugx, trade_in_vehicle, trade_in_value_ugx, salesperson_name,
      quantity
    } = req.body;

    if (!vehicle_id || !customer_id || selling_price_ugx == null) {
      return res.status(400).json({ error: 'vehicle_id, customer_id and selling_price_ugx are required' });
    }
    
    // Get dealership_id from authenticated user
    const dealership_id = req.isDealershipManager ? req.bondId : req.body.dealership_id;
    
    if (!dealership_id) {
      return res.status(400).json({ error: 'dealership_id is required' });
    }
    
    // Get vehicle cost and quantity
    const vehicleResult = await db.query(
      'SELECT purchase_price_usd, status, dealership_id, quantity FROM vehicles WHERE id = $1',
      [vehicle_id]
    );
    
    if (vehicleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    
    const vehicle = vehicleResult.rows[0];
    const vehicleDealershipId = vehicle.dealership_id != null ? Number(vehicle.dealership_id) : null;
    const authDealershipId = dealership_id != null ? Number(dealership_id) : null;
    
    // Check vehicle belongs to this dealership and is available
    if (vehicleDealershipId !== authDealershipId) {
      return res.status(403).json({ error: 'Vehicle does not belong to your dealership' });
    }
    
    const AVAILABLE_STATUSES = ['In Stock', 'Available'];
    if (!AVAILABLE_STATUSES.includes(vehicle.status)) {
      return res.status(400).json({ error: 'Vehicle is not available for sale' });
    }
    
    // Check quantity
    const saleQuantity = parseInt(quantity) || 1;
    const currentQuantity = parseInt(vehicle.quantity) || 0;
    
    if (saleQuantity > currentQuantity) {
      return res.status(400).json({ error: `Only ${currentQuantity} units available` });
    }
    
    // Generate invoice number
    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
    
    // Calculate totals: unit_price × quantity
    const unitPrice = parseFloat(selling_price_ugx);
    const totalSellingPrice = unitPrice * saleQuantity;
    const discountAmt = parseFloat(discount_ugx) || 0;
    const tradeInAmt = parseFloat(trade_in_value_ugx) || 0;
    const finalPrice = totalSellingPrice - discountAmt - tradeInAmt;
    
    // Determine payment status
    let paymentStatus = 'Pending';
    if (amount_paid_ugx >= finalPrice) paymentStatus = 'Paid';
    else if (amount_paid_ugx > 0) paymentStatus = 'Partial';

    // Fallback conversion so profits/stats remain usable when vehicles don't store UGX cost.
    const totalCostUgx = (parseFloat(vehicle.purchase_price_usd) || 0) * getUsdToUgxRate() * saleQuantity;
    
    const result = await db.query(
      `INSERT INTO local_sales (
        invoice_number, vehicle_id, dealership_id, customer_id,
        total_cost_ugx, selling_price_ugx, unit_price_ugx, amount_paid_ugx, 
        payment_status, notes, sale_date,
        discount_ugx, trade_in_vehicle, trade_in_value_ugx, salesperson_name, quantity
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, $11, $12, $13, $14, $15) RETURNING *`,
      [invoiceNumber, vehicle_id, dealership_id, customer_id,
       totalCostUgx, totalSellingPrice, unitPrice, amount_paid_ugx, 
       paymentStatus, notes,
       discountAmt, trade_in_vehicle || null, tradeInAmt, salesperson_name || null, saleQuantity]
    );

    // Decrease vehicle quantity
    const newQuantity = currentQuantity - saleQuantity;
    const newStatus = newQuantity <= 0 ? 'Sold' : vehicle.status;
    
    await db.query(
      'UPDATE vehicles SET quantity = $1, status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [newQuantity, newStatus, vehicle_id]
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
    if (req.user.role !== 'dealership_manager') {
      return res.status(403).json({ error: 'Only dealership users can update sale payments' });
    }

    const { amount_paid_ugx } = req.body;
    
    // Get current sale
    const saleResult = await db.query('SELECT * FROM local_sales WHERE id = $1', [req.params.id]);
    if (saleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    
    const sale = saleResult.rows[0];

    if (sale.dealership_id !== req.user.dealership_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

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
    // Get sale details including quantity
    const saleResult = await db.query(
      'SELECT vehicle_id, dealership_id, quantity FROM local_sales WHERE id = $1',
      [req.params.id]
    );
    
    if (saleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    
    const sale = saleResult.rows[0];
    const saleQuantity = parseInt(sale.quantity) || 1;
    
    // Check ownership for dealership managers
    if (req.isDealershipManager && sale.dealership_id !== req.bondId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get current vehicle quantity
    const vehicleResult = await db.query(
      'SELECT quantity, status FROM vehicles WHERE id = $1',
      [sale.vehicle_id]
    );
    
    if (vehicleResult.rows.length > 0) {
      const currentQuantity = parseInt(vehicleResult.rows[0].quantity) || 0;
      const newQuantity = currentQuantity + saleQuantity;
      
      // If vehicle was sold out, return to available status
      const newStatus = vehicleResult.rows[0].status === 'Sold' ? 'Available' : vehicleResult.rows[0].status;
      
      // Return quantity to stock
      await db.query(
        'UPDATE vehicles SET quantity = $1, status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        [newQuantity, newStatus, sale.vehicle_id]
      );
    }
    
    // Delete the sale
    await db.query('DELETE FROM local_sales WHERE id = $1', [req.params.id]);
    
    res.json({ message: 'Sale deleted and vehicle quantity returned to stock' });
  } catch (error) {
    console.error('Error deleting sale:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
