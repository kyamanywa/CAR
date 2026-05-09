const db = require('./db');

db.dbReady.then(() => {
  console.log('Testing dashboard query for dealership 1:');
  
  const result = db.getDb().exec(`
    SELECT 
      COALESCE(SUM(quantity), 0) as total,
      COALESCE(SUM(CASE WHEN status = 'In Stock' THEN quantity ELSE 0 END), 0) as in_stock
    FROM vehicles 
    WHERE dealership_id = 1
  `);
  
  if (result.length > 0 && result[0].values.length > 0) {
    console.log('Dealership 1 vehicles:', result[0].values[0]);
  } else {
    console.log('No vehicles for dealership 1');
  }
  
  // Also check without filter
  const allResult = db.getDb().exec(`
    SELECT 
      COALESCE(SUM(quantity), 0) as total,
      foreign_bond_id,
      dealership_id
    FROM vehicles 
    GROUP BY foreign_bond_id, dealership_id
  `);
  
  console.log('\nAll vehicles grouped:');
  if (allResult.length > 0) {
    allResult[0].values.forEach(row => {
      console.log(`  Total: ${row[0]}, Foreign Bond: ${row[1]}, Dealership: ${row[2]}`);
    });
  }
  
  process.exit(0);
});
