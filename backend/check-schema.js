const db = require('./db');

db.dbReady.then(() => {
  console.log('\n=== VEHICLES TABLE ===');
  const vehicles = db.getDb().exec("SELECT sql FROM sqlite_master WHERE type='table' AND name='vehicles'");
  console.log(vehicles[0]?.values[0]?.[0] || 'Table not found');
  
  console.log('\n=== IMPORT_ORDERS TABLE ===');
  const orders = db.getDb().exec("SELECT sql FROM sqlite_master WHERE type='table' AND name='import_orders'");
  console.log(orders[0]?.values[0]?.[0] || 'Table not found');
  
  console.log('\n=== SHIPPING TABLE ===');
  const shipping = db.getDb().exec("SELECT sql FROM sqlite_master WHERE type='table' AND name='shipping'");
  console.log(shipping[0]?.values[0]?.[0] || 'Table not found');
  
  console.log('\n=== ORDER_VEHICLES TABLE ===');
  const orderVehicles = db.getDb().exec("SELECT sql FROM sqlite_master WHERE type='table' AND name='order_vehicles'");
  console.log(orderVehicles[0]?.values[0]?.[0] || 'Table not found');
  
  console.log('\n=== TRACKING_EVENTS TABLE ===');
  const tracking = db.getDb().exec("SELECT sql FROM sqlite_master WHERE type='table' AND name='tracking_events'");
  console.log(tracking[0]?.values[0]?.[0] || 'Table not found');
  
  process.exit(0);
});
