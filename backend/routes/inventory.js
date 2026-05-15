const express = require('express');
const router = express.Router();
const db = require('../db');
const { getCurrentRate } = require('./exchangeRates');
const auth = require('../middleware/auth');
const bondFilter = require('../middleware/bondFilter');
const { checkVehicleLimit } = require('../middleware/usageLimits');
const auditLog = require('../middleware/auditLog');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ---- Vehicle image upload (multer) ----
const vehicleImagesDir = path.join(__dirname, '../uploads/vehicles');
if (!fs.existsSync(vehicleImagesDir)) fs.mkdirSync(vehicleImagesDir, { recursive: true });

const vehicleImageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, vehicleImagesDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `vehicle_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
  }
});

const vehicleImageUpload = multer({
  storage: vehicleImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Only jpg, jpeg, png, or webp images are allowed'));
    }
  }
});

// POST /inventory/upload-image  — upload one vehicle photo, returns URL
router.post('/upload-image', auth, vehicleImageUpload.single('image'), (req, res) => {
  if (!['foreign_bond_user', 'dealership_manager'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Only suppliers and dealership managers can upload vehicle images' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'No image file provided' });
  }
  const imageUrl = `/uploads/vehicles/${req.file.filename}`;
  res.json({ data: { image_url: imageUrl } });
});

// Get all vehicles (cross-bond search)
router.get('/', auth, bondFilter, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return res.status(403).json({ error: 'Platform admin cannot access tenant inventory data' });
    }

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
      query += ` AND v.foreign_bond_id = $${params.length}`;
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
    if (req.user.role === 'admin') {
      return res.status(403).json({ error: 'Platform admin cannot access tenant inventory data' });
    }

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

    const vehicle = result.rows[0];
    if ((req.user.role === 'dealership_manager' || req.user.role === 'dealership_sales') && vehicle.dealership_id !== req.user.dealership_id) {
      return res.status(403).json({ error: 'Access denied to this vehicle' });
    }
    if (req.user.role === 'foreign_bond_user' && vehicle.foreign_bond_id !== req.user.foreign_bond_id) {
      return res.status(403).json({ error: 'Access denied to this vehicle' });
    }
    res.json({ data: vehicle });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get vehicle history
router.get('/:id/history', auth, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return res.status(403).json({ error: 'Platform admin cannot access tenant inventory data' });
    }

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

    const vehicle = vehicleResult.rows[0];
    if ((req.user.role === 'dealership_manager' || req.user.role === 'dealership_sales') && vehicle.dealership_id !== req.user.dealership_id) {
      return res.status(403).json({ error: 'Access denied to this vehicle history' });
    }
    if (req.user.role === 'foreign_bond_user' && vehicle.foreign_bond_id !== req.user.foreign_bond_id) {
      return res.status(403).json({ error: 'Access denied to this vehicle history' });
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
    if (req.user.role === 'admin') {
      return res.status(403).json({ error: 'Platform admin cannot access tenant inventory data' });
    }

    const result = await db.query(`
      SELECT v.*, fb.name as foreign_bond_name, d.name as dealership_name
      FROM vehicles v
      LEFT JOIN foreign_bonds fb ON v.foreign_bond_id = fb.id
      LEFT JOIN dealerships d ON v.dealership_id = d.id
      WHERE v.chassis_number ILIKE $1
    `, [`%${req.params.chassis}%`]);

    let rows = result.rows;
    if (req.user.role === 'dealership_manager' || req.user.role === 'dealership_sales') {
      rows = rows.filter(v => v.dealership_id === req.user.dealership_id);
    }
    if (req.user.role === 'foreign_bond_user') {
      rows = rows.filter(v => v.foreign_bond_id === req.user.foreign_bond_id);
    }

    res.json({ data: rows });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get available makes
router.get('/meta/makes', auth, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return res.status(403).json({ error: 'Platform admin cannot access tenant inventory data' });
    }

    let query = 'SELECT DISTINCT make FROM vehicles';
    const params = [];
    if (req.user.role === 'dealership_manager' || req.user.role === 'dealership_sales') {
      params.push(req.user.dealership_id);
      query += ' WHERE dealership_id = $1';
    }
    if (req.user.role === 'foreign_bond_user') {
      params.push(req.user.foreign_bond_id);
      query += ' WHERE foreign_bond_id = $1';
    }
    query += ' ORDER BY make';

    const result = await db.query(query, params);
    res.json({ data: result.rows.map(r => r.make) });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create vehicle (with usage limit check)
router.post('/', auth, checkVehicleLimit, auditLog('vehicles'), async (req, res) => {
  try {
    if (req.user.role !== 'foreign_bond_user') {
      return res.status(403).json({ error: 'Only supplier can create inventory vehicles' });
    }

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
       fuel_type, transmission, body_type, req.user.foreign_bond_id, purchase_price_usd]
    );
    
    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update vehicle
router.patch('/:id', auth, auditLog('vehicles'), async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    if (!isAdmin && !['foreign_bond_user', 'dealership_manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const ownershipResult = await db.query('SELECT id, foreign_bond_id, dealership_id FROM vehicles WHERE id = $1', [req.params.id]);
    if (ownershipResult.rows.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    const vehicle = ownershipResult.rows[0];
    if (!isAdmin) {
      if (req.user.role === 'foreign_bond_user' && vehicle.foreign_bond_id !== req.user.foreign_bond_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      if (req.user.role === 'dealership_manager' && vehicle.dealership_id !== req.user.dealership_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

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

// Admin bulk delete vehicle by id
router.delete('/:id', auth, auditLog('vehicles'), async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const result = await db.query('DELETE FROM vehicles WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Vehicle not found' });
    await db.saveDb();
    res.json({ message: 'Vehicle deleted' });
  } catch (error) {
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
      transmission, mileage, purchase_price, sale_price, quantity, notes, body_type, image_url
    } = req.body;
    
    const result = await db.query(`
      INSERT INTO vehicles (
        foreign_bond_id, chassis_number, make, model, year, color,
        engine_cc, fuel_type, transmission, body_type, mileage, 
        purchase_price_usd, sale_price_usd, quantity, status, image_url
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'Available', $15)
      RETURNING *
    `, [
      req.user.foreign_bond_id, chassis_number, make, model, year, color,
      engine_cc, fuel_type, transmission, body_type || null, mileage,
      purchase_price, // What supplier paid
      sale_price,     // What supplier is selling for
      quantity || 1,
      image_url || null
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
      transmission, mileage, purchase_price, sale_price, quantity, notes, body_type, status, image_url
    } = req.body;
    
    const result = await db.query(`
      UPDATE vehicles SET
        chassis_number = $1, make = $2, model = $3, year = $4, color = $5,
        engine_cc = $6, fuel_type = $7, transmission = $8, body_type = $9, 
        mileage = $10, purchase_price_usd = $11, sale_price_usd = $12, 
        quantity = $13, status = $14, image_url = $15
      WHERE id = $16 AND foreign_bond_id = $17
      RETURNING *
    `, [
      chassis_number, make, model, year, color, engine_cc, fuel_type,
      transmission, body_type || null, mileage, purchase_price, sale_price,
      quantity || 1, status || 'Available', image_url !== undefined ? image_url : null,
      vehicleId, req.user.foreign_bond_id
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

// ========== DEALERSHIP (LOCAL ACQUISITION) ROUTES ==========

// Get dealership's own locally acquired vehicles
router.get('/dealership/vehicles', auth, async (req, res) => {
  try {
    if (req.user.role !== 'dealership_manager') {
      return res.status(403).json({ error: 'Access denied' });
    }
    const result = await db.query(`
      SELECT v.*
      FROM vehicles v
      WHERE v.dealership_id = $1 AND v.source_type != 'import'
      ORDER BY v.created_at DESC
    `, [req.user.dealership_id]);
    res.json({ data: result.rows });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add locally acquired vehicle (dealership)
router.post('/dealership/vehicles', auth, checkVehicleLimit, async (req, res) => {
  try {
    if (req.user.role !== 'dealership_manager') {
      return res.status(403).json({ error: 'Access denied' });
    }
    const {
      chassis_number, make, model, year, color, engine_cc, fuel_type,
      transmission, body_type, mileage, acquisition_cost_ugx, sale_price_ugx,
      acquisition_source, source_type, condition, notes, image_url, quantity
    } = req.body;

    if (!chassis_number || !make || !model) {
      return res.status(400).json({ error: 'chassis_number, make, and model are required' });
    }

    const result = await db.query(`
      INSERT INTO vehicles (
        dealership_id, chassis_number, make, model, year, color,
        engine_cc, fuel_type, transmission, body_type, mileage,
        acquisition_cost_ugx, sale_price_usd, source_type,
        acquisition_source, condition, notes, image_url, status, quantity
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,'Available',$19)
      RETURNING *
    `, [
      req.user.dealership_id, chassis_number, make, model, year || null, color || null,
      engine_cc || null, fuel_type || null, transmission || null, body_type || null, mileage || null,
      acquisition_cost_ugx || null,
      sale_price_ugx ? (sale_price_ugx / (await getCurrentRate())) : null,
      source_type || 'local_purchase',
      acquisition_source || null, condition || 'Good', notes || null, image_url || null,
      parseInt(quantity) || 1
    ]);

    await db.saveDb();
    res.status(201).json({ data: result.rows[0], message: 'Vehicle added successfully' });
  } catch (error) {
    console.error('Error adding dealership vehicle:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Update dealership locally acquired vehicle
router.put('/dealership/vehicles/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'dealership_manager') {
      return res.status(403).json({ error: 'Access denied' });
    }
    const vehicleId = req.params.id;
    const check = await db.query(
      'SELECT id FROM vehicles WHERE id = $1 AND dealership_id = $2',
      [vehicleId, req.user.dealership_id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found or access denied' });
    }

    const {
      chassis_number, make, model, year, color, engine_cc, fuel_type,
      transmission, body_type, mileage, acquisition_cost_ugx, sale_price_ugx,
      acquisition_source, source_type, condition, notes, image_url, status, quantity
    } = req.body;

    const result = await db.query(`
      UPDATE vehicles SET
        chassis_number=$1, make=$2, model=$3, year=$4, color=$5,
        engine_cc=$6, fuel_type=$7, transmission=$8, body_type=$9, mileage=$10,
        acquisition_cost_ugx=$11, sale_price_usd=$12,
        source_type=$13, acquisition_source=$14, condition=$15, notes=$16,
        image_url=$17, status=$18, quantity=$19
      WHERE id=$20 AND dealership_id=$21
      RETURNING *
    `, [
      chassis_number, make, model, year || null, color || null,
      engine_cc || null, fuel_type || null, transmission || null, body_type || null, mileage || null,
      acquisition_cost_ugx || null,
      sale_price_ugx ? (sale_price_ugx / (await getCurrentRate())) : null,
      source_type || 'local_purchase',
      acquisition_source || null, condition || 'Good', notes || null,
      image_url !== undefined ? image_url : null,
      status || 'Available',
      parseInt(quantity) || 1,
      vehicleId, req.user.dealership_id
    ]);

    await db.saveDb();
    res.json({ data: result.rows[0], message: 'Vehicle updated successfully' });
  } catch (error) {
    console.error('Error updating dealership vehicle:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Delete dealership locally acquired vehicle
router.delete('/dealership/vehicles/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'dealership_manager') {
      return res.status(403).json({ error: 'Access denied' });
    }
    const vehicleId = req.params.id;
    const check = await db.query(
      'SELECT id, status FROM vehicles WHERE id = $1 AND dealership_id = $2',
      [vehicleId, req.user.dealership_id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found or access denied' });
    }
    if (check.rows[0].status === 'Sold') {
      return res.status(400).json({ error: 'Cannot delete a sold vehicle' });
    }
    await db.query('DELETE FROM vehicles WHERE id = $1', [vehicleId]);
    await db.saveDb();
    res.json({ message: 'Vehicle deleted successfully' });
  } catch (error) {
    console.error('Error deleting dealership vehicle:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
