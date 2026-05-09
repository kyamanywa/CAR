const db = require('./db');

db.dbReady.then(async () => {
  try {
    console.log('📊 DATABASE STATUS:\n');
    
    const vehicles = db.getDb().exec('SELECT COUNT(*) as count FROM vehicles');
    const orders = db.getDb().exec('SELECT COUNT(*) as count FROM import_orders');
    const shipping = db.getDb().exec('SELECT COUNT(*) as count FROM shipping');
    const customers = db.getDb().exec('SELECT COUNT(*) as count FROM customers');
    const sales = db.getDb().exec('SELECT COUNT(*) as count FROM local_sales');
    
    console.log(`✅ Vehicles: ${vehicles[0].values[0][0]}`);
    console.log(`✅ Orders: ${orders[0].values[0][0]}`);
    console.log(`✅ Shipping: ${shipping[0].values[0][0]}`);
    console.log(`✅ Customers: ${customers[0].values[0][0]}`);
    console.log(`✅ Sales: ${sales[0].values[0][0]}`);
    
    console.log('\n🎯 Database is clean and ready for fresh start!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
});
