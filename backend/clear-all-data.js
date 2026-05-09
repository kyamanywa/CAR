const db = require('./db');

db.dbReady.then(async () => {
  try {
    console.log('🧹 CLEARING ALL TRANSACTIONAL DATA...\n');
    
    // Delete in correct order to avoid foreign key constraints
    console.log('Deleting local_sales...');
    db.getDb().run('DELETE FROM local_sales');
    
    console.log('Deleting shipping records...');
    db.getDb().run('DELETE FROM shipping');
    
    console.log('Deleting order_vehicles...');
    db.getDb().run('DELETE FROM order_vehicles');
    
    console.log('Deleting import_orders...');
    db.getDb().run('DELETE FROM import_orders');
    
    console.log('Deleting customers...');
    db.getDb().run('DELETE FROM customers');
    
    console.log('Deleting all vehicles...');
    db.getDb().run('DELETE FROM vehicles');
    
    // Reset auto-increment counters
    console.log('Resetting auto-increment counters...');
    db.getDb().run('DELETE FROM sqlite_sequence WHERE name IN ("import_orders", "order_vehicles", "shipping", "vehicles", "local_sales", "customers")');
    
    // Save database
    const data = db.getDb().export();
    const fs = require('fs');
    const path = require('path');
    fs.writeFileSync(path.join(__dirname, 'car_tracking.db'), Buffer.from(data));
    
    console.log('\n✅ ALL DATA CLEARED SUCCESSFULLY!');
    console.log('\n📊 Remaining data:');
    
    // Verify what's left
    const makes = db.getDb().exec('SELECT COUNT(*) as count FROM makes');
    const models = db.getDb().exec('SELECT COUNT(*) as count FROM models');
    const vehicles = db.getDb().exec('SELECT COUNT(*) as count FROM vehicles');
    const orders = db.getDb().exec('SELECT COUNT(*) as count FROM import_orders');
    const shipping = db.getDb().exec('SELECT COUNT(*) as count FROM shipping');
    
    console.log(`   Makes: ${makes[0].values[0][0]}`);
    console.log(`   Models: ${models[0].values[0][0]}`);
    console.log(`   Vehicles: ${vehicles[0].values[0][0]}`);
    console.log(`   Orders: ${orders[0].values[0][0]}`);
    console.log(`   Shipping: ${shipping[0].values[0][0]}`);
    
    console.log('\n✨ You can now start fresh!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
});
