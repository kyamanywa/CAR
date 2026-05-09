const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const { checkUserLimit } = require('../middleware/usageLimits');
// Middleware to check if user is owner
const requireOwner = (req, res, next) => {
  if (req.user.account_type !== 'owner') {
    return res.status(403).json({ error: 'Only organization owners can perform this action' });
  }
  next();
};

// Get team members
router.get('/members', async (req, res) => {
  try {
    const organizationId = req.user.foreign_bond_id || req.user.dealership_id;
    const organizationType = req.user.foreign_bond_id ? 'foreign_bond_id' : 'dealership_id';
    
    const result = await db.query(
      `SELECT id, name, email, account_type, role, is_active, last_login_at, created_at, invited_by
       FROM users 
       WHERE ${organizationType} = $1 
       ORDER BY 
         CASE account_type 
           WHEN 'owner' THEN 1
           WHEN 'manager' THEN 2
           WHEN 'viewer' THEN 3
         END, 
         created_at ASC`,
      [organizationId]
    );
    
    res.json({ data: result.rows });
  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
});

// Get pending invitations
router.get('/invitations', requireOwner, async (req, res) => {
  try {
    const organizationId = req.user.foreign_bond_id || req.user.dealership_id;
    const organizationField = req.user.foreign_bond_id ? 'foreign_bond_id' : 'dealership_id';
    
    const result = await db.query(
      `SELECT * FROM team_invitations 
       WHERE ${organizationField} = $1 AND status = 'pending'
       ORDER BY created_at DESC`,
      [organizationId]
    );
    
    res.json({ data: result.rows });
  } catch (error) {
    console.error('Error fetching invitations:', error);
    res.status(500).json({ error: 'Failed to fetch invitations' });
  }
});

// Invite team member (with user limit check)
router.post('/invite', requireOwner, checkUserLimit, async (req, res) => {
  try {
    const { email, account_type, name } = req.body;
    
    if (!email || !account_type) {
      return res.status(400).json({ error: 'Email and account type are required' });
    }
    
    if (!['manager', 'viewer'].includes(account_type)) {
      return res.status(400).json({ error: 'Account type must be manager or viewer' });
    }
    
    const organizationId = req.user.foreign_bond_id || req.user.dealership_id;
    const organizationField = req.user.foreign_bond_id ? 'foreign_bond_id' : 'dealership_id';
    
    // Check if user already exists
    const existingUser = await db.query(
      `SELECT id FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    
    // Check pending invitations
    const pendingInvite = await db.query(
      `SELECT id FROM team_invitations 
       WHERE email = $1 AND ${organizationField} = $2 AND status = 'pending'`,
      [email.toLowerCase(), organizationId]
    );
    
    if (pendingInvite.rows.length > 0) {
      return res.status(400).json({ error: 'Invitation already sent to this email' });
    }
    
    // Check subscription limits (if subscriptions exist)
    const currentMembers = await db.query(
      `SELECT COUNT(*) as count FROM users WHERE ${organizationField} = $1 AND is_active = 1`,
      [organizationId]
    );
    
    // Generate invitation token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    const result = await db.query(
      `INSERT INTO team_invitations 
       (email, account_type, ${organizationField}, invited_by, invitation_token, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [email.toLowerCase(), account_type, organizationId, req.user.id, token, expiresAt.toISOString()]
    );
    
    await db.saveDb();
    
    // TODO: Send email with invitation link
    // const inviteLink = `${process.env.FRONTEND_URL}/accept-invite/${token}`;
    
    res.json({ 
      message: 'Invitation sent successfully',
      data: result.rows[0],
      inviteLink: `/accept-invite/${token}` // Return for testing
    });
  } catch (error) {
    console.error('Error inviting team member:', error);
    res.status(500).json({ error: 'Failed to send invitation' });
  }
});

// Create user directly (manual - no invitation)
router.post('/create-user', requireOwner, async (req, res) => {
  try {
    const { name, email, password, account_type } = req.body;
    
    if (!name || !email || !password || !account_type) {
      return res.status(400).json({ error: 'Name, email, password, and account type are required' });
    }
    
    if (!['manager', 'viewer'].includes(account_type)) {
      return res.status(400).json({ error: 'Account type must be manager or viewer' });
    }
    
    const organizationId = req.user.foreign_bond_id || req.user.dealership_id;
    const organizationField = req.user.foreign_bond_id ? 'foreign_bond_id' : 'dealership_id';
    
    // Check if user already exists
    const existingUser = await db.query(
      `SELECT id FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    
    // Hash password
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Determine role based on organization type
    const role = req.user.foreign_bond_id ? 'foreign_bond_user' : 'dealership_manager';
    
    // Create user account
    const userResult = await db.query(
      `INSERT INTO users 
       (name, email, password, role, account_type, ${organizationField}, invited_by, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 1)
       RETURNING id, name, email, role, account_type`,
      [name, email.toLowerCase(), hashedPassword, role, account_type, organizationId, req.user.id]
    );
    
    await db.saveDb();
    
    res.json({ 
      message: 'User created successfully',
      data: userResult.rows[0]
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Accept invitation
router.post('/accept-invite/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { name, password } = req.body;
    
    if (!name || !password) {
      return res.status(400).json({ error: 'Name and password are required' });
    }
    
    // Find invitation
    const inviteResult = await db.query(
      `SELECT * FROM team_invitations 
       WHERE invitation_token = $1 AND status = 'pending'`,
      [token]
    );
    
    if (inviteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid or expired invitation' });
    }
    
    const invite = inviteResult.rows[0];
    
    // Check expiration
    if (new Date(invite.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Invitation has expired' });
    }
    
    // Hash password
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Determine role based on organization type
    const role = invite.foreign_bond_id ? 'foreign_bond_user' : 'dealership_manager';
    const organizationField = invite.foreign_bond_id ? 'foreign_bond_id' : 'dealership_id';
    const organizationId = invite.foreign_bond_id || invite.dealership_id;
    
    // Create user account
    const userResult = await db.query(
      `INSERT INTO users 
       (name, email, password, role, account_type, ${organizationField}, invited_by, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 1)
       RETURNING id, name, email, role, account_type`,
      [name, invite.email, hashedPassword, role, invite.account_type, organizationId, invite.invited_by]
    );
    
    // Mark invitation as accepted
    await db.query(
      `UPDATE team_invitations 
       SET status = 'accepted', accepted_at = $1 
       WHERE id = $2`,
      [new Date().toISOString(), invite.id]
    );
    
    await db.saveDb();
    
    res.json({ 
      message: 'Account created successfully',
      data: userResult.rows[0]
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// Update team member role
router.patch('/members/:id', requireOwner, async (req, res) => {
  try {
    const { id } = req.params;
    const { account_type, is_active } = req.body;
    
    if (id == req.user.id) {
      return res.status(400).json({ error: 'Cannot modify your own account' });
    }
    
    const organizationId = req.user.foreign_bond_id || req.user.dealership_id;
    const organizationField = req.user.foreign_bond_id ? 'foreign_bond_id' : 'dealership_id';
    
    // Check if user belongs to same organization
    const userCheck = await db.query(
      `SELECT account_type FROM users WHERE id = $1 AND ${organizationField} = $2`,
      [id, organizationId]
    );
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found in your organization' });
    }
    
    if (userCheck.rows[0].account_type === 'owner') {
      return res.status(400).json({ error: 'Cannot modify owner account' });
    }
    
    const updates = [];
    const params = [];
    let paramIndex = 1;
    
    if (account_type && ['manager', 'viewer'].includes(account_type)) {
      updates.push(`account_type = $${paramIndex}`);
      params.push(account_type);
      paramIndex++;
    }
    
    if (typeof is_active === 'boolean') {
      updates.push(`is_active = $${paramIndex}`);
      params.push(is_active ? 1 : 0);
      paramIndex++;
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }
    
    params.push(id);
    
    const result = await db.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );
    
    await db.saveDb();
    
    res.json({ 
      message: 'Team member updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating team member:', error);
    res.status(500).json({ error: 'Failed to update team member' });
  }
});

// Remove team member
router.delete('/members/:id', requireOwner, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (id == req.user.id) {
      return res.status(400).json({ error: 'Cannot remove yourself' });
    }
    
    const organizationId = req.user.foreign_bond_id || req.user.dealership_id;
    const organizationField = req.user.foreign_bond_id ? 'foreign_bond_id' : 'dealership_id';
    
    // Check if user belongs to same organization
    const userCheck = await db.query(
      `SELECT account_type FROM users WHERE id = $1 AND ${organizationField} = $2`,
      [id, organizationId]
    );
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found in your organization' });
    }
    
    if (userCheck.rows[0].account_type === 'owner') {
      return res.status(400).json({ error: 'Cannot remove owner account' });
    }
    
    // Soft delete - set is_active to false
    await db.query(
      `UPDATE users SET is_active = 0 WHERE id = $1`,
      [id]
    );
    
    await db.saveDb();
    
    res.json({ message: 'Team member removed successfully' });
  } catch (error) {
    console.error('Error removing team member:', error);
    res.status(500).json({ error: 'Failed to remove team member' });
  }
});

// Cancel/resend invitation
router.delete('/invitations/:id', requireOwner, async (req, res) => {
  try {
    const { id } = req.params;
    
    const organizationId = req.user.foreign_bond_id || req.user.dealership_id;
    const organizationField = req.user.foreign_bond_id ? 'foreign_bond_id' : 'dealership_id';
    
    await db.query(
      `UPDATE team_invitations 
       SET status = 'canceled' 
       WHERE id = $1 AND ${organizationField} = $2`,
      [id, organizationId]
    );
    
    await db.saveDb();
    
    res.json({ message: 'Invitation canceled successfully' });
  } catch (error) {
    console.error('Error canceling invitation:', error);
    res.status(500).json({ error: 'Failed to cancel invitation' });
  }
});

module.exports = router;
