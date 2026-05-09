const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'car_tracking.db');

async function migrateReferenceData() {
  const SQL = await initSqlJs();
  const dbBuffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(dbBuffer);

  console.log('Creating reference data tables...');

  // Create vehicle_makes table
  db.run(`
    CREATE TABLE IF NOT EXISTS vehicle_makes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      foreign_bond_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(name, foreign_bond_id)
    )
  `);

  // Create vehicle_models table
  db.run(`
    CREATE TABLE IF NOT EXISTS vehicle_models (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      make_id INTEGER NOT NULL,
      foreign_bond_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (make_id) REFERENCES vehicle_makes(id) ON DELETE CASCADE,
      UNIQUE(name, make_id, foreign_bond_id)
    )
  `);

  // Create vehicle_colors table
  db.run(`
    CREATE TABLE IF NOT EXISTS vehicle_colors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      foreign_bond_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(name, foreign_bond_id)
    )
  `);

  console.log('Reference data tables created successfully!');

  // Save the database
  const data = db.export();
  fs.writeFileSync(dbPath, data);
  db.close();

  console.log('Migration completed successfully!');
}

migrateReferenceData().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
