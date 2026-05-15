const db = require('./db');

db.dbReady.then(() => {
  console.log('\n=== LOCAL_SALES TABLE ===');
  const result = db.getDb().exec("SELECT sql FROM sqlite_master WHERE type='table' AND name='local_sales'");
  console.log(result[0]?.values[0]?.[0] || 'Table not found');
  process.exit(0);
});
