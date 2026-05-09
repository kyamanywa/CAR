const db = require('./db');

const migrations = `
-- Drop existing tables in correct order
DROP TABLE IF EXISTS local_sales;
DROP TABLE IF EXISTS taxes;
DROP TABLE IF EXISTS border_clearance;
DROP TABLE IF EXISTS shipping;
DROP TABLE IF EXISTS import_orders;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS vehicles;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS dealerships;
DROP TABLE IF EXISTS foreign_bonds;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  dealership_id INTEGER REFERENCES dealerships(id),
  foreign_bond_id INTEGER REFERENCES foreign_bonds(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Foreign Bonds (Japan, UAE, UK car yards)
CREATE TABLE IF NOT EXISTS foreign_bonds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  city TEXT,
  address TEXT,
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  license_number TEXT,
  specialization TEXT,
  status TEXT DEFAULT 'Active',
  subscription_plan TEXT DEFAULT 'Free Trial',
  subscription_amount REAL DEFAULT 0,
  subscription_status TEXT DEFAULT 'Active',
  subscription_start_date TEXT DEFAULT (datetime('now')),
  subscription_end_date TEXT,
  payment_method TEXT,
  last_payment_date TEXT,
  next_payment_date TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Dealerships (Subscribers - car dealerships from any country)
CREATE TABLE IF NOT EXISTS dealerships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  license_number TEXT,
  country TEXT,
  city TEXT,
  address TEXT,
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  specialization TEXT,
  status TEXT DEFAULT 'Active',
  subscription_plan TEXT DEFAULT 'Free Trial',
  subscription_amount REAL DEFAULT 0,
  subscription_status TEXT DEFAULT 'Active',
  subscription_start_date TEXT DEFAULT (datetime('now')),
  subscription_end_date TEXT,
  payment_method TEXT,
  last_payment_date TEXT,
  next_payment_date TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Vehicles
CREATE TABLE IF NOT EXISTS vehicles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chassis_number TEXT UNIQUE NOT NULL,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER,
  color TEXT,
  engine_cc INTEGER,
  mileage INTEGER,
  fuel_type TEXT,
  transmission TEXT,
  body_type TEXT,
  purchase_price_usd REAL,
  foreign_bond_id INTEGER REFERENCES foreign_bonds(id),
  dealership_id INTEGER REFERENCES dealerships(id),
  status TEXT DEFAULT 'Available',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Customers (linked to specific bonds for multi-tenancy)
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  national_id TEXT,
  address TEXT,
  dealership_id INTEGER REFERENCES dealerships(id),
  created_at TEXT DEFAULT (datetime('now'))
);

-- Import Orders
CREATE TABLE IF NOT EXISTS import_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT UNIQUE NOT NULL,
  foreign_bond_id INTEGER REFERENCES foreign_bonds(id),
  dealership_id INTEGER REFERENCES dealerships(id),
  total_amount_usd REAL,
  order_status TEXT DEFAULT 'Pending',
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Order Vehicles (many-to-many)
CREATE TABLE IF NOT EXISTS order_vehicles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER REFERENCES import_orders(id),
  vehicle_id INTEGER REFERENCES vehicles(id),
  created_at TEXT DEFAULT (datetime('now'))
);

-- Shipping
CREATE TABLE IF NOT EXISTS shipping (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER REFERENCES import_orders(id),
  bl_number TEXT,
  container_number TEXT,
  vessel_name TEXT,
  departure_port TEXT,
  arrival_port TEXT,
  departure_date TEXT,
  estimated_arrival TEXT,
  actual_arrival TEXT,
  shipping_status TEXT DEFAULT 'Pending',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Border Clearance
CREATE TABLE IF NOT EXISTS border_clearance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER REFERENCES import_orders(id),
  border_point TEXT NOT NULL,
  ura_declaration_number TEXT,
  customs_cleared_date TEXT,
  inspection_date TEXT,
  release_date TEXT,
  clearance_status TEXT DEFAULT 'Pending',
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Vehicle Taxes
CREATE TABLE IF NOT EXISTS vehicle_taxes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER REFERENCES import_orders(id),
  vehicle_id INTEGER REFERENCES vehicles(id),
  cif_value_usd REAL,
  cif_value_ugx REAL,
  exchange_rate REAL,
  import_duty_ugx REAL,
  vat_ugx REAL,
  environmental_levy_ugx REAL,
  infrastructure_levy_ugx REAL,
  withholding_tax_ugx REAL,
  total_tax_ugx REAL,
  payment_status TEXT DEFAULT 'Pending',
  payment_date TEXT,
  payment_reference TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Local Sales
CREATE TABLE IF NOT EXISTS local_sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_number TEXT UNIQUE NOT NULL,
  vehicle_id INTEGER REFERENCES vehicles(id),
  dealership_id INTEGER REFERENCES dealerships(id),
  customer_id INTEGER REFERENCES customers(id),
  total_cost_ugx REAL,
  selling_price_ugx REAL,
  amount_paid_ugx REAL DEFAULT 0,
  payment_status TEXT DEFAULT 'Pending',
  sale_date TEXT DEFAULT (datetime('now')),
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- System Notifications (for admin to send to dealerships)
CREATE TABLE IF NOT EXISTS system_notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  target TEXT DEFAULT 'all',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_foreign_bond ON vehicles(foreign_bond_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_dealership ON vehicles(dealership_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON import_orders(order_status);
CREATE INDEX IF NOT EXISTS idx_shipping_bl ON shipping(bl_number);
CREATE INDEX IF NOT EXISTS idx_clearance_border ON border_clearance(border_point);
`;

async function migrate() {
  try {
    console.log('Waiting for database to initialize...');
    await db.dbReady;
    console.log('Running migrations...');
    db.exec(migrations);
    
    // Add foreign_bond_id column if it doesn't exist
    try {
      db.exec('ALTER TABLE users ADD COLUMN foreign_bond_id INTEGER REFERENCES foreign_bonds(id)');
      console.log('Added foreign_bond_id column to users table');
    } catch (e) {
      console.log('foreign_bond_id column already exists or handled by CREATE TABLE');
    }
    
    // Add sale_price column to vehicles if it doesn't exist
    try {
      db.exec('ALTER TABLE vehicles ADD COLUMN sale_price REAL');
      console.log('Added sale_price column to vehicles table');
    } catch (e) {
      console.log('sale_price column already exists or handled by CREATE TABLE');
    }
    
    // Add subscription columns to foreign_bonds
    const foreignBondColumns = [
      'license_number TEXT',
      'subscription_plan TEXT DEFAULT "Free Trial"',
      'subscription_amount REAL DEFAULT 0',
      'subscription_status TEXT DEFAULT "Active"',
      'subscription_start_date TEXT',
      'subscription_end_date TEXT',
      'payment_method TEXT',
      'last_payment_date TEXT',
      'next_payment_date TEXT'
    ];
    
    for (const col of foreignBondColumns) {
      try {
        const colName = col.split(' ')[0];
        db.exec(`ALTER TABLE foreign_bonds ADD COLUMN ${col}`);
        console.log(`Added ${colName} column to foreign_bonds table`);
      } catch (e) {
        // Column already exists
      }
    }
    
    // Add subscription columns to dealerships
    const dealershipColumns = [
      'subscription_plan TEXT DEFAULT "Free Trial"',
      'subscription_amount REAL DEFAULT 0',
      'subscription_status TEXT DEFAULT "Active"',
      'subscription_start_date TEXT',
      'subscription_end_date TEXT',
      'payment_method TEXT',
      'last_payment_date TEXT',
      'next_payment_date TEXT'
    ];
    
    for (const col of dealershipColumns) {
      try {
        const colName = col.split(' ')[0];
        db.exec(`ALTER TABLE dealerships ADD COLUMN ${col}`);
        console.log(`Added ${colName} column to dealerships table`);
      } catch (e) {
        // Column already exists
      }
    }
    
    db.saveDb();
    console.log('✅ Migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
