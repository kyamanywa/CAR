const db = require('./db');

async function testConnection() {
  try {
    await db.dbReady;
    console.log('✅ Database connected successfully\n');
    
    const sqlDb = db.getDb();
    const tables = sqlDb.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
    
    if (tables && tables.length > 0 && tables[0].values) {
      console.log('📋 Tables:', tables[0].values.map(t => t[0]).join(', '));
      console.log('\n✅ Database is working!\n');
      
      // Test a query
      const dealerships = await db.query('SELECT * FROM dealerships LIMIT 3');
      console.log(`Found ${dealerships.rows.length} dealerships in database`);
      dealerships.rows.forEach(d => console.log(`  - ${d.name} (${d.country})`));
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

testConnection();
