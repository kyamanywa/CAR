const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// Get tracking events for an order
router.get('/order/:orderId', auth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT te.*, u.name as created_by_name
      FROM tracking_events te
      LEFT JOIN users u ON te.created_by = u.id
      WHERE te.order_id = $1
      ORDER BY te.event_date ASC, te.created_at ASC
    `, [req.params.orderId]);
    
    res.json({ data: result.rows });
  } catch (error) {
    console.error('Error fetching tracking events:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add tracking event
router.post('/', auth, async (req, res) => {
  try {
    const { 
      order_id, 
      event_type, 
      location, 
      description, 
      event_date,
      latitude,
      longitude,
      notes 
    } = req.body;
    
    // Validate required fields
    if (!order_id || !event_type || !location || !event_date) {
      return res.status(400).json({ 
        error: 'Missing required fields: order_id, event_type, location, event_date' 
      });
    }
    
    // Validate event_type
    const validEventTypes = [
      'DEPARTURE',
      'PORT_ARRIVAL',
      'CUSTOMS_CLEARANCE',
      'BORDER_CROSSING',
      'INLAND_TRANSIT',
      'FINAL_DELIVERY'
    ];
    
    if (!validEventTypes.includes(event_type)) {
      return res.status(400).json({ 
        error: `Invalid event_type. Must be one of: ${validEventTypes.join(', ')}` 
      });
    }
    
    // Insert tracking event
    const result = await db.query(`
      INSERT INTO tracking_events 
      (order_id, event_type, location, description, event_date, latitude, longitude, created_by, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [order_id, event_type, location, description, event_date, latitude, longitude, req.user.id, notes]);
    
    // Update import_orders current_location and last_tracking_update
    await db.query(`
      UPDATE import_orders 
      SET current_location = $1, last_tracking_update = $2
      WHERE id = $3
    `, [location, event_date, order_id]);
    
    // Auto-update order status based on event type
    const statusMap = {
      'DEPARTURE': 'Shipped',
      'PORT_ARRIVAL': 'At Border',
      'CUSTOMS_CLEARANCE': 'At Border',
      'BORDER_CROSSING': 'Cleared',
      'INLAND_TRANSIT': 'Cleared',
      'FINAL_DELIVERY': 'Delivered'
    };
    
    if (statusMap[event_type]) {
      await db.query(`
        UPDATE import_orders 
        SET order_status = $1
        WHERE id = $2
      `, [statusMap[event_type], order_id]);
    }
    
    // Update shipping table based on event type
    if (event_type === 'PORT_ARRIVAL') {
      await db.query(`
        UPDATE shipping 
        SET actual_arrival = $1, shipping_status = 'Arrived'
        WHERE order_id = $2
      `, [event_date, order_id]);
    } else if (event_type === 'CUSTOMS_CLEARANCE') {
      await db.query(`
        UPDATE shipping 
        SET customs_cleared_date = $1
        WHERE order_id = $2
      `, [event_date, order_id]);
    } else if (event_type === 'BORDER_CROSSING') {
      await db.query(`
        UPDATE shipping 
        SET border_crossed_date = $1, border_point = $2
        WHERE order_id = $3
      `, [event_date, location, order_id]);
    } else if (event_type === 'FINAL_DELIVERY') {
      await db.query(`
        UPDATE shipping 
        SET delivered_date = $1, final_destination = $2, shipping_status = 'Delivered'
        WHERE order_id = $3
      `, [event_date, location, order_id]);
    }
    
    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    console.error('Error creating tracking event:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update tracking event
router.patch('/:id', auth, async (req, res) => {
  try {
    const { location, description, event_date, latitude, longitude, notes } = req.body;
    
    const updates = [];
    const params = [];
    let paramIndex = 1;
    
    if (location !== undefined) {
      params.push(location);
      updates.push(`location = $${paramIndex++}`);
    }
    if (description !== undefined) {
      params.push(description);
      updates.push(`description = $${paramIndex++}`);
    }
    if (event_date !== undefined) {
      params.push(event_date);
      updates.push(`event_date = $${paramIndex++}`);
    }
    if (latitude !== undefined) {
      params.push(latitude);
      updates.push(`latitude = $${paramIndex++}`);
    }
    if (longitude !== undefined) {
      params.push(longitude);
      updates.push(`longitude = $${paramIndex++}`);
    }
    if (notes !== undefined) {
      params.push(notes);
      updates.push(`notes = $${paramIndex++}`);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    params.push(req.params.id);
    const result = await db.query(`
      UPDATE tracking_events 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tracking event not found' });
    }
    
    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Error updating tracking event:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete tracking event
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM tracking_events WHERE id = $1', [req.params.id]);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Tracking event not found' });
    }
    
    res.json({ message: 'Tracking event deleted successfully' });
  } catch (error) {
    console.error('Error deleting tracking event:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get tracking timeline for an order (formatted for UI)
router.get('/order/:orderId/timeline', auth, async (req, res) => {
  try {
    const events = await db.query(`
      SELECT te.*, u.name as created_by_name
      FROM tracking_events te
      LEFT JOIN users u ON te.created_by = u.id
      WHERE te.order_id = $1
      ORDER BY te.event_date ASC, te.created_at ASC
    `, [req.params.orderId]);
    
    // Get order and shipping info
    const orderInfo = await db.query(`
      SELECT io.*, 
        fb.name as origin_name, fb.country as origin_country,
        s.departure_port, s.arrival_port, s.vessel_name,
        s.border_point, s.final_destination
      FROM import_orders io
      LEFT JOIN foreign_bonds fb ON io.foreign_bond_id = fb.id
      LEFT JOIN shipping s ON s.order_id = io.id
      WHERE io.id = $1
    `, [req.params.orderId]);
    
    res.json({ 
      data: {
        order: orderInfo.rows[0] || null,
        events: events.rows,
        current_location: orderInfo.rows[0]?.current_location || 'Unknown',
        last_update: orderInfo.rows[0]?.last_tracking_update || null
      }
    });
  } catch (error) {
    console.error('Error fetching timeline:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
