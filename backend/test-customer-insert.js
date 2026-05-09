const db = require('./db');

db.dbReady.then(async () => {
  try {
    console.log('🔍 TESTING CUSTOMER CREATION...\n');
    
    // Check if dealership exists
    const dealerships = db.getDb().exec('SELECT id, name, status FROM dealerships');
    console.log('Dealerships:');
    if (dealerships.length > 0) {
      console.log('Columns:', dealerships[0].columns);
      dealerships[0].values.forEach(row => console.log(row));
    } else {
      console.log('NO DEALERSHIPS FOUND!');
    }
    
    console.log('\n');
    
    // Check customers table structure
    const tableInfo = db.getDb().exec('PRAGMA table_info(customers)');
    console.log('Customers table structure:');
    if (tableInfo.length > 0) {
      console.log('Columns:', tableInfo[0].columns);
      tableInfo[0].values.forEach(row => console.log(row));
    }
    
    console.log('\n');
    
    // Try to insert a customer
    console.log('Attempting to insert customer...');
    try {
      db.getDb().run(`
        INSERT INTO customers (full_name, phone, email, national_id, address, dealership_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `, ['NAMUKISA JOAN', '0708510330', 'kp@gmail.com', '', 'P.O.BOX 90 NAMAYINGO', 1]);
      
      // Save database
      const data = db.getDb().export();
      const fs = require('fs');
      const path = require('path');
      fs.writeFileSync(path.join(__dirname, 'car_tracking.db'), Buffer.from(data));
      
      console.log('✅ Customer inserted successfully!');
      
      // Verify
      const customers = db.getDb().exec('SELECT * FROM customers');
      console.log('\nCustomers in database:');
      if (customers.length > 0) {
        console.log('Columns:', customers[0].columns);
        customers[0].values.forEach(row => console.log(row));
      }
    } catch (insertError) {
      console.error('❌ Insert failed:', insertError.message);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
});
