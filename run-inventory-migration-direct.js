const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'backend', 'car_tracking.db');
const sqlFile = path.join(__dirname, 'backend', 'migrations', '008_industrial_inventory_system.sql');

let success = 0;
let skipped = 0;
let errors = 0;

console.log('🚀 Running Industrial Inventory System Migration...\n');

async function runMigration() {
  // Initialize sql.js
  const SQL = await initSqlJs();
  
  // Load existing database
  const buffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(buffer);
  
  // Read migration SQL
  const sql = fs.readFileSync(sqlFile, 'utf8');
  
  // Split by semicolons and filter
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 15 && !s.startsWith('--') && (s.includes('ALTER') || s.includes('CREATE') || s.includes('INDEX')));
  
  console.log(`Found ${statements.length} statements to execute\n`);
  
  for (let index = 0; index < statements.length; index++) {
    const stmt = statements[index];
    const preview = stmt.substring(0, 80).replace(/\n/g, ' ').replace(/\s+/g, ' ');
    try {
      db.run(stmt);
      success++;
      console.log(`✓ [${index + 1}/${statements.length}] ${preview}...`);
    } catch (e) {
      const errMsg = e.message || String(e);
      if (errMsg.includes('duplicate') || errMsg.includes('already exists')) {
        skipped++;
        console.log(`⚠ [${index + 1}/${statements.length}] Already exists`);
      } else {
        errors++;
        console.log(`✗ [${index + 1}/${statements.length}] Error: ${errMsg.substring(0, 100)}`);
      }
    }
  }
  
  // Save database
  console.log('\n💾 Saving database...');
  const data = db.export();
  const newBuffer = Buffer.from(data);
  fs.writeFileSync(dbPath, newBuffer);
  
  // Print summary
  console.log('\n' + '='.repeat(70));
  console.log('MIGRATION COMPLETE');
  console.log('='.repeat(70));
  console.log(`✓ Successfully executed: ${success} statements`);
  console.log(`⚠ Skipped (already exists): ${skipped} statements`);
  console.log(`✗ Errors: ${errors} statements`);
  console.log('='.repeat(70));

  if (errors === 0) {
    console.log('\n✅ All changes applied successfully!');
    console.log('📦 Database now has full industrial-grade inventory fields');
    console.log('\nNew Features Added:');
    console.log('  • Delivery date tracking (expected & actual)');
    console.log('  • Warehouse location & parking bay');
    console.log('  • Complete documentation status');
    console.log('  • Insurance tracking');
    console.log('  • Inspection history');
    console.log('  • Service & maintenance records');
    console.log('  • Detailed cost breakdown');
    console.log('  • Sales & marketing status');
    console.log('  • Enhanced vehicle specifications');
  } else if (errors < 10) {
    console.log('\n⚠ Migration completed with some issues');
  } else {
    console.log('\n❌ Migration had significant errors');
    process.exit(1);
  }
  
  db.close();
}

runMigration().catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
