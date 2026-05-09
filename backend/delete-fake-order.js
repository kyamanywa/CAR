const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'car_tracking.db');

(async () => {
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(buffer);
  
  console.log('Deleting fake order ORD-SAMPLE001...');
  
  // Delete order_vehicles first
  db.run(`DELETE FROM order_vehicles WHERE order_id IN (SELECT id FROM import_orders WHERE order_number = 'ORD-SAMPLE001')`);
  
  // Delete the order
  db.run(`DELETE FROM import_orders WHERE order_number = 'ORD-SAMPLE001'`);
  
  console.log('✓ Deleted');
  
  // Save database
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
  console.log('✓ Database saved');
  
  // Check remaining orders
  const orders = db.exec('SELECT id, order_number, dealership_id FROM import_orders');
  console.log('\nRemaining orders:');
  if (orders.length > 0 && orders[0].values.length > 0) {
    orders[0].values.forEach(row => console.log(`  Order #${row[0]}: ${row[1]} (Dealership ${row[2]})`));
  }
  
  db.close();
  process.exit(0);
})();
