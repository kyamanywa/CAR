const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

console.log('Running Sales Role Consolidation Migration...\n');

async function runMigration() {
  const SQL = await initSqlJs();
  const dbPath = path.join(__dirname, 'car_tracking.db');
  const buffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(buffer);

  const sql = fs.readFileSync(path.join(__dirname, 'migrations', '009_salesperson_role.sql'), 'utf8');

  try {
    db.run(sql);
    console.log('Migration SQL executed successfully.');
  } catch (error) {
    console.error('Migration failed:', error.message);
    db.close();
    process.exit(1);
  }

  // Verify normalization
  const remaining = db.exec("SELECT COUNT(*) AS cnt FROM users WHERE role = 'salesperson'");
  const remainingCount = remaining?.[0]?.values?.[0]?.[0] || 0;

  const updated = db.exec("SELECT COUNT(*) AS cnt FROM users WHERE role = 'dealership_sales'");
  const salesCount = updated?.[0]?.values?.[0]?.[0] || 0;

  fs.writeFileSync(dbPath, Buffer.from(db.export()));
  db.close();

  console.log(`Legacy salesperson users remaining: ${remainingCount}`);
  console.log(`Current dealership_sales users: ${salesCount}`);
  console.log('\nRole consolidation completed.');
}

runMigration().catch((err) => {
  console.error('Fatal migration error:', err.message);
  process.exit(1);
});
