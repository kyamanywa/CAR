const db = require('./db');

db.dbReady.then(async () => {
  try {
    console.log('Adding quantity column to local_sales...');
    
    // Add quantity column
    await db.query('ALTER TABLE local_sales ADD COLUMN quantity INTEGER DEFAULT 1');
    
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
