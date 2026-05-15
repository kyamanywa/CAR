const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const bondFilter = require('../middleware/bondFilter');

// GET all test drives for dealership
router.get('/', auth, bondFilter, async (req, res) => {
  try {
    if (!req.isDealershipManager) return res.status(403).json({ error: 'Dealership access only' });
    const result = await db.query(`
      SELECT td.*, v.make, v.model, v.year, v.chassis_number
      FROM test_drives td
      LEFT JOIN vehicles v ON td.vehicle_id = v.id
      WHERE td.dealership_id = $1
      ORDER BY td.drive_date DESC, td.created_at DESC
    `, [req.bondId]);
    res.json({ data: result.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST create test drive
router.post('/', auth, bondFilter, async (req, res) => {
  try {
    if (!req.isDealershipManager) return res.status(403).json({ error: 'Dealership access only' });
    const { vehicle_id, customer_id, customer_name, customer_phone, customer_id_number,
            sales_person, drive_date, start_time, end_time, outcome, notes } = req.body;
    if (!vehicle_id || !drive_date) return res.status(400).json({ error: 'vehicle_id and drive_date required' });
    const result = await db.query(`
      INSERT INTO test_drives (dealership_id, vehicle_id, customer_id, customer_name, customer_phone,
        customer_id_number, sales_person, drive_date, start_time, end_time, outcome, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *
    `, [req.bondId, vehicle_id, customer_id || null, customer_name || null, customer_phone || null,
        customer_id_number || null, sales_person || null, drive_date, start_time || null,
        end_time || null, outcome || 'Undecided', notes || null]);
    await db.saveDb();
    res.status(201).json({ data: result.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH update outcome
router.patch('/:id', auth, bondFilter, async (req, res) => {
  try {
    if (!req.isDealershipManager) return res.status(403).json({ error: 'Dealership access only' });
    const { outcome, notes } = req.body;
    await db.query('UPDATE test_drives SET outcome=$1, notes=$2 WHERE id=$3 AND dealership_id=$4',
      [outcome, notes, req.params.id, req.bondId]);
    await db.saveDb();
    res.json({ message: 'Updated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE
router.delete('/:id', auth, bondFilter, async (req, res) => {
  try {
    if (!req.isDealershipManager) return res.status(403).json({ error: 'Dealership access only' });
    await db.query('DELETE FROM test_drives WHERE id=$1 AND dealership_id=$2', [req.params.id, req.bondId]);
    await db.saveDb();
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
