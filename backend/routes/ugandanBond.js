const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// Get all Ugandan bonds
router.get('/', auth, async (req, res) => {
  try {
    const { city, status } = req.query;
    let query = `
      SELECT ub.*,
        (SELECT COUNT(*) FROM vehicles v WHERE v.ugandan_bond_id = ub.id AND v.status = 'In Stock') as in_stock_count,
        (SELECT COUNT(*) FROM import_orders io WHERE io.ugandan_bond_id = ub.id AND io.order_status NOT IN ('Delivered', 'Cancelled')) as pending_orders
      FROM ugandan_bonds ub
      WHERE 1=1
    `;
    const params = [];
    
    if (city) {
      params.push(city);
      query += ` AND ub.city = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND ub.status = $${params.length}`;
    }
    
    query += ' ORDER BY ub.name';
    const result = await db.query(query, params);
    res.json({ data: result.rows });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get Ugandan bond by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM ugandan_bonds WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ugandan bond not found' });
    }
    res.json({ data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get vehicles in Ugandan bond
router.get('/:id/vehicles', auth, async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT v.*, fb.name as foreign_bond_name, fb.country as origin_country
      FROM vehicles v
      LEFT JOIN foreign_bonds fb ON v.foreign_bond_id = fb.id
      WHERE v.ugandan_bond_id = $1
    `;
    const params = [req.params.id];
    
    if (status) {
      params.push(status);
      query += ` AND v.status = $${params.length}`;
    }
    
    query += ' ORDER BY v.created_at DESC';
    const result = await db.query(query, params);
    res.json({ data: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get orders for Ugandan bond
router.get('/:id/orders', auth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT io.*, fb.name as foreign_bond_name, fb.country as origin_country,
        (SELECT COALESCE(SUM(ov.quantity), 0) FROM order_vehicles ov WHERE ov.order_id = io.id) as vehicle_count
      FROM import_orders io
      JOIN foreign_bonds fb ON io.foreign_bond_id = fb.id
      WHERE io.ugandan_bond_id = $1
      ORDER BY io.created_at DESC
    `, [req.params.id]);
    res.json({ data: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get dashboard stats for Ugandan bond
router.get('/:id/dashboard', auth, async (req, res) => {
  try {
    const bondId = req.params.id;
    
    const inventory = db.query(`
      SELECT 
        SUM(CASE WHEN status = 'In Stock' THEN 1 ELSE 0 END) as in_stock,
        SUM(CASE WHEN status = 'In Transit' THEN 1 ELSE 0 END) as in_transit,
        SUM(CASE WHEN status = 'At Border' THEN 1 ELSE 0 END) as at_border,
        SUM(CASE WHEN status = 'Sold' THEN 1 ELSE 0 END) as sold
      FROM vehicles WHERE ugandan_bond_id = $1
    `, [bondId]);

    // Imported inventory value: vehicles linked via ugandan_bond_id (source_type = import)
    const importedValue = db.query(`
      SELECT
        COUNT(*) as total_units,
        COALESCE(SUM(CASE WHEN status != 'Sold' THEN purchase_price_usd ELSE 0 END), 0) as stock_value_usd,
        COALESCE(SUM(CASE WHEN status != 'Sold' THEN selling_price_ugx ELSE 0 END), 0) as asking_value_ugx
      FROM vehicles WHERE ugandan_bond_id = $1
    `, [bondId]);

    // Local inventory value: vehicles belonging to this dealership (source_type != import)
    const localValue = db.query(`
      SELECT
        COUNT(*) as total_units,
        COALESCE(SUM(CASE WHEN status != 'Sold' THEN acquisition_cost_ugx ELSE 0 END), 0) as cost_value_ugx,
        COALESCE(SUM(CASE WHEN status != 'Sold' THEN sale_price_ugx ELSE 0 END), 0) as asking_value_ugx
      FROM vehicles
      WHERE dealership_id = (SELECT id FROM dealerships WHERE ugandan_bond_id = $1 LIMIT 1)
        AND source_type != 'import'
    `, [bondId]);
    
    const orders = db.query(`
      SELECT 
        SUM(CASE WHEN order_status = 'Pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN order_status = 'Shipped' THEN 1 ELSE 0 END) as shipped,
        SUM(CASE WHEN order_status = 'At Border' THEN 1 ELSE 0 END) as at_border,
        SUM(CASE WHEN order_status = 'Delivered' THEN 1 ELSE 0 END) as delivered
      FROM import_orders WHERE ugandan_bond_id = $1
    `, [bondId]);
    
    const sales = db.query(`
      SELECT 
        COUNT(*) as total_sales,
        COALESCE(SUM(selling_price_ugx), 0) as total_revenue,
        COALESCE(SUM(selling_price_ugx - total_cost_ugx), 0) as total_profit
      FROM local_sales WHERE ugandan_bond_id = $1
    `, [bondId]);
    
    const pipeline = db.query(`
      SELECT order_status, COUNT(*) as count
      FROM import_orders WHERE ugandan_bond_id = $1
      GROUP BY order_status
    `, [bondId]);

    res.json({
      data: {
        inventory: inventory.rows[0],
        imported_value: importedValue.rows[0],
        local_value: localValue.rows[0],
        orders: orders.rows[0],
        sales: sales.rows[0],
        pipeline: pipeline.rows
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create Ugandan bond (admin only - for adding new subscribers)
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can add new bonds' });
    }
    
    const { name, license_number, city, address, phone, email, specialization, status } = req.body;
    const result = await db.query(
      `INSERT INTO ugandan_bonds (name, license_number, city, address, contact_phone, contact_email, specialization, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [name, license_number, city, address, phone, email, specialization || null, status || 'Active']
    );
    res.status(201).json({ 
      message: 'Ugandan bond created successfully',
      data: { id: result.lastID }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update Ugandan bond (admin only - for managing subscriptions)
router.put('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can update bonds' });
    }
    
    const { id } = req.params;
    const { name, license_number, city, address, phone, email, specialization, status } = req.body;
    
    await db.query(
      `UPDATE ugandan_bonds 
       SET name = COALESCE($1, name),
           license_number = COALESCE($2, license_number),
           city = COALESCE($3, city),
           address = COALESCE($4, address),
           contact_phone = COALESCE($5, contact_phone),
           contact_email = COALESCE($6, contact_email),
           specialization = COALESCE($7, specialization),
           status = COALESCE($8, status)
       WHERE id = $9`,
      [name, license_number, city, address, phone, email, specialization, status, id]
    );
    
    res.json({ message: 'Bond updated successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
