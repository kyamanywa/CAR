const express = require('express');
const router = express.Router();
const https = require('https');
const db = require('../db');
const auth = require('../middleware/auth');

// In-memory cache for live rates (1 hour TTL)
let _ratesCache = null;
let _ratesCacheTime = 0;
const CACHE_TTL = 60 * 60 * 1000;

const FALLBACK_RATES = {
  USD: 1, UGX: 3750, EUR: 0.92, GBP: 0.79, KES: 129, TZS: 2550,
  RWF: 1290, BIF: 2900, ZAR: 18.5, NGN: 1550, GHS: 15.5,
  AED: 3.67, SAR: 3.75, JPY: 149, CNY: 7.24, INR: 83.2,
  CAD: 1.36, AUD: 1.53, CHF: 0.88, SGD: 1.34, SEK: 10.4,
  NOK: 10.6, DKK: 6.9, MXN: 17.1, BRL: 4.97, ZMW: 26.5,
  ETB: 56.8, MZN: 63.5, MWK: 1730, TND: 3.12, MAD: 10.0,
  EGP: 48.6, ZWL: 361, CDF: 2750, XOF: 603, XAF: 603,
};

function fetchLiveRates() {
  return new Promise((resolve, reject) => {
    https.get('https://open.er-api.com/v6/latest/USD', (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

// GET /api/exchange-rates/all-currencies — live multi-currency rates (public endpoint)
router.get('/all-currencies', async (req, res) => {
  try {
    if (_ratesCache && Date.now() - _ratesCacheTime < CACHE_TTL) {
      return res.json({ data: _ratesCache, cached: true });
    }
    const result = await fetchLiveRates();
    if (result.result === 'success' && result.rates) {
      _ratesCache = { ...FALLBACK_RATES, ...result.rates };
      _ratesCacheTime = Date.now();
      return res.json({ data: _ratesCache, cached: false, updated_at: result.time_last_update_utc });
    }
    throw new Error('Bad API response');
  } catch {
    res.json({ data: FALLBACK_RATES, cached: false, fallback: true });
  }
});

// Ensure table exists
async function ensureTable() {
  const rawDb = db.getDb();
  rawDb.run(`CREATE TABLE IF NOT EXISTS exchange_rates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_currency TEXT NOT NULL DEFAULT 'USD',
    to_currency TEXT NOT NULL DEFAULT 'UGX',
    rate REAL NOT NULL,
    effective_date TEXT NOT NULL,
    notes TEXT,
    created_by INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  )`);
}

// GET /api/exchange-rates — latest rates list
router.get('/', auth, async (req, res) => {
  try {
    await ensureTable();
    const result = await db.query(`
      SELECT er.*, u.full_name as created_by_name,
        CASE WHEN er.id = (
          SELECT id FROM exchange_rates WHERE from_currency = er.from_currency AND to_currency = er.to_currency
          ORDER BY effective_date DESC, created_at DESC LIMIT 1
        ) THEN 1 ELSE 0 END as is_current
      FROM exchange_rates er
      LEFT JOIN users u ON er.created_by = u.id
      ORDER BY er.effective_date DESC, er.created_at DESC
      LIMIT 50
    `, []);
    res.json({ data: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/exchange-rates/current — single latest USD→UGX rate
router.get('/current', async (req, res) => {
  try {
    await ensureTable();
    const result = await db.query(`
      SELECT rate FROM exchange_rates
      WHERE from_currency = 'USD' AND to_currency = 'UGX'
      ORDER BY effective_date DESC, created_at DESC
      LIMIT 1
    `, []);
    const rate = result.rows.length > 0 ? result.rows[0].rate : 3800;
    res.json({ data: { rate, from_currency: 'USD', to_currency: 'UGX' } });
  } catch (error) {
    res.json({ data: { rate: 3800, from_currency: 'USD', to_currency: 'UGX' } });
  }
});

// POST /api/exchange-rates — add new rate (admin only)
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    await ensureTable();
    const { from_currency = 'USD', to_currency = 'UGX', rate, effective_date, notes } = req.body;
    if (!rate || !effective_date) return res.status(400).json({ error: 'rate and effective_date are required' });
    if (isNaN(Number(rate)) || Number(rate) <= 0) return res.status(400).json({ error: 'rate must be a positive number' });

    const result = await db.query(`
      INSERT INTO exchange_rates (from_currency, to_currency, rate, effective_date, notes, created_by)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `, [from_currency.toUpperCase(), to_currency.toUpperCase(), Number(rate), effective_date, notes || null, req.user.id]);

    await db.saveDb();
    res.status(201).json({ data: result.rows[0], message: 'Exchange rate added' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/exchange-rates/:id (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    await db.query('DELETE FROM exchange_rates WHERE id = $1', [req.params.id]);
    await db.saveDb();
    res.json({ message: 'Rate deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
module.exports.getCurrentRate = async () => {
  try {
    await ensureTable();
    const result = await db.query(`
      SELECT rate FROM exchange_rates
      WHERE from_currency = 'USD' AND to_currency = 'UGX'
      ORDER BY effective_date DESC, created_at DESC LIMIT 1
    `, []);
    return result.rows.length > 0 ? result.rows[0].rate : 3800;
  } catch {
    return 3800;
  }
};
