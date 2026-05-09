const db = require('./db');

db.dbReady.then(() => {
  console.log('=== ORDER 2 DETAILS ===');
  const order = db.getDb().exec('SELECT * FROM import_orders WHERE id = 2');
  if (order.length > 0) {
    console.log('Columns:', order[0].columns);
    console.log('Values:', order[0].values[0]);
  }
  
  console.log('\n=== SHIPPING FOR ORDER 2 ===');
  const ship = db.getDb().exec('SELECT * FROM shipping WHERE order_id = 2');
  if (ship.length > 0) {
    console.log('Columns:', ship[0].columns);
    ship[0].values.forEach(row => console.log(row));
  } else {
    console.log('NO SHIPPING RECORD FOR ORDER 2!');
  }
  
  console.log('\n=== ALL SHIPPING RECORDS ===');
  const allShip = db.getDb().exec('SELECT id, order_id, bl_number, shipping_status FROM shipping');
  if (allShip.length > 0) {
    console.log('Columns:', allShip[0].columns);
    allShip[0].values.forEach(row => console.log(row));
  }
  
  console.log('\n=== VEHICLES IN ORDER 2 ===');
  const vehicles = db.getDb().exec(`
    SELECT ov.quantity, v.make, v.model, v.status, v.dealership_id, v.foreign_bond_id
    FROM order_vehicles ov 
    JOIN vehicles v ON ov.vehicle_id = v.id 
    WHERE ov.order_id = 2
  `);
  if (vehicles.length > 0) {
    console.log('Columns:', vehicles[0].columns);
    vehicles[0].values.forEach(row => console.log(row));
  }
  
  process.exit(0);
});
