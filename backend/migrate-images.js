const db = require('./db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    await db.dbReady;
    
    console.log('Running migration: Add image_url to vehicles table...');
    
    const sql = fs.readFileSync(
      path.join(__dirname, 'migrations', '005_add_vehicle_images.sql'),
      'utf8'
    );
    
    db.getDb().exec(sql);
    await db.saveDb();
    
    console.log('✓ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
