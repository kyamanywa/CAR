const db = require('./db');

db.dbReady.then(async () => {
  console.log('Creating payment_transactions table...');
  
  const sql = `
    CREATE TABLE IF NOT EXISTS payment_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dealership_id INTEGER NOT NULL,
      tx_ref TEXT NOT NULL UNIQUE,
      transaction_id TEXT,
      amount REAL NOT NULL,
      plan TEXT NOT NULL,
      duration_months INTEGER DEFAULT 1,
      status TEXT DEFAULT 'pending',
      payment_method TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (dealership_id) REFERENCES dealerships(id)
    )
  `;
  
  db.getDb().run(sql);
  
  const data = db.getDb().export();
  const fs = require('fs');
  fs.writeFileSync('car_tracking.db', Buffer.from(data));
  
  console.log('✅ payment_transactions table created');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
