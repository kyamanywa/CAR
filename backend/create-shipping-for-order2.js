const db = require('./db');

db.dbReady.then(async () => {
  try {
    console.log('Creating shipping record for Order 2...\n');
    
    // Check if shipping record exists
    const existing = db.getDb().exec('SELECT id FROM shipping WHERE order_id = 2');
    if (existing.length > 0 && existing[0].values.length > 0) {
      console.log('Shipping record already exists!');
      process.exit(0);
    }
    
    // Create shipping record
    const blNumber = 'BL-ORD-MKXQM81O-' + Date.now();
    const containerNumber = 'CONT-' + Date.now().toString().slice(-6);
    
    db.getDb().run(`
      INSERT INTO shipping (
        order_id, bl_number, container_number,
        departure_port, arrival_port,
        shipping_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `, [2, blNumber, containerNumber, 'Japan', 'Mombasa, Kenya', 'In Transit']);
    
    // Save database
    const data = db.getDb().export();
    const fs = require('fs');
    const path = require('path');
    fs.writeFileSync(path.join(__dirname, 'car_tracking.db'), Buffer.from(data));
    
    console.log('✅ Shipping record created successfully!');
    console.log(`   BL Number: ${blNumber}`);
    console.log(`   Container: ${containerNumber}`);
    console.log(`   Status: In Transit\n`);
    
    // Verify
    const verify = db.getDb().exec('SELECT * FROM shipping WHERE order_id = 2');
    if (verify.length > 0) {
      console.log('Verification:');
      console.log('Columns:', verify[0].columns);
      console.log('Values:', verify[0].values[0]);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
});
