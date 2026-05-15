const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const auth = require('../middleware/auth');

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role, 
        bond_id: user.dealership_id,
        foreign_bond_id: user.foreign_bond_id 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          account_type: user.account_type,
          role: user.role,
          dealership_id: user.dealership_id,
          foreign_bond_id: user.foreign_bond_id
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user (full profile)
router.get('/me', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.email, u.full_name, u.account_type, u.role,
              u.dealership_id, u.foreign_bond_id, u.phone, u.position, u.profile_notes,
              u.created_at,
              d.name as dealership_name, d.address as dealership_address, d.contact_phone as dealership_phone
       FROM users u
       LEFT JOIN dealerships d ON u.dealership_id = d.id
       WHERE u.id = $1`,
      [req.user.id]
    );
    res.json({ data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update own profile
router.patch('/me', auth, async (req, res) => {
  try {
    const { full_name, phone, position, profile_notes } = req.body;
    await db.query(
      `UPDATE users SET full_name=$1, phone=$2, position=$3, profile_notes=$4 WHERE id=$5`,
      [full_name || null, phone || null, position || null, profile_notes || null, req.user.id]
    );
    await db.saveDb();
    res.json({ message: 'Profile updated' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Change own password
router.patch('/me/password', auth, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password)
      return res.status(400).json({ error: 'current_password and new_password required' });
    if (new_password.length < 6)
      return res.status(400).json({ error: 'New password must be at least 6 characters' });

    const result = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];
    const bcrypt = require('bcryptjs');
    const valid = await bcrypt.compare(current_password, user.password_hash);
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });

    const hashed = await bcrypt.hash(new_password, 10);
    await db.query('UPDATE users SET password_hash=$1 WHERE id=$2', [hashed, req.user.id]);
    await db.saveDb();
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
