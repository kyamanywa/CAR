const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const bondFilter = require('../middleware/bondFilter');

// Ensure table exists — lazy init on first request
let _inspTableReady = false;
function ensureTable() {
  if (_inspTableReady) return;
  const rawDb = db.getDb();
  if (!rawDb) return;
  rawDb.run(`CREATE TABLE IF NOT EXISTS vehicle_inspections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id INTEGER NOT NULL,
    dealership_id INTEGER,
    inspection_date TEXT NOT NULL,
    inspector_name TEXT,
    overall_condition TEXT DEFAULT 'Good',
    engine_condition TEXT,
    exterior_condition TEXT,
    interior_condition TEXT,
    tyre_condition TEXT,
    mileage_at_inspection INTEGER,
    issues_found TEXT,
    repair_cost_estimate REAL,
    notes TEXT,
    created_by INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  )`);
  _inspTableReady = true;
}

// Lazy init middleware
router.use((req, res, next) => { ensureTable(); next(); });

// GET /api/inspections?vehicle_id=
router.get('/', auth, bondFilter, async (req, res) => {
  try {
    const { vehicle_id } = req.query;
    const rawDb = db.getDb();
    let where = [];
    const params = [];

    if (req.isDealershipManager) where.push(`vi.dealership_id = ${req.user.dealership_id}`);
    if (vehicle_id) where.push(`vi.vehicle_id = ${Number(vehicle_id)}`);

    const sql = `
      SELECT vi.*, u.full_name as inspector_user, v.make, v.model, v.year, v.chassis_number
      FROM vehicle_inspections vi
      LEFT JOIN users u ON vi.created_by = u.id
      LEFT JOIN vehicles v ON vi.vehicle_id = v.id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY vi.inspection_date DESC, vi.created_at DESC
    `;
    const result = rawDb.exec(sql);
    const cols = result[0]?.columns || [];
    const rows = (result[0]?.values || []).map(r => Object.fromEntries(cols.map((c, i) => [c, r[i]])));
    res.json({ data: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/inspections
router.post('/', auth, bondFilter, async (req, res) => {
  try {
    if (!req.isDealershipManager) return res.status(403).json({ error: 'Dealership access required' });
    const {
      vehicle_id, inspection_date, inspector_name, overall_condition,
      engine_condition, exterior_condition, interior_condition, tyre_condition,
      mileage_at_inspection, issues_found, repair_cost_estimate, notes
    } = req.body;
    if (!vehicle_id || !inspection_date) return res.status(400).json({ error: 'vehicle_id and inspection_date required' });

    const result = await db.query(`
      INSERT INTO vehicle_inspections
      (vehicle_id, dealership_id, inspection_date, inspector_name, overall_condition,
       engine_condition, exterior_condition, interior_condition, tyre_condition,
       mileage_at_inspection, issues_found, repair_cost_estimate, notes, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      RETURNING *
    `, [vehicle_id, req.user.dealership_id, inspection_date, inspector_name, overall_condition || 'Good',
        engine_condition, exterior_condition, interior_condition, tyre_condition,
        mileage_at_inspection || null, issues_found, repair_cost_estimate || null, notes, req.user.id]);

    await db.saveDb();
    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/inspections/:id
router.delete('/:id', auth, bondFilter, async (req, res) => {
  try {
    if (!req.isDealershipManager) return res.status(403).json({ error: 'Dealership access required' });
    const rawDb = db.getDb();
    rawDb.run(`DELETE FROM vehicle_inspections WHERE id = ? AND dealership_id = ?`, [req.params.id, req.user.dealership_id]);
    await db.saveDb();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
