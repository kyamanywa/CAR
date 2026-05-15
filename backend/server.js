require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const db = require('./db');

const app = express();

// Security headers
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// Rate limiting — stricter on auth routes
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // 30 login attempts per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later.' }
});

app.use(globalLimiter);

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded vehicle images
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/dealerships', require('./routes/dealerships'));
app.use('/api/system', require('./routes/system'));
app.use('/api/foreign-bonds', require('./routes/foreignBond'));
app.use('/api/ugandan-bonds', require('./routes/dealerships')); // Alias for backwards compatibility
app.use('/api/import-orders', require('./routes/importOrder'));
app.use('/api/shipping', require('./routes/shipping'));
app.use('/api/border-clearance', require('./routes/borderClearance'));
app.use('/api/taxes', require('./routes/tax'));
app.use('/api/local-sales', require('./routes/localSales'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/subscriptions', require('./routes/subscriptions')); // NEW: Subscription system
app.use('/api/team', require('./middleware/auth'), require('./routes/team')); // Team management
app.use('/api/subscription-info', require('./middleware/auth'), require('./routes/subscription-info')); // Subscription visibility
app.use('/api/reference-data', require('./routes/referenceData')); // Reference data management
app.use('/api/tracking', require('./routes/tracking')); // Tracking events system
app.use('/api/usage', require('./routes/usage')); // Usage limits and statistics
app.use('/api/payments', require('./middleware/auth'), require('./routes/payments')); // Payment processing (Flutterwave)
app.use('/api/csv', require('./middleware/auth'), require('./routes/csvImport')); // CSV import
app.use('/api/exchange-rates', require('./routes/exchangeRates')); // Exchange rate management
app.use('/api/loans', require('./middleware/auth'), require('./routes/loans')); // Customer loan management
app.use('/api/notifications', require('./middleware/auth'), require('./routes/notifications')); // In-app notifications
app.use('/api/inspections', require('./middleware/auth'), require('./routes/inspections')); // Vehicle inspections
app.use('/api/audit-logs', require('./middleware/auth'), require('./routes/auditLogs')); // Audit trail
app.use('/api/test-drives', require('./middleware/auth'), require('./routes/testDrives')); // Test drive log
app.use('/api/expenses', require('./middleware/auth'), require('./routes/expenses')); // Expense tracking

// Start subscription monitor
const subscriptionMonitor = require('./services/subscriptionMonitor');
subscriptionMonitor.startSubscriptionMonitor();

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Car Tracking API is running' });
});

// Patch schema: ensure all required columns exist (safe to run on every startup)
async function ensureColumns() {
  const rawDb = db.getDb();
  const vehicleCols = [
    'sale_price_usd REAL',
    'quantity INTEGER DEFAULT 1',
    'image_url TEXT',
    'notes TEXT',
    'engine_number TEXT',
    'body_type TEXT',
    "source_type TEXT DEFAULT 'import'",
    'acquisition_cost_ugx REAL',
    'acquisition_source TEXT',
    "condition TEXT DEFAULT 'Good'",
    'mileage INTEGER',
  ];
  for (const col of vehicleCols) {
    try { rawDb.run(`ALTER TABLE vehicles ADD COLUMN ${col}`); } catch (_) {}
  }
  const importOrderCols = [
    'amount_paid_usd REAL DEFAULT 0',
    'payment_status TEXT DEFAULT \'Unpaid\'',
    'payment_notes TEXT',
  ];
  for (const col of importOrderCols) {
    try { rawDb.run(`ALTER TABLE import_orders ADD COLUMN ${col}`); } catch (_) {}
  }
  // Customer loan columns
  const customerCols = [
    "payment_type TEXT DEFAULT 'cash'",
    'occupation TEXT',
    'employer TEXT',
    'monthly_income REAL',
    'notes TEXT',
  ];
  for (const col of customerCols) {
    try { rawDb.run(`ALTER TABLE customers ADD COLUMN ${col}`); } catch (_) {}
  }
  // Customer loans table
  rawDb.run(`CREATE TABLE IF NOT EXISTS customer_loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    dealership_id INTEGER NOT NULL,
    vehicle_id INTEGER,
    loan_amount REAL NOT NULL,
    down_payment REAL DEFAULT 0,
    monthly_payment REAL,
    loan_term_months INTEGER,
    interest_rate REAL DEFAULT 0,
    lender_name TEXT,
    loan_reference TEXT,
    start_date TEXT,
    status TEXT DEFAULT 'active',
    remaining_balance REAL,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`);
  // Loan payment schedule
  rawDb.run(`CREATE TABLE IF NOT EXISTS loan_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    loan_id INTEGER NOT NULL REFERENCES customer_loans(id),
    amount REAL NOT NULL,
    payment_date TEXT NOT NULL,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`);
  // Test drive logs
  rawDb.run(`CREATE TABLE IF NOT EXISTS test_drives (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dealership_id INTEGER NOT NULL,
    vehicle_id INTEGER NOT NULL,
    customer_id INTEGER,
    customer_name TEXT,
    customer_phone TEXT,
    customer_id_number TEXT,
    sales_person TEXT,
    drive_date TEXT NOT NULL,
    start_time TEXT,
    end_time TEXT,
    outcome TEXT DEFAULT 'Undecided',
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`);
  // Dealership expenses
  rawDb.run(`CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dealership_id INTEGER NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    expense_date TEXT NOT NULL,
    receipt_ref TEXT,
    recorded_by INTEGER,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`);
  // Local sales extra columns
  const localSalesCols = [
    'discount_ugx REAL DEFAULT 0',
    'trade_in_vehicle TEXT',
    'trade_in_value_ugx REAL DEFAULT 0',
    'salesperson_name TEXT',
  ];
  for (const col of localSalesCols) {
    try { rawDb.run(`ALTER TABLE local_sales ADD COLUMN ${col}`); } catch (_) {}
  }
  // User profile extra columns
  const userCols = [
    'phone TEXT',
    'position TEXT',
    'profile_notes TEXT',
  ];
  for (const col of userCols) {
    try { rawDb.run(`ALTER TABLE users ADD COLUMN ${col}`); } catch (_) {}
  }
  db.saveDb();
  console.log('✓ Schema columns verified');

  // Audit logs table
  rawDb.run(`CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    resource_id TEXT,
    details TEXT,
    ip_address TEXT,
    status TEXT DEFAULT 'success',
    created_at TEXT DEFAULT (datetime('now'))
  )`);
  db.saveDb();
}

const PORT = process.env.PORT || 3000;

// Wait for database to be ready before starting server
db.dbReady.then(async () => {
  await ensureColumns();
  app.listen(PORT, () => {
    console.log(`🚗 Car Tracking API running on port ${PORT}`);
    console.log(`📊 Using SQLite database`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
