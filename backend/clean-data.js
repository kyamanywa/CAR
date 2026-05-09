const db = require('./db');

async function cleanData() {
  try {
    await db.dbReady;
    
    console.log('=== VEHICLES IN TRANSIT ===');
    const inTransit = db.getDb().exec("SELECT id, make, model, status FROM vehicles WHERE status = 'In Transit'");
    if (inTransit.length > 0) {
      console.log('ID | Make | Model | Status');
      inTransit[0].values.forEach(row => console.log(row.join(' | ')));
      
      const vehicleIds = inTransit[0].values.map(row => row[0]);
      console.log('\n=== CHECKING ORDER LINKS ===');
      
      for (const vid of vehicleIds) {
        const orders = db.getDb().exec(`SELECT order_id FROM order_vehicles WHERE vehicle_id = ${vid}`);
        if (orders.length > 0 && orders[0].values.length > 0) {
          console.log(`Vehicle ${vid} linked to orders:`, orders[0].values.map(r => r[0]).join(', '));
          
          // Delete from order_vehicles
          db.getDb().exec(`DELETE FROM order_vehicles WHERE vehicle_id = ${vid}`);
        }
      }
      
      // Now delete the vehicles
      db.getDb().exec("DELETE FROM vehicles WHERE status = 'In Transit'");
      await db.saveDb();
      console.log('\n✓ Deleted In Transit vehicles');
    }
    
    const after = db.getDb().exec('SELECT COUNT(*) FROM vehicles');
    console.log('Remaining vehicles:', after[0].values[0][0]);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

cleanData();
