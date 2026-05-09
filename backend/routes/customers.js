const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const bondFilter = require('../middleware/bondFilter');

// Get all customers (bond-filtered)
router.get('/', auth, bondFilter, async (req, res) => {
  try {
    let whereClause = '';
    const params = [];
    
    if (req.isDealershipManager) {
      whereClause = 'WHERE c.dealership_id = $1';
      params.push(req.bondId);
    } else if (req.isForeignBondUser) {
      // Suppliers don't manage customers
      return res.json({ data: [] });
    }
    
    const result = await db.query(`
      SELECT c.*, d.name as dealership_name,
        (SELECT COUNT(*) FROM local_sales WHERE customer_id = c.id) as purchase_count
      FROM customers c
      LEFT JOIN dealerships d ON c.dealership_id = d.id
      ${whereClause}
      ORDER BY c.created_at DESC
    `, params);
    
    res.json({ data: result.rows });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single customer
router.get('/:id', auth, bondFilter, async (req, res) => {
  try {
    const { id } = req.params;
    let whereClause = 'WHERE c.id = $1';
    const params = [id];
    
    if (req.isDealershipManager) {
      whereClause += ' AND c.dealership_id = $2';
      params.push(req.bondId);
    }
    
    const result = await db.query(`
      SELECT c.*, d.name as dealership_name
      FROM customers c
      LEFT JOIN dealerships d ON c.dealership_id = d.id
      ${whereClause}
    `, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    // Get purchase history
    const purchases = await db.query(`
      SELECT ls.*, v.make, v.model, v.year, v.chassis_number
      FROM local_sales ls
      JOIN vehicles v ON ls.vehicle_id = v.id
      WHERE ls.customer_id = $1
      ORDER BY ls.sale_date DESC
    `, [id]);
    
    res.json({ 
      data: {
        ...result.rows[0],
        purchases: purchases.rows
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create customer (automatically linked to dealership for dealership managers)
router.post('/', auth, bondFilter, async (req, res) => {
  try {
    const { full_name, phone, email, national_id, address } = req.body;
    
    // For dealership managers, automatically assign to their dealership
    const dealership_id = req.isDealershipManager ? req.bondId : req.body.dealership_id;
    
    if (!dealership_id) {
      return res.status(400).json({ error: 'dealership_id is required' });
    }
    
    const result = await db.query(`
      INSERT INTO customers (full_name, phone, email, national_id, address, dealership_id)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `, [full_name, phone, email, national_id, address, dealership_id]);
    
    res.status(201).json({ 
      message: 'Customer created',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Update customer
router.put('/:id', auth, bondFilter, async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, phone, email, national_id, address } = req.body;
    
    // Check ownership for dealership managers
    if (req.isDealershipManager) {
      const check = await db.query(
        'SELECT id FROM customers WHERE id = $1 AND dealership_id = $2',
        [id, req.bondId]
      );
      if (check.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    await db.query(`
      UPDATE customers 
      SET full_name = $1, phone = $2, email = $3, national_id = $4, address = $5
      WHERE id = $6
    `, [full_name, phone, email, national_id, address, id]);
    
    res.json({ message: 'Customer updated' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete customer
router.delete('/:id', auth, bondFilter, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check ownership for dealership managers
    if (req.isDealershipManager) {
      const check = await db.query(
        'SELECT id FROM customers WHERE id = $1 AND dealership_id = $2',
        [id, req.bondId]
      );
      if (check.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    await db.query('DELETE FROM customers WHERE id = $1', [id]);
    res.json({ message: 'Customer deleted' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
