const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, 'backend', 'car_tracking.db');
const db = new Database(dbPath);

const sqlFile = path.join(__dirname, 'backend', 'migrations', '008_industrial_inventory_system.sql');
const sql = fs.readFileSync(sqlFile, 'utf8');

// Split by semicolons and filter out comments and empty statements
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 10 && !s.startsWith('--'));

let success = 0;
let skipped = 0;
let errors = 0;

console.log('🚀 Starting Industrial Inventory System Migration...\n');

statements.forEach((stmt, index) => {
  const preview = stmt.substring(0, 70).replace(/\n/g, ' ');
  try {
    db.exec(stmt);
    success++;
    console.log(`✓ [${index + 1}] ${preview}...`);
  } catch (e) {
    if (e.message.includes('duplicate column')) {
      skipped++;
      console.log(`⚠ [${index + 1}] Column exists, skipping`);
    } else {
      errors++;
      console.log(`✗ [${index + 1}] Error: ${e.message.substring(0, 100)}`);
    }
  }
});

db.close();

console.log('\n' + '='.repeat(60));
console.log('MIGRATION SUMMARY');
console.log('='.repeat(60));
console.log(`✓ Successfully executed: ${success}`);
console.log(`⚠ Skipped (already exists): ${skipped}`);
console.log(`✗ Errors: ${errors}`);
console.log('='.repeat(60));

if (errors > 0) {
  process.exit(1);
} else {
  console.log('\n✅ Migration completed successfully!');
}
