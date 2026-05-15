const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

console.log('🚀 Running Industrial Inventory System Migration...\n');

async function runMigration() {
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(path.join(__dirname, 'car_tracking.db'));
  const db = new SQL.Database(buffer);
  
  const sql = fs.readFileSync(path.join(__dirname, 'migrations', '008_industrial_inventory_system.sql'), 'utf8');
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 15 && (s.includes('ALTER') || s.includes('CREATE')));
  
  console.log(`Found ${statements.length} statements\n`);
  
  let success = 0, skipped = 0, errors = 0;
  
  statements.forEach((stmt, i) => {
    const preview = stmt.substring(0, 70).replace(/\s+/g, ' ');
    try {
      db.run(stmt);
      success++;
      console.log(`✓ [${i+1}/${statements.length}] ${preview}...`);
    } catch (e) {
      if (e.message.includes('duplicate')) {
        skipped++;
        console.log(`⚠ [${i+1}/${statements.length}] Column exists`);
      } else {
        errors++;
        console.log(`✗ [${i+1}/${statements.length}] ${e.message.substring(0, 60)}`);
      }
    }
  });
  
  console.log('\n💾 Saving database...');
  fs.writeFileSync(path.join(__dirname, 'car_tracking.db'), Buffer.from(db.export()));
  db.close();
  
  console.log('\n' + '='.repeat(70));
  console.log(`✓ Success: ${success} | ⚠ Skipped: ${skipped} | ✗ Errors: ${errors}`);
  console.log('='.repeat(70));
  
  if (errors === 0) {
    console.log('\n✅ Migration completed successfully!');
    console.log('📦 Industrial-grade inventory system is ready');
  }
}

runMigration().catch(err => {
  console.error('❌ Fatal:', err.message);
  process.exit(1);
});
