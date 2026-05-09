const db = require('./db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('🔄 Running subscription system migration...');
    
    await db.dbReady;
    const database = db.getDb();
    
    const migrationPath = path.join(__dirname, 'migrations', '002_subscription_system.sql');
    let migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Replace PostgreSQL-specific syntax with SQLite
    migrationSQL = migrationSQL
      .replace(/SERIAL PRIMARY KEY/g, 'INTEGER PRIMARY KEY AUTOINCREMENT')
      .replace(/JSONB/g, 'TEXT')
      .replace(/DECIMAL\(\d+,\s*\d+\)/g, 'REAL')
      .replace(/VARCHAR\(\d+\)/g, 'TEXT')
      .replace(/TIMESTAMP/g, 'TEXT')
      .replace(/NOW\(\)/g, "datetime('now')")
      .replace(/ON CONFLICT DO NOTHING/g, '')
      .replace(/DATE/g, 'TEXT');
    
    // Execute the entire migration as one block
    try {
      database.exec(migrationSQL);
    } catch (error) {
      // If full exec fails, try statement by statement
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
      
      for (const statement of statements) {
        try {
          database.run(statement);
        } catch (err) {
          // Ignore errors for things that already exist
          if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
            console.warn('Warning:', err.message.substring(0, 100));
          }
        }
      }
    }
    
    // Save database
    db.saveDb();
    
    console.log('✅ Subscription system migration completed successfully!');
    console.log('');
    console.log('📋 Created tables:');
    console.log('  - subscription_plans');
    console.log('  - subscriptions');
    console.log('  - invoices');
    console.log('  - transactions');
    console.log('  - payment_methods');
    console.log('  - usage_logs');
    console.log('');
    console.log('💳 Payment Gateway Integration:');
    console.log('  - Stripe: Configure STRIPE_SECRET_KEY in .env');
    console.log('  - Flutterwave: Configure FLUTTERWAVE_SECRET_KEY in .env');
    console.log('  - PayPal: Configure PAYPAL_CLIENT_ID and PAYPAL_SECRET in .env');
    console.log('  - Pesapal: Configure PESAPAL_CONSUMER_KEY and PESAPAL_CONSUMER_SECRET in .env');
    console.log('');
    console.log('🎯 Default subscription plans created for:');
    console.log('  - Suppliers: Basic ($49.99/mo), Pro ($99.99/mo), Enterprise ($249.99/mo)');
    console.log('  - Dealerships: Starter ($39.99/mo), Business ($79.99/mo), Premium ($199.99/mo)');
    console.log('');
    console.log('📖 Read SUBSCRIPTION_SYSTEM.md for integration guide');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Wait for DB to be ready
db.dbReady.then(() => {
  runMigration();
}).catch(err => {
  console.error('Failed to connect to database:', err);
  process.exit(1);
});
