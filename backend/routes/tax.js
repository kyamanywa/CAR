const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { getUsdToUgxRate } = require('../config/currency');
 
async function getOrderForAccess(orderId) {
  const result = await db.query(
    'SELECT id, foreign_bond_id, dealership_id FROM import_orders WHERE id = $1',
    [orderId]
  );
  return result.rows[0] || null;
}
 
function canAccessOrder(req, order) {
  if (!order) return false;
  if (req.user.role === 'admin') return false;
  if (req.user.role === 'foreign_bond_user') return order.foreign_bond_id === req.user.foreign_bond_id;
  if (req.user.role === 'dealership_manager') return order.dealership_id === req.user.dealership_id;
  return false;
}

// Get taxes for order
router.get('/order/:orderId', auth, async (req, res) => {
  try {
    const order = await getOrderForAccess(req.params.orderId);
    if (!canAccessOrder(req, order)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await db.query(`
      SELECT vt.*, io.order_number
      FROM vehicle_taxes vt
      JOIN import_orders io ON vt.order_id = io.id
      WHERE vt.order_id = $1
    `, [req.params.orderId]);
    res.json({ data: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Calculate tax for vehicle
router.post('/calculate', auth, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return res.status(403).json({ error: 'Platform admin cannot access tenant tax calculations' });
    }

    const { cif_value_usd, engine_cc, vehicle_age_years } = req.body;
    
    // Uganda tax rates
    const exchangeRate = getUsdToUgxRate();
    const cifUGX = cif_value_usd * exchangeRate;
    
    // Import duty based on engine CC
    let importDutyRate = 0.25; // Default 25%
    if (engine_cc > 2500) importDutyRate = 0.35;
    if (engine_cc > 3000) importDutyRate = 0.40;
    
    const importDuty = cifUGX * importDutyRate;
    const vatBase = cifUGX + importDuty;
    const vat = vatBase * 0.18; // 18% VAT
    
    // Environmental levy (older cars pay more)
    let envLevy = cifUGX * 0.02;
    if (vehicle_age_years > 5) envLevy = cifUGX * 0.05;
    if (vehicle_age_years > 8) envLevy = cifUGX * 0.10;
    
    const infraLevy = cifUGX * 0.015; // 1.5% Infrastructure levy
    const withholdingTax = cifUGX * 0.06; // 6% Withholding tax
    
    const totalTax = importDuty + vat + envLevy + infraLevy + withholdingTax;
    
    res.json({
      data: {
        cif_value_usd,
        cif_value_ugx: cifUGX,
        exchange_rate: exchangeRate,
        import_duty_rate: importDutyRate,
        import_duty_ugx: importDuty,
        vat_ugx: vat,
        environmental_levy_ugx: envLevy,
        infrastructure_levy_ugx: infraLevy,
        withholding_tax_ugx: withholdingTax,
        total_tax_ugx: totalTax
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Save tax record
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'foreign_bond_user') {
      return res.status(403).json({ error: 'Only supplier can save tax records' });
    }

    const { 
      order_id, vehicle_id, cif_value_usd, cif_value_ugx, exchange_rate,
      import_duty_ugx, vat_ugx, environmental_levy_ugx, infrastructure_levy_ugx,
      withholding_tax_ugx, total_tax_ugx
    } = req.body;

    const order = await getOrderForAccess(order_id);
    if (!canAccessOrder(req, order)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const result = await db.query(
      `INSERT INTO vehicle_taxes (
        order_id, vehicle_id, cif_value_usd, cif_value_ugx, exchange_rate,
        import_duty_ugx, vat_ugx, environmental_levy_ugx, infrastructure_levy_ugx,
        withholding_tax_ugx, total_tax_ugx, payment_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'Pending') RETURNING *`,
      [order_id, vehicle_id, cif_value_usd, cif_value_ugx, exchange_rate,
       import_duty_ugx, vat_ugx, environmental_levy_ugx, infrastructure_levy_ugx,
       withholding_tax_ugx, total_tax_ugx]
    );
    
    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update tax payment status
router.patch('/:id/payment', auth, async (req, res) => {
  try {
    if (req.user.role !== 'foreign_bond_user') {
      return res.status(403).json({ error: 'Only supplier can update tax payment status' });
    }

    const { status, payment_date, payment_reference } = req.body;

    const existingTax = await db.query('SELECT order_id FROM vehicle_taxes WHERE id = $1', [req.params.id]);
    if (existingTax.rows.length === 0) {
      return res.status(404).json({ error: 'Tax record not found' });
    }

    const order = await getOrderForAccess(existingTax.rows[0].order_id);
    if (!canAccessOrder(req, order)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const result = await db.query(
      `UPDATE vehicle_taxes 
       SET payment_status = $1, payment_date = $2, payment_reference = $3, updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [status, payment_date, payment_reference, req.params.id]
    );
    
    res.json({ data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
