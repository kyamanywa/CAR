const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const bondFilter = require('../middleware/bondFilter');
const emailService = require('../services/emailService');

// Get all shipments
router.get('/', auth, bondFilter, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return res.status(403).json({ error: 'Platform admin cannot access subscriber operational shipping data' });
    }

    const { status, vessel_name } = req.query;
    let query = `
      SELECT s.*, io.order_number,
        fb.name as foreign_bond_name, fb.country as origin_country,
        d.name as dealership_name,
        (SELECT COALESCE(SUM(ov.quantity), 0) FROM order_vehicles ov WHERE ov.order_id = s.order_id) as vehicle_count
      FROM shipping s
      JOIN import_orders io ON s.order_id = io.id
      JOIN foreign_bonds fb ON io.foreign_bond_id = fb.id
      LEFT JOIN dealerships d ON io.dealership_id = d.id
      WHERE 1=1
    `;
    const params = [];
    
    // Role-based filtering
    if (req.isDealershipManager) {
      params.push(req.bondId);
      query += ` AND d.id = $${params.length}`;
    } else if (req.isForeignBondUser) {
      params.push(req.foreignBondId);
      query += ` AND fb.id = $${params.length}`;
    }
    
    if (status) {
      params.push(status);
      query += ` AND s.shipping_status = $${params.length}`;
    }
    if (vessel_name) {
      params.push(`%${vessel_name}%`);
      query += ` AND s.vessel_name ILIKE $${params.length}`;
    }
    
    query += ' ORDER BY s.departure_date DESC';
    const result = await db.query(query, params);
    res.json({ data: result.rows });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get shipment by ID
router.get('/:id', auth, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return res.status(403).json({ error: 'Platform admin cannot access subscriber operational shipping data' });
    }

    const result = await db.query(`
      SELECT s.*, io.order_number,
        fb.id as foreign_bond_id, fb.name as foreign_bond_name, fb.country as origin_country,
        d.id as dealership_id, d.name as dealership_name
      FROM shipping s
      JOIN import_orders io ON s.order_id = io.id
      JOIN foreign_bonds fb ON io.foreign_bond_id = fb.id
      LEFT JOIN dealerships d ON io.dealership_id = d.id
      WHERE s.id = $1
    `, [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    const shipment = result.rows[0];
    if (req.user.role === 'dealership_manager' && req.user.dealership_id !== shipment.dealership_id) {
      return res.status(403).json({ error: 'Access denied to this shipment' });
    }
    if (req.user.role === 'foreign_bond_user' && req.user.foreign_bond_id !== shipment.foreign_bond_id) {
      return res.status(403).json({ error: 'Access denied to this shipment' });
    }
    res.json({ data: shipment });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Search by BL number
router.get('/search/bl/:blNumber', auth, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return res.status(403).json({ error: 'Platform admin cannot access subscriber operational shipping data' });
    }

    const result = await db.query(`
      SELECT s.*, io.order_number,
        fb.id as foreign_bond_id, fb.name as foreign_bond_name,
        d.id as dealership_id, d.name as dealership_name
      FROM shipping s
      JOIN import_orders io ON s.order_id = io.id
      JOIN foreign_bonds fb ON io.foreign_bond_id = fb.id
      LEFT JOIN dealerships d ON io.dealership_id = d.id
      WHERE s.bl_number ILIKE $1
    `, [`%${req.params.blNumber}%`]);

    let rows = result.rows;
    if (req.user.role === 'dealership_manager') {
      rows = rows.filter(r => r.dealership_id === req.user.dealership_id);
    }
    if (req.user.role === 'foreign_bond_user') {
      rows = rows.filter(r => r.foreign_bond_id === req.user.foreign_bond_id);
    }

    res.json({ data: rows });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create shipment
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'foreign_bond_user') {
      return res.status(403).json({ error: 'Only supplier can create shipping records' });
    }

    const { order_id, bl_number, container_number, vessel_name, departure_port, arrival_port, departure_date, estimated_arrival } = req.body;

    const orderCheck = await db.query('SELECT id, foreign_bond_id FROM import_orders WHERE id = $1', [order_id]);
    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (orderCheck.rows[0].foreign_bond_id !== req.user.foreign_bond_id) {
      return res.status(403).json({ error: 'You can only create shipping records for your own orders' });
    }
    
    const result = await db.query(
      `INSERT INTO shipping (order_id, bl_number, container_number, vessel_name, departure_port, arrival_port, departure_date, estimated_arrival, shipping_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Pending') RETURNING *`,
      [order_id, bl_number, container_number, vessel_name, departure_port, arrival_port, departure_date, estimated_arrival]
    );

    // Update order status
    await db.query('UPDATE import_orders SET order_status = $1 WHERE id = $2', ['Shipped', order_id]);

    // Send shipment notification
    try {
      const orderQuery = await db.query('SELECT * FROM import_orders WHERE id = $1', [order_id]);
      const order = orderQuery.rows[0];
      if (order) {
        const dealershipQuery = await db.query('SELECT id, name, contact_email FROM dealerships WHERE id = $1', [order.dealership_id]);
        const dealership = dealershipQuery.rows[0];
        if (dealership && dealership.contact_email) {
          await emailService.sendOrderShipped(order, result.rows[0], dealership, dealership.contact_email);
        }
      }
    } catch (emailError) {
      console.error('Email notification error:', emailError);
    }

    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update shipment status
router.patch('/:id/status', auth, async (req, res) => {
  try {
    if (req.user.role !== 'foreign_bond_user') {
      return res.status(403).json({ error: 'Only supplier can update shipping status' });
    }

    const shipmentCheck = await db.query(
      `SELECT s.id, io.foreign_bond_id
       FROM shipping s
       JOIN import_orders io ON io.id = s.order_id
       WHERE s.id = $1`,
      [req.params.id]
    );

    if (shipmentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    if (shipmentCheck.rows[0].foreign_bond_id !== req.user.foreign_bond_id) {
      return res.status(403).json({ error: 'You can only update your own shipping records' });
    }

    const { status, actual_arrival } = req.body;
    let query = 'UPDATE shipping SET shipping_status = $1, updated_at = NOW()';
    const params = [status];
    
    if (actual_arrival) {
      params.push(actual_arrival);
      query += `, actual_arrival = $${params.length}`;
    }
    
    params.push(req.params.id);
    query += ` WHERE id = $${params.length} RETURNING *`;
    
    const result = await db.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    res.json({ data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
