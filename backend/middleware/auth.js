const jwt = require('jsonwebtoken');
const db = require('../db');

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Fetch fresh user data including account_type and is_active
    const userResult = await db.query(
      'SELECT id, email, role, account_type, is_active, foreign_bond_id, dealership_id FROM users WHERE id = $1',
      [decoded.id]
    );
    
    if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
      return res.status(401).json({ error: 'Account inactive or not found' });
    }
    
    req.user = userResult.rows[0];
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
