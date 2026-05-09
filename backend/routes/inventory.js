const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const bondFilter = require('../middleware/bondFilter');
const { checkVehicleLimit } = require('../middleware/usageLimits');

// Get all vehicles (cross-bond search)
router.get('/', auth, bondFilter, async (req, res) => {
  try {
    const { status, make, model, foreign_bond_id, search } = req.query;
    
    let query = `
      SELECT v.*, 
        fb.name as foreign_bond_name, fb.country as origin_country,
        d.name as dealership_name
      FROM vehicles v
      LEFT JOIN foreign_bonds fb ON v.foreign_bond_id = fb.id
      LEFT JOIN dealerships d ON v.dealership_id = d.id
      WHERE 1=1
    `;
    const params = [];
    
    // ROLE-BASED FILTERING
    // Suppliers can only see their own vehicles
    if (req.isForeignBondUser) {
      params.push(req.foreignBondId);
      query += ` AND v.foreign_bond_id = $${params.length} AND v.dealership_id IS NULL`;
    }
    // Dealerships see their own inventory only
    else if (req.isDealershipManager) {
      params.push(req.bondId);
      query += ` AND v.dealership_id = $${params.length}`;
    }
    // Admin sees everything (no filter)
    
    if (status) {
      params.push(status);
      query += ` AND v.status = $${params.length}`;
    }
    if (make) {
      params.push(make);
      query += ` AND v.make = $${params.length}`;
    }
    if (model) {
      params.push(model);
      query += ` AND v.model = $${params.length}`;
    }
    if (foreign_bond_id && req.isAdmin) {
      // Only admin can filter by foreign_bond_id
      params.push(foreign_bond_id);
      query += ` AND v.foreign_bond_id = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (v.chassis_number ILIKE $${params.length} OR v.make ILIKE $${params.length} OR v.model ILIKE $${params.length})`;
    }
    
    query += ' ORDER BY v.created_at DESC LIMIT 100';
    const result = await db.query(query, params);
    res.json({ data: result.rows });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get vehicle by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT v.*, 
        fb.name as foreign_bond_name, fb.country as origin_country,
        d.name as dealership_name
      FROM vehicles v
      LEFT JOIN foreign_bonds fb ON v.foreign_bond_id = fb.id
      LEFT JOIN dealerships d ON v.dealership_id = d.id
      WHERE v.id = $1
    `, [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    res.json({ data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get vehicle history
router.get('/:id/history', auth, async (req, res) => {
  try {
    const vehicleId = req.params.id;
    
    // Get vehicle details
    const vehicleResult = await db.query(`
      SELECT v.*, fb.name as foreign_bond_name, d.name as dealership_name
      FROM vehicles v
      LEFT JOIN foreign_bonds fb ON v.foreign_bond_id = fb.id
      LEFT JOIN dealerships d ON v.dealership_id = d.id
      WHERE v.id = $1
    `, [vehicleId]);
    
    if (vehicleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    
    // Get order info
    const orderResult = await db.query(`
      SELECT io.*, fb.name as foreign_bond_name
      FROM order_vehicles ov
      JOIN import_orders io ON ov.order_id = io.id
      JOIN foreign_bonds fb ON io.foreign_bond_id = fb.id
      WHERE ov.vehicle_id = $1
    `, [vehicleId]);
    
    // Get shipping info
    let shippingResult = { rows: [] };
    if (orderResult.rows.length > 0) {
      shippingResult = await db.query(
        'SELECT * FROM shipping WHERE order_id = $1',
        [orderResult.rows[0].id]
      );
    }
    
    // Get border clearance
    let clearanceResult = { rows: [] };
    if (orderResult.rows.length > 0) {
      clearanceResult = await db.query(
        'SELECT * FROM border_clearance WHERE order_id = $1',
        [orderResult.rows[0].id]
      );
    }
    
    // Get tax info
    const taxResult = await db.query(
      'SELECT * FROM vehicle_taxes WHERE vehicle_id = $1',
      [vehicleId]
    );
    
    // Get sale info
    const saleResult = await db.query(`
      SELECT ls.*, c.full_name as customer_name
      FROM local_sales ls
      JOIN customers c ON ls.customer_id = c.id
      WHERE ls.vehicle_id = $1
    `, [vehicleId]);
    
    res.json({
      data: {
        vehicle: vehicleResult.rows[0],
        order: orderResult.rows[0] || null,
        shipping: shippingResult.rows[0] || null,
        clearance: clearanceResult.rows[0] || null,
        taxes: taxResult.rows[0] || null,
        sale: saleResult.rows[0] || null
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Search by chassis number
router.get('/search/chassis/:chassis', auth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT v.*, fb.name as foreign_bond_name, d.name as dealership_name
      FROM vehicles v
      LEFT JOIN foreign_bonds fb ON v.foreign_bond_id = fb.id
      LEFT JOIN dealerships d ON v.dealership_id = d.id
      WHERE v.chassis_number ILIKE $1
    `, [`%${req.params.chassis}%`]);
    res.json({ data: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get available makes
router.get('/meta/makes', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT DISTINCT make FROM vehicles ORDER BY make');
    res.json({ data: result.rows.map(r => r.make) });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create vehicle (with usage limit check)
router.post('/', auth, checkVehicleLimit, async (req, res) => {
  try {
    const { 
      chassis_number, make, model, year, color, engine_cc, mileage,
      fuel_type, transmission, body_type, foreign_bond_id, purchase_price_usd
    } = req.body;
    
    const result = await db.query(
      `INSERT INTO vehicles (
        chassis_number, make, model, year, color, engine_cc, mileage,
        fuel_type, transmission, body_type, foreign_bond_id, purchase_price_usd, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'Available') RETURNING *`,
      [chassis_number, make, model, year, color, engine_cc, mileage,
       fuel_type, transmission, body_type, foreign_bond_id, purchase_price_usd]
    );
    
    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update vehicle
router.patch('/:id', auth, async (req, res) => {
  try {
    const { status, dealership_id, image_url } = req.body;
    
    let updates = ['updated_at = NOW()'];
    const params = [];
    
    if (status) {
      params.push(status);
      updates.push(`status = $${params.length}`);
    }
    if (dealership_id) {
      params.push(dealership_id);
      updates.push(`dealership_id = $${params.length}`);
    }
    if (image_url !== undefined) {
      params.push(image_url);
      updates.push(`image_url = $${params.length}`);
    }
    
    params.push(req.params.id);
    const result = await db.query(
      `UPDATE vehicles SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    
    await db.saveDb();
    
    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Error updating vehicle:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// ========== FOREIGN BOND USER (SUPPLIER) ROUTES ==========

// Get my vehicles (for suppliers)
router.get('/my/vehicles', auth, bondFilter, async (req, res) => {
  try {
    if (req.user.role !== 'foreign_bond_user') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const result = await db.query(`
      SELECT v.*, 
        fb.name as foreign_bond_name, 
        fb.country as origin_country
      FROM vehicles v
      LEFT JOIN foreign_bonds fb ON v.foreign_bond_id = fb.id
      WHERE v.foreign_bond_id = $1
      ORDER BY v.created_at DESC
    `, [req.user.foreign_bond_id]);
    
    res.json({ data: result.rows });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add vehicle (for suppliers)
router.post('/my/vehicles', auth, bondFilter, async (req, res) => {
  try {
    if (req.user.role !== 'foreign_bond_user') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const {
      chassis_number, make, model, year, color, engine_cc, fuel_type,
      transmission, mileage, purchase_price, sale_price, quantity, notes, body_type
    } = req.body;
    
    const result = await db.query(`
      INSERT INTO vehicles (
        foreign_bond_id, chassis_number, make, model, year, color,
        engine_cc, fuel_type, transmission, body_type, mileage, 
        purchase_price_usd, sale_price_usd, quantity, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'Available')
      RETURNING *
    `, [
      req.user.foreign_bond_id, chassis_number, make, model, year, color,
      engine_cc, fuel_type, transmission, body_type || null, mileage,
      purchase_price, // What supplier paid
      sale_price,     // What supplier is selling for
      quantity || 1
    ]);
    
    await db.saveDb();
    res.json({ data: result.rows[0], message: 'Vehicle added successfully' });
  } catch (error) {
    console.error('Error adding vehicle:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Update my vehicle (for suppliers)
router.put('/my/vehicles/:id', auth, bondFilter, async (req, res) => {
  try {
    if (req.user.role !== 'foreign_bond_user') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const vehicleId = req.params.id;
    
    // Check ownership
    const checkResult = await db.query(
      'SELECT id FROM vehicles WHERE id = $1 AND foreign_bond_id = $2',
      [vehicleId, req.user.foreign_bond_id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found or access denied' });
    }
    
    const {
      chassis_number, make, model, year, color, engine_cc, fuel_type,
      transmission, mileage, purchase_price, sale_price, quantity, notes, body_type, status
    } = req.body;
    
    const result = await db.query(`
      UPDATE vehicles SET
        chassis_number = $1, make = $2, model = $3, year = $4, color = $5,
        engine_cc = $6, fuel_type = $7, transmission = $8, body_type = $9, 
        mileage = $10, purchase_price_usd = $11, sale_price_usd = $12, 
        quantity = $13, status = $14
      WHERE id = $15 AND foreign_bond_id = $16
      RETURNING *
    `, [
      chassis_number, make, model, year, color, engine_cc, fuel_type,
      transmission, body_type || null, mileage, purchase_price, sale_price,
      quantity || 1, status || 'Available', vehicleId, req.user.foreign_bond_id
    ]);
    
    await db.saveDb();
    res.json({ data: result.rows[0], message: 'Vehicle updated successfully' });
  } catch (error) {
    console.error('Error updating vehicle:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Delete vehicle (for suppliers)
router.delete('/my/vehicles/:id', auth, bondFilter, async (req, res) => {
  try {
    if (req.user.role !== 'foreign_bond_user') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const vehicleId = req.params.id;
    
    // Check ownership and if vehicle can be deleted
    const checkResult = await db.query(
      'SELECT id, status FROM vehicles WHERE id = $1 AND foreign_bond_id = $2',
      [vehicleId, req.user.foreign_bond_id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found or access denied' });
    }
    
    const vehicle = checkResult.rows[0];
    
    // Don't allow deletion if vehicle is ordered or in transit
    if (vehicle.status && vehicle.status.toLowerCase() === 'ordered') {
      return res.status(400).json({ error: 'Cannot delete vehicle that has been ordered. Please contact support.' });
    }
    
    // Delete the vehicle
    await db.query('DELETE FROM vehicles WHERE id = $1', [vehicleId]);
    await db.saveDb();
    
    res.json({ message: 'Vehicle deleted successfully' });
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get orders for my vehicles (for suppliers)
router.get('/my/orders', auth, bondFilter, async (req, res) => {
  try {
    if (req.user.role !== 'foreign_bond_user') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get orders for this foreign bond's vehicles
    const result = await db.query(`
      SELECT 
        io.id,
        io.order_number,
        io.order_status as status,
        io.total_amount_usd as total_value,
        io.created_at as order_date,
        d.name as dealership_name,
        fb.name as bond_name,
        COUNT(DISTINCT ov.vehicle_id) as vehicle_count
      FROM import_orders io
      LEFT JOIN dealerships d ON io.dealership_id = d.id
      LEFT JOIN foreign_bonds fb ON io.foreign_bond_id = fb.id
      LEFT JOIN order_vehicles ov ON io.id = ov.order_id
      WHERE io.foreign_bond_id = $1
      GROUP BY io.id, io.order_number, io.order_status, io.total_amount_usd, io.created_at, d.name, fb.name
      ORDER BY io.created_at DESC
    `, [req.foreignBondId]);
    
    res.json({ data: result.rows });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
