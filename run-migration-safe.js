const db = require('./backend/db');
const fs = require('fs');
const path = require('path');

console.log('🚀 Running Industrial Inventory System Migration...\n');

const sqlFile = path.join(__dirname, 'backend', 'migrations', '008_industrial_inventory_system.sql');
const sql = fs.readFileSync(sqlFile, 'utf8');

// Split by semicolons and filter out comments
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 15 && !s.startsWith('--') && s.includes('ALTER') || s.includes('CREATE'));

let success = 0;
let skipped = 0;
let errors = 0;

async function runMigration() {
  // Wait for db to be ready
  const database = await db;
  
  for (let index = 0; index < statements.length; index++) {
    const stmt = statements[index];
    const preview = stmt.substring(0, 80).replace(/\n/g, ' ').replace(/\s+/g, ' ');
    try {
      database.run(stmt);
      db.saveDb(); // Save after each successful statement
      success++;
      console.log(`✓ [${index + 1}/${statements.length}] ${preview}...`);
    } catch (e) {
      const errMsg = e.message || String(e);
      if (errMsg.includes('duplicate') || errMsg.includes('already exists')) {
        skipped++;
        console.log(`⚠ [${index + 1}/${statements.length}] Already exists, skipping`);
      } else {
        errors++;
        console.log(`✗ [${index + 1}/${statements.length}] Error: ${errMsg.substring(0, 80)}`);
      }
    }
  }
  
  printSummary();
}

function printSummary() {
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
  } else if (errors < 5) {
    console.log('\n⚠ Migration completed with minor issues');
  } else {
    console.log('\n❌ Migration had significant errors');
    process.exit(1);
  }
}

runMigration().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
