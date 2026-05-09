const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// Get all users (admin only)
router.get('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const sqlDb = db.getDb();
    const result = sqlDb.exec(`
      SELECT u.id, u.email, u.full_name, u.role, u.created_at, d.name as dealership_name
      FROM users u
      LEFT JOIN dealerships d ON u.dealership_id = d.id
      ORDER BY u.created_at DESC
    `);
    
    const users = result[0] ? result[0].values.map(row => ({
      id: row[0],
      email: row[1],
      full_name: row[2],
      role: row[3],
      created_at: row[4],
      dealership_name: row[5]
    })) : [];
    
    res.json({ data: users });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get users for a specific dealership
router.get('/bond/:bondId', auth, async (req, res) => {
  try {
    const { bondId } = req.params;
    
    // Dealership managers can only see users from their own dealership
    if (req.user.role === 'dealership_manager' && req.user.dealership_id != bondId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const sqlDb = db.getDb();
    const result = sqlDb.exec(`
      SELECT u.id, u.email, u.full_name, u.role, u.created_at
      FROM users u
      WHERE u.dealership_id = ?
      ORDER BY u.created_at DESC
    `, [bondId]);
    
    const users = result[0] ? result[0].values.map(row => ({
      id: row[0],
      email: row[1],
      full_name: row[2],
      role: row[3],
      created_at: row[4]
    })) : [];
    
    res.json({ data: users });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create user for a dealership
router.post('/', auth, async (req, res) => {
  try {
    const { email, password, full_name, role, dealership_id } = req.body;
    
    // Only admin can create admin users
    if (role === 'admin' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can create admin users' });
    }
    
    // Dealership managers can only create users for their own dealership
    if (req.user.role === 'dealership_manager') {
      if (dealership_id != req.user.dealership_id) {
        return res.status(403).json({ error: 'You can only create users for your dealership' });
      }
    }
    
    const sqlDb = db.getDb();
    
    // Check if user already exists
    const existing = sqlDb.exec('SELECT id FROM users WHERE email = ?', [email]);
    if (existing[0] && existing[0].values.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    sqlDb.run(`
      INSERT INTO users (email, password_hash, full_name, role, dealership_id)
      VALUES (?, ?, ?, ?, ?)
    `, [email, hashedPassword, full_name || null, role || 'dealership_manager', dealership_id || null]);
    
    res.status(201).json({ 
      message: 'User created successfully'
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { email, role } = req.body;
    
    // Get the user being updated
    const userToUpdate = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    if (userToUpdate.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Bond managers can only update users from their bond
    if (req.user.role === 'bond_manager') {
      if (userToUpdate.rows[0].dealership_id != req.bondId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    // Only admin can change roles to/from admin
    if ((role === 'admin' || userToUpdate.rows[0].role === 'admin') && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can modify admin users' });
    }
    
    await db.query(`
      UPDATE users 
      SET email = $1, role = $2
      WHERE id = $3
    `, [email, role, id]);
    
    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Change password
router.put('/:id/password', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    
    // Users can change their own password, or admins can change anyone's
    if (req.user.id != id && req.user.role !== 'admin') {
      // Bond managers can change passwords for users in their bond
      if (req.user.role === 'bond_manager') {
        const userToUpdate = await db.query(
          'SELECT dealership_id FROM users WHERE id = $1', 
          [id]
        );
        if (userToUpdate.rows.length === 0 || 
            userToUpdate.rows[0].dealership_id != req.bondId) {
          return res.status(403).json({ error: 'Access denied' });
        }
      } else {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await db.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, id]);
    
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete user
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Cannot delete yourself
    if (req.user.id == id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    // Get the user being deleted
    const userToDelete = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    if (userToDelete.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Bond managers can only delete users from their bond
    if (req.user.role === 'bond_manager') {
      if (userToDelete.rows[0].dealership_id != req.bondId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    // Only admin can delete admin users
    if (userToDelete.rows[0].role === 'admin' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can delete admin users' });
    }
    
    await db.query('DELETE FROM users WHERE id = $1', [id]);
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reset user password (admin only)
router.post('/:id/reset-password', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const { new_password } = req.body;

    if (!new_password || new_password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user exists
    const userCheck = await db.query('SELECT id, email, role FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(new_password, 10);
    
    // Update password
    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedPassword, id]);
    
    res.json({ 
      message: 'Password reset successfully',
      email: userCheck.rows[0].email
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

module.exports = router;
