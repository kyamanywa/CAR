require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/dealerships', require('./routes/dealerships'));
app.use('/api/system', require('./routes/system'));
app.use('/api/foreign-bonds', require('./routes/foreignBond'));
app.use('/api/ugandan-bonds', require('./routes/dealerships')); // Alias for backwards compatibility
app.use('/api/import-orders', require('./routes/importOrder'));
app.use('/api/shipping', require('./routes/shipping'));
app.use('/api/border-clearance', require('./routes/borderClearance'));
app.use('/api/taxes', require('./routes/tax'));
app.use('/api/local-sales', require('./routes/localSales'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/subscriptions', require('./routes/subscriptions')); // NEW: Subscription system
app.use('/api/team', require('./middleware/auth'), require('./routes/team')); // Team management
app.use('/api/subscription-info', require('./middleware/auth'), require('./routes/subscription-info')); // Subscription visibility
app.use('/api/reference-data', require('./routes/referenceData')); // Reference data management
app.use('/api/tracking', require('./routes/tracking')); // Tracking events system
app.use('/api/usage', require('./routes/usage')); // Usage limits and statistics
app.use('/api/payments', require('./middleware/auth'), require('./routes/payments')); // Payment processing (Flutterwave)
app.use('/api/csv', require('./middleware/auth'), require('./routes/csvImport')); // CSV import

// Start subscription monitor
const subscriptionMonitor = require('./services/subscriptionMonitor');
subscriptionMonitor.startSubscriptionMonitor();

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Car Tracking API is running' });
});

const PORT = process.env.PORT || 3000;

// Wait for database to be ready before starting server
db.dbReady.then(() => {
  app.listen(PORT, () => {
    console.log(`🚗 Car Tracking API running on port ${PORT}`);
    console.log(`📊 Using SQLite database`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
