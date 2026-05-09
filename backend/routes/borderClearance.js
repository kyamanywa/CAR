const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const bondFilter = require('../middleware/bondFilter');

// Get all border clearances
router.get('/', auth, bondFilter, async (req, res) => {
  try {
    const { status, border_point } = req.query;
    let query = `
      SELECT bc.*, io.order_number, s.bl_number, s.container_number,
        fb.name as foreign_bond_name, fb.country as origin_country,
        d.name as dealership_name,
        (SELECT COUNT(*) FROM order_vehicles ov WHERE ov.order_id = bc.order_id) as vehicle_count
      FROM border_clearance bc
      JOIN import_orders io ON bc.order_id = io.id
      JOIN foreign_bonds fb ON io.foreign_bond_id = fb.id
      JOIN dealerships d ON io.dealership_id = d.id
      LEFT JOIN shipping s ON s.order_id = io.id
      WHERE 1=1
    `;
    const params = [];
    
    // Dealership manager filter
    if (req.isDealershipManager) {
      params.push(req.bondId);
      query += ` AND d.id = $${params.length}`;
    }
    
    if (status) {
      params.push(status);
      query += ` AND bc.clearance_status = $${params.length}`;
    }
    if (border_point) {
      params.push(border_point);
      query += ` AND bc.border_point = $${params.length}`;
    }
    
    query += ' ORDER BY bc.created_at DESC';
    const result = await db.query(query, params);
    res.json({ data: result.rows });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get clearance by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT bc.*, io.order_number,
        fb.name as foreign_bond_name, d.name as dealership_name,
        vt.total_tax_ugx, vt.import_duty_ugx, vt.vat_ugx
      FROM border_clearance bc
      JOIN import_orders io ON bc.order_id = io.id
      JOIN foreign_bonds fb ON io.foreign_bond_id = fb.id
      JOIN dealerships d ON io.dealership_id = d.id
      LEFT JOIN vehicle_taxes vt ON vt.order_id = bc.order_id
      WHERE bc.id = $1
    `, [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Clearance not found' });
    }
    res.json({ data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get summary by border point
router.get('/summary/by-border', auth, async (req, res) => {
  try {
    const result = db.query(`
      SELECT border_point, 
        COUNT(*) as total,
        SUM(CASE WHEN clearance_status = 'Pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN clearance_status = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN clearance_status = 'Cleared' THEN 1 ELSE 0 END) as cleared
      FROM border_clearance
      GROUP BY border_point
      ORDER BY border_point
    `);
    res.json({ data: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create border clearance
router.post('/', auth, async (req, res) => {
  try {
    const { order_id, border_point, ura_declaration_number } = req.body;
    
    const result = await db.query(
      `INSERT INTO border_clearance (order_id, border_point, ura_declaration_number, clearance_status)
       VALUES ($1, $2, $3, 'Pending') RETURNING *`,
      [order_id, border_point, ura_declaration_number]
    );

    // Update order status
    await db.query('UPDATE import_orders SET order_status = $1 WHERE id = $2', ['At Border', order_id]);

    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update clearance status
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status, customs_cleared_date, inspection_date, release_date, notes } = req.body;
    
    let updates = ['clearance_status = $1', 'updated_at = NOW()'];
    const params = [status];
    
    if (customs_cleared_date) {
      params.push(customs_cleared_date);
      updates.push(`customs_cleared_date = $${params.length}`);
    }
    if (inspection_date) {
      params.push(inspection_date);
      updates.push(`inspection_date = $${params.length}`);
    }
    if (release_date) {
      params.push(release_date);
      updates.push(`release_date = $${params.length}`);
    }
    if (notes) {
      params.push(notes);
      updates.push(`notes = $${params.length}`);
    }
    
    params.push(req.params.id);
    const result = await db.query(
      `UPDATE border_clearance SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Clearance not found' });
    }

    // If cleared, update order status
    if (status === 'Cleared') {
      await db.query('UPDATE import_orders SET order_status = $1 WHERE id = $2', 
        ['Cleared', result.rows[0].order_id]);
    }

    res.json({ data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
