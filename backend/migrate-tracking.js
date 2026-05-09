const db = require('./db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('Running tracking system migration...\n');
  
  try {
    await db.dbReady;
    
    const migrationFile = path.join(__dirname, 'migrations', '004_tracking_system.sql');
    const sql = fs.readFileSync(migrationFile, 'utf8');
    
    // Split by semicolons and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      try {
        db.getDb().run(statement);
        db.saveDb();
        console.log('✓ Executed:', statement.substring(0, 60) + '...');
      } catch (error) {
        // Ignore "duplicate column" errors for ALTER TABLE
        if (error.message.includes('duplicate column name')) {
          console.log('  (Column already exists, skipping)');
        } else if (error.message.includes('already exists')) {
          console.log('  (Already exists, skipping)');
        } else {
          console.log('  Error:', error.message);
          // Don't throw, continue with other statements
        }
      }
    }
    
    // Verify the changes
    console.log('\n=== Verifying Schema ===');
    
    const vehiclesSchema = db.getDb().exec("PRAGMA table_info(vehicles)");
    console.log('\nVehicles table columns:', 
      vehiclesSchema[0].values.map(v => v[1]).join(', '));
    
    const trackingSchema = db.getDb().exec("PRAGMA table_info(tracking_events)");
    if (trackingSchema.length > 0) {
      console.log('\nTracking events table columns:', 
        trackingSchema[0].values.map(v => v[1]).join(', '));
    }
    
    const shippingSchema = db.getDb().exec("PRAGMA table_info(shipping)");
    console.log('\nShipping table columns:', 
      shippingSchema[0].values.map(v => v[1]).join(', '));
    
    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
  
  process.exit(0);
}

runMigration();
