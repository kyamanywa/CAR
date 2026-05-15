const db = require('./db');

db.dbReady.then(async () => {
  try {
    console.log('Adding unit_price_ugx column to local_sales...');
    
    // Add unit_price_ugx column
    await db.query('ALTER TABLE local_sales ADD COLUMN unit_price_ugx REAL');
    
    console.log('✓ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    if (error.message.includes('duplicate column')) {
      console.log('✓ Column already exists, skipping...');
      process.exit(0);
    } else {
      console.error('Migration failed:', error);
      process.exit(1);
    }
  }
});
