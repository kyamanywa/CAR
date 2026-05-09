const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// Public registration endpoint for new dealerships
router.post('/register', async (req, res) => {
  try {
    const { 
      business_name, 
      country, 
      city, 
      address, 
      phone, 
      email, 
      license_number,
      contact_person,
      admin_email,
      admin_password
    } = req.body;

    // Validate required fields
    if (!business_name || !country || !city || !admin_email || !admin_password) {
      return res.status(400).json({ 
        error: 'Required fields: business_name, country, city, admin_email, admin_password' 
      });
    }

    // Check if email already exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [admin_email]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create dealership
    const dealershipResult = await db.query(
      `INSERT INTO dealerships (name, country, city, address, contact_phone, contact_email, license_number, contact_person, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Active') RETURNING *`,
      [business_name, country, city, address, phone, email, license_number, contact_person]
    );

    const dealershipId = dealershipResult.rows[0]?.id || dealershipResult.lastInsertRowid;

    // Create admin user for this dealership
    const fullName = contact_person || business_name || admin_email;
    const hashedPassword = await bcrypt.hash(admin_password, 10);
    await db.query(
      `INSERT INTO users (email, password_hash, full_name, role, dealership_id)
       VALUES ($1, $2, $3, 'dealership_manager', $4)`,
      [admin_email, hashedPassword, fullName, dealershipId]
    );

    res.status(201).json({ 
      message: 'Dealership registered successfully! You can now login.',
      dealership_id: dealershipId
    });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.message && error.message.includes('UNIQUE constraint failed: users.email')) {
      return res.status(400).json({ error: 'Admin email already exists. Please use a different email.' });
    }
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// Get all dealerships (admin only)
router.get('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { city, status, country } = req.query;
    let query = `
      SELECT d.*,
        (SELECT COUNT(*) FROM vehicles v WHERE v.dealership_id = d.id AND v.status = 'In Stock') as in_stock_count,
        (SELECT COUNT(*) FROM import_orders io WHERE io.dealership_id = d.id AND io.order_status NOT IN ('Delivered', 'Cancelled')) as pending_orders
      FROM dealerships d
      WHERE 1=1
    `;
    const params = [];
    
    if (country) {
      params.push(country);
      query += ` AND d.country = $${params.length}`;
    }
    if (city) {
      params.push(city);
      query += ` AND d.city = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND d.status = $${params.length}`;
    }
    
    query += ' ORDER BY d.name';
    const result = await db.query(query, params);
    res.json({ data: result.rows });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create dealership (admin only)
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const {
      name,
      country,
      city,
      address,
      phone,
      email,
      contact_phone,
      contact_email,
      contact_person,
      license_number,
      specialization,
      status,
      subscription_plan,
      subscription_amount,
      subscription_status
    } = req.body;

    // Validate required fields
    if (!name || !country || !city) {
      return res.status(400).json({ error: 'Required fields: name, country, city' });
    }

    const safePhone = phone || contact_phone || null;
    const safeEmail = email || contact_email || null;
    const safeAddress = address || null;
    const safeContactPerson = contact_person || null;
    const safeLicense = license_number || null;
    const safeSpecialization = specialization || null;
    const safeStatus = status || 'Active';
    const safePlan = subscription_plan || 'Free Trial';
    const safeAmount = typeof subscription_amount === 'number' ? subscription_amount : 0;
    const safeSubStatus = subscription_status || 'Active';

    const result = await db.query(
      `INSERT INTO dealerships (
        name, country, city, address, contact_person, contact_phone, contact_email,
        license_number, specialization, status, subscription_plan, subscription_amount, subscription_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [
        name,
        country,
        city,
        safeAddress,
        safeContactPerson,
        safePhone,
        safeEmail,
        safeLicense,
        safeSpecialization,
        safeStatus,
        safePlan,
        safeAmount,
        safeSubStatus
      ]
    );

    res.status(201).json({ 
      message: 'Dealership created successfully',
      dealership_id: result.rows[0]?.id || result.lastInsertRowid
    });
  } catch (error) {
    console.error('Error creating dealership:', error);
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Dealership contains duplicate unique fields.' });
    }
    res.status(500).json({ error: 'Failed to create dealership' });
  }
});

// Get dealership by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM dealerships WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Dealership not found' });
    }
    res.json({ data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update dealership (admin only) - Full update
router.put('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { id } = req.params;
    const { name, country, city, address, contact_person, contact_phone, contact_email, license_number, specialization, status, subscription_plan, subscription_amount, subscription_status } = req.body;
    
    const result = await db.query(
      `UPDATE dealerships 
       SET name = $1, country = $2, city = $3, address = $4, contact_person = $5,
           contact_phone = $6, contact_email = $7, license_number = $8, 
           specialization = $9, status = $10, subscription_plan = $11, 
           subscription_amount = $12, subscription_status = $13
       WHERE id = $14 RETURNING *`,
      [name, country, city, address, contact_person, contact_phone, contact_email, license_number, specialization, status || 'Active', subscription_plan, subscription_amount, subscription_status, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Dealership not found' });
    }
    
    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Partial update dealership (admin only) - PATCH for dynamic updates
router.patch('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { id } = req.params;
    const updates = req.body;
    
    // Get current dealership data
    const currentData = await db.query('SELECT * FROM dealerships WHERE id = $1', [id]);
    if (currentData.rows.length === 0) {
      return res.status(404).json({ error: 'Dealership not found' });
    }
    
    // Build dynamic UPDATE query with only provided fields
    const allowedFields = ['name', 'country', 'city', 'address', 'contact_person', 'contact_phone', 
                          'contact_email', 'license_number', 'specialization', 'status', 
                          'subscription_plan', 'subscription_amount', 'subscription_status', 'subscription_end_date'];
    
    const setClauses = [];
    const values = [];
    let paramIndex = 1;
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClauses.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }
    
    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    values.push(id); // Add id as last parameter
    const query = `UPDATE dealerships SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    
    const result = await db.query(query, values);
    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete dealership (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Check if dealership has vehicles or orders
    const vehicleCheck = await db.query('SELECT COUNT(*) as count FROM vehicles WHERE dealership_id = $1', [req.params.id]);
    if (vehicleCheck.rows[0].count > 0) {
      return res.status(400).json({ error: 'Cannot delete: Dealership has ' + vehicleCheck.rows[0].count + ' vehicles. Please remove vehicles first.' });
    }

    const orderCheck = await db.query('SELECT COUNT(*) as count FROM import_orders WHERE dealership_id = $1', [req.params.id]);
    if (orderCheck.rows[0].count > 0) {
      return res.status(400).json({ error: 'Cannot delete: Dealership has ' + orderCheck.rows[0].count + ' orders.' });
    }

    // Delete associated users first
    await db.query('DELETE FROM users WHERE dealership_id = $1', [req.params.id]);
    
    // Then delete the dealership
    await db.query('DELETE FROM dealerships WHERE id = $1', [req.params.id]);
    
    res.json({ message: 'Dealership deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete dealership: ' + error.message });
  }
});

module.exports = router;
