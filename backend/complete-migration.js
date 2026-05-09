const db = require('./db');

db.dbReady.then(() => {
  console.log('Adding missing schema elements...\n');
  
  // Add capacity_tons to vehicles
  try {
    db.getDb().run('ALTER TABLE vehicles ADD COLUMN capacity_tons REAL');
    db.saveDb();
    console.log('✓ Added capacity_tons to vehicles');
  } catch(e) {
    console.log('  capacity_tons:', e.message);
  }
  
  // Create tracking_events table
  try {
    db.getDb().run(`
      CREATE TABLE tracking_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        event_type TEXT NOT NULL,
        location TEXT NOT NULL,
        description TEXT,
        event_date TEXT NOT NULL,
        latitude REAL,
        longitude REAL,
        created_by INTEGER,
        created_at TEXT DEFAULT (datetime('now')),
        notes TEXT
      )
    `);
    db.saveDb();
    console.log('✓ Created tracking_events table');
  } catch(e) {
    console.log('  tracking_events:', e.message);
  }
  
  // Add indexes
  try {
    db.getDb().run('CREATE INDEX idx_tracking_events_order ON tracking_events(order_id)');
    db.saveDb();
    console.log('✓ Created index on tracking_events');
  } catch(e) {
    console.log('  index:', e.message);
  }
  
  // Add more fields to import_orders
  try {
    db.getDb().run('ALTER TABLE import_orders ADD COLUMN current_location TEXT');
    db.saveDb();
    console.log('✓ Added current_location to import_orders');
  } catch(e) {
    console.log('  current_location:', e.message);
  }
  
  // Add more fields to shipping
  const shippingFields = [
    'border_point TEXT',
    'final_destination TEXT', 
    'customs_cleared_date TEXT'
  ];
  
  shippingFields.forEach(field => {
    try {
      const fieldName = field.split(' ')[0];
      db.getDb().run(`ALTER TABLE shipping ADD COLUMN ${field}`);
      db.saveDb();
      console.log(`✓ Added ${fieldName} to shipping`);
    } catch(e) {
      if (!e.message.includes('duplicate')) {
        console.log(`  ${field}:`, e.message);
      }
    }
  });
  
  console.log('\n✅ Migration complete!\n');
  
  // Show final schema
  const vehiclesSchema = db.getDb().exec("PRAGMA table_info(vehicles)");
  const hasCapacity = vehiclesSchema[0].values.some(v => v[1] === 'capacity_tons');
  console.log('Vehicles has capacity_tons:', hasCapacity);
  
  const trackingExists = db.getDb().exec("SELECT name FROM sqlite_master WHERE type='table' AND name='tracking_events'");
  console.log('Tracking_events table exists:', trackingExists.length > 0);
  
  process.exit(0);
});
