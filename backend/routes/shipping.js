const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const bondFilter = require('../middleware/bondFilter');
const emailService = require('../services/emailService');

// Get all shipments
router.get('/', auth, bondFilter, async (req, res) => {
  try {
    const { status, vessel_name } = req.query;
    let query = `
      SELECT s.*, io.order_number,
        fb.name as foreign_bond_name, fb.country as origin_country,
        d.name as dealership_name,
        (SELECT COUNT(DISTINCT vehicle_id) FROM order_vehicles ov WHERE ov.order_id = s.order_id) as vehicle_count
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
    const result = await db.query(`
      SELECT s.*, io.order_number,
        fb.name as foreign_bond_name, fb.country as origin_country,
        d.name as dealership_name
      FROM shipping s
      JOIN import_orders io ON s.order_id = io.id
      JOIN foreign_bonds fb ON io.foreign_bond_id = fb.id
      LEFT JOIN dealerships d ON io.dealership_id = d.id
      WHERE s.id = $1
    `, [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shipment not found' });
    }
    res.json({ data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Search by BL number
router.get('/search/bl/:blNumber', auth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT s.*, io.order_number,
        fb.name as foreign_bond_name, d.name as dealership_name
      FROM shipping s
      JOIN import_orders io ON s.order_id = io.id
      JOIN foreign_bonds fb ON io.foreign_bond_id = fb.id
      LEFT JOIN dealerships d ON io.dealership_id = d.id
      WHERE s.bl_number ILIKE $1
    `, [`%${req.params.blNumber}%`]);
    res.json({ data: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create shipment
router.post('/', auth, async (req, res) => {
  try {
    const { order_id, bl_number, container_number, vessel_name, departure_port, arrival_port, departure_date, estimated_arrival } = req.body;
    
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
        const dealershipQuery = await db.query('SELECT id, name, email FROM dealerships WHERE id = $1', [order.dealership_id]);
        const dealership = dealershipQuery.rows[0];
        if (dealership && dealership.email) {
          await emailService.sendOrderShipped(order, result.rows[0], dealership, dealership.email);
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
