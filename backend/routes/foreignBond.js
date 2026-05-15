const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// Get all foreign bonds
router.get('/', auth, async (req, res) => {
  try {
    const { country, status } = req.query;
    let query = `
      SELECT fb.*, 
        (SELECT COUNT(*) FROM vehicles v WHERE v.foreign_bond_id = fb.id AND v.status = 'Available') as available_count,
        (SELECT COUNT(*) FROM vehicles v WHERE v.foreign_bond_id = fb.id) as total_vehicles
      FROM foreign_bonds fb
      WHERE 1=1
    `;
    const params = [];
    
    if (country) {
      params.push(country);
      query += ` AND fb.country = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND fb.status = $${params.length}`;
    }
    
    query += ' ORDER BY fb.name';
    const result = await db.query(query, params);
    res.json({ data: result.rows });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get foreign bond by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM foreign_bonds WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Foreign bond not found' });
    }
    res.json({ data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get vehicles in foreign bond
router.get('/:id/vehicles', auth, async (req, res) => {
  try {
    const { status, orderable } = req.query;
    let query = `
      SELECT * FROM vehicles 
      WHERE foreign_bond_id = $1
    `;
    const params = [req.params.id];
    
    if (orderable === 'true') {
      // Show all vehicles with remaining stock quantity, regardless of dealership assignment
      // A supplier can supply the same vehicle to multiple dealerships until quantity hits 0
      query += ` AND quantity > 0 AND status NOT IN ('Sold', 'Reserved', 'Delivered', 'ordered')`;
    } else if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }
    
    query += ' ORDER BY created_at DESC';
    const result = await db.query(query, params);
    res.json({ data: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create foreign bond (admin only)
router.post('/', auth, async (req, res) => {
  try {
    const { name, country, city, address, contact_person, contact_email, contact_phone, specialization } = req.body;
    const result = await db.query(
      `INSERT INTO foreign_bonds (name, country, city, address, contact_person, contact_email, contact_phone, specialization)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [name, country, city, address, contact_person, contact_email, contact_phone, specialization]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Public registration endpoint for new suppliers
router.post('/register', async (req, res) => {
  const bcrypt = require('bcryptjs');
  try {
    const { 
      business_name, 
      country, 
      city, 
      address, 
      phone, 
      email, 
      contact_phone,
      contact_email,
      license_number,
      contact_person,
      specialization,
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

    // Support both public registration payload and Supplier Management payload.
    const safePhone = phone || contact_phone || null;
    const safeEmail = email || contact_email || null;
    const safeAddress = address || null;
    const safeLicense = license_number || null;
    const safeContactPerson = contact_person || business_name || null;
    const safeSpecialization = specialization || null;

    // Create foreign bond (supplier company)
    const bondResult = await db.query(
      `INSERT INTO foreign_bonds (name, country, city, address, contact_phone, contact_email, license_number, contact_person, specialization, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Active') RETURNING id`,
      [business_name, country, city, safeAddress, safePhone, safeEmail, safeLicense, safeContactPerson, safeSpecialization]
    );

    const foreignBondId = bondResult.rows[0].id;

    // Create admin user for this supplier
    const fullName = contact_person || business_name || admin_email;
    const hashedPassword = await bcrypt.hash(admin_password, 10);
    await db.query(
      `INSERT INTO users (email, password_hash, full_name, role, foreign_bond_id)
       VALUES ($1, $2, $3, 'foreign_bond_user', $4)`,
      [admin_email, hashedPassword, fullName, foreignBondId]
    );

    res.status(201).json({ 
      message: 'Supplier account registered successfully! You can now login.',
      foreign_bond_id: foreignBondId
    });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.message && error.message.includes('UNIQUE constraint failed: users.email')) {
      return res.status(400).json({ error: 'Admin email already exists. Please use a different email.' });
    }
    if (error.message && error.message.includes('UNIQUE constraint failed: foreign_bonds')) {
      return res.status(400).json({ error: 'Supplier with similar unique details already exists.' });
    }
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// Update foreign bond (admin only)
router.put('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { name, country, city, address, contact_person, contact_email, contact_phone, license_number, specialization, status } = req.body;
    
    const result = await db.query(
      `UPDATE foreign_bonds 
       SET name = $1, country = $2, city = $3, address = $4, contact_person = $5, 
           contact_email = $6, contact_phone = $7, license_number = $8, specialization = $9, status = $10
       WHERE id = $11 RETURNING *`,
      [name, country, city, address, contact_person, contact_email, contact_phone, license_number, specialization, status || 'Active', req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Foreign bond not found' });
    }

    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete foreign bond (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Check if bond has vehicles or orders
    const vehicleCheck = await db.query('SELECT COUNT(*) as count FROM vehicles WHERE foreign_bond_id = $1', [req.params.id]);
    if (vehicleCheck.rows[0].count > 0) {
      return res.status(400).json({ error: 'Cannot delete: Supplier has ' + vehicleCheck.rows[0].count + ' vehicles. Please remove vehicles first.' });
    }

    const orderCheck = await db.query('SELECT COUNT(*) as count FROM import_orders WHERE foreign_bond_id = $1', [req.params.id]);
    if (orderCheck.rows[0].count > 0) {
      return res.status(400).json({ error: 'Cannot delete: Supplier has ' + orderCheck.rows[0].count + ' orders. Please archive orders first.' });
    }

    // Delete associated users first
    await db.query('DELETE FROM users WHERE foreign_bond_id = $1', [req.params.id]);
    
    // Then delete the foreign bond
    await db.query('DELETE FROM foreign_bonds WHERE id = $1', [req.params.id]);
    
    res.json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete supplier: ' + error.message });
  }
});

module.exports = router;
