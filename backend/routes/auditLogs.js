const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/audit-logs — paginated, filterable (admin only)
router.get('/', async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { page = 1, limit = 50, resource, action, user_id, from, to } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let conditions = [];
    let params = [];
    let idx = 1;

    if (resource) { conditions.push(`a.resource = $${idx++}`); params.push(resource); }
    if (action)   { conditions.push(`a.action = $${idx++}`); params.push(action); }
    if (user_id)  { conditions.push(`a.user_id = $${idx++}`); params.push(user_id); }
    if (from)     { conditions.push(`a.created_at >= $${idx++}`); params.push(from); }
    if (to)       { conditions.push(`a.created_at <= $${idx++}`); params.push(to + ' 23:59:59'); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM audit_logs a ${where}`,
      params
    );
    const total = countResult.rows[0].total;

    const logsResult = await db.query(
      `SELECT a.id, a.action, a.resource, a.resource_id, a.details, a.ip_address, a.status, a.created_at,
              u.email as user_email, u.role as user_role
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.user_id
       ${where}
       ORDER BY a.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      data: logsResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('Audit logs error:', err);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// GET /api/audit-logs/resources — distinct resource types
router.get('/resources', async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const result = await db.query('SELECT DISTINCT resource FROM audit_logs ORDER BY resource');
    res.json({ data: result.rows.map(r => r.resource) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch resources' });
  }
});

module.exports = router;
