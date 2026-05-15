const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const bondFilter = require('../middleware/bondFilter');

// Ensure table exists — called lazily on first request
let _notifTableReady = false;
function ensureNotificationsTable() {
  if (_notifTableReady) return;
  const rawDb = db.getDb();
  if (!rawDb) return;
  rawDb.run(`CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    dealership_id INTEGER,
    foreign_bond_id INTEGER,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    is_read INTEGER DEFAULT 0,
    link TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`);
  try { rawDb.run(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read)`); } catch (_) {}
  _notifTableReady = true;
}

// Lazy init middleware
router.use((req, res, next) => { ensureNotificationsTable(); next(); });

// GET /api/notifications — get notifications for current user/org
router.get('/', auth, bondFilter, async (req, res) => {
  try {
    const rawDb = db.getDb();
    let conditions = [];
    let params = [];

    if (req.isAdmin) {
      // Admins see their own user-targeted notifications
      conditions.push(`(user_id = ${req.user.id} OR (dealership_id IS NULL AND foreign_bond_id IS NULL AND user_id IS NULL))`);
    } else if (req.isDealershipManager) {
      conditions.push(`(user_id = ${req.user.id} OR dealership_id = ${req.user.dealership_id})`);
    } else if (req.isForeignBondUser) {
      conditions.push(`(user_id = ${req.user.id} OR foreign_bond_id = ${req.user.foreign_bond_id})`);
    } else {
      conditions.push(`user_id = ${req.user.id}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = rawDb.exec(`
      SELECT * FROM notifications ${where}
      ORDER BY created_at DESC LIMIT 50
    `);
    const cols = result[0]?.columns || [];
    const rows = (result[0]?.values || []).map(r =>
      Object.fromEntries(cols.map((c, i) => [c, r[i]]))
    );
    const unread = rows.filter(n => !n.is_read).length;
    res.json({ data: rows, unread });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/notifications/:id/read — mark as read
router.patch('/:id/read', auth, async (req, res) => {
  try {
    const rawDb = db.getDb();
    rawDb.run(`UPDATE notifications SET is_read = 1 WHERE id = ?`, [req.params.id]);
    db.saveDb();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/notifications/read-all — mark all as read for current user
router.patch('/read-all', auth, bondFilter, async (req, res) => {
  try {
    const rawDb = db.getDb();
    if (req.isDealershipManager) {
      rawDb.run(`UPDATE notifications SET is_read = 1 WHERE (user_id = ? OR dealership_id = ?)`, [req.user.id, req.user.dealership_id]);
    } else if (req.isForeignBondUser) {
      rawDb.run(`UPDATE notifications SET is_read = 1 WHERE (user_id = ? OR foreign_bond_id = ?)`, [req.user.id, req.user.foreign_bond_id]);
    } else {
      rawDb.run(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`, [req.user.id]);
    }
    db.saveDb();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/notifications — admin broadcasts a notification
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { title, message, type = 'info', target = 'all' } = req.body;
    if (!title || !message) return res.status(400).json({ error: 'title and message required' });

    const rawDb = db.getDb();
    // Get target dealerships
    let dealershipIds = [];
    if (target === 'all' || target === 'active') {
      const q = target === 'active'
        ? `SELECT id FROM dealerships WHERE subscription_status = 'active'`
        : `SELECT id FROM dealerships`;
      const r = rawDb.exec(q);
      dealershipIds = (r[0]?.values || []).map(v => v[0]);
    }

    for (const did of dealershipIds) {
      rawDb.run(
        `INSERT INTO notifications (dealership_id, title, message, type) VALUES (?, ?, ?, ?)`,
        [did, title, message, type]
      );
    }
    db.saveDb();
    res.json({ message: `Notification sent to ${dealershipIds.length} dealerships` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
