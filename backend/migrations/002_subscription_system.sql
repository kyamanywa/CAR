-- Subscription System Schema for Payment Gateway Integration

-- Subscription Plans Table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  target_user_type VARCHAR(50) NOT NULL, -- 'supplier' or 'dealership'
  price_monthly DECIMAL(10, 2),
  price_yearly DECIMAL(10, 2),
  currency VARCHAR(3) DEFAULT 'USD',
  features JSONB, -- Store plan features as JSON
  max_vehicles INTEGER,
  max_users INTEGER,
  max_orders_per_month INTEGER,
  commission_percentage DECIMAL(5, 2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Subscriptions Table (Active subscriptions for suppliers and dealerships)
CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  plan_id INTEGER REFERENCES subscription_plans(id),
  subscriber_type VARCHAR(50) NOT NULL, -- 'supplier' or 'dealership'
  subscriber_id INTEGER NOT NULL, -- foreign_bonds.id or dealerships.id
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'past_due', 'canceled', 'trial'
  billing_cycle VARCHAR(20) DEFAULT 'monthly', -- 'monthly' or 'yearly'
  current_period_start DATE,
  current_period_end DATE,
  trial_ends_at DATE,
  canceled_at TIMESTAMP,
  
  -- Payment Gateway Integration Fields
  payment_gateway VARCHAR(50), -- 'stripe', 'paypal', 'flutterwave', 'pesapal', etc.
  gateway_subscription_id VARCHAR(255), -- External subscription ID from gateway
  gateway_customer_id VARCHAR(255), -- External customer ID from gateway
  payment_method_id VARCHAR(255), -- Saved payment method
  
  -- Billing Info
  billing_email VARCHAR(255),
  billing_name VARCHAR(255),
  billing_phone VARCHAR(50),
  billing_address TEXT,
  
  -- Usage Tracking
  current_vehicles_count INTEGER DEFAULT 0,
  current_users_count INTEGER DEFAULT 0,
  current_month_orders INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(subscriber_type, subscriber_id)
);

-- Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  subscription_id INTEGER REFERENCES subscriptions(id),
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  subscriber_type VARCHAR(50) NOT NULL,
  subscriber_id INTEGER NOT NULL,
  
  -- Invoice Details
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  tax_amount DECIMAL(10, 2) DEFAULT 0,
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL,
  
  -- Payment Status
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'paid', 'failed', 'refunded'
  paid_at TIMESTAMP,
  due_date DATE,
  
  -- Payment Gateway Fields
  payment_gateway VARCHAR(50),
  gateway_invoice_id VARCHAR(255),
  gateway_payment_id VARCHAR(255),
  payment_method VARCHAR(50), -- 'card', 'mobile_money', 'bank_transfer', etc.
  
  -- Line Items (stored as JSON)
  line_items JSONB,
  
  -- Period
  period_start DATE,
  period_end DATE,
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Transactions Table (for commission tracking)
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  transaction_type VARCHAR(50) NOT NULL, -- 'subscription_payment', 'commission', 'refund'
  subscriber_type VARCHAR(50),
  subscriber_id INTEGER,
  
  -- Transaction Details
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  description TEXT,
  reference_id VARCHAR(255), -- Order ID, Invoice ID, etc.
  reference_type VARCHAR(50), -- 'order', 'invoice', 'sale'
  
  -- Payment Gateway
  payment_gateway VARCHAR(50),
  gateway_transaction_id VARCHAR(255),
  
  status VARCHAR(20) DEFAULT 'completed', -- 'pending', 'completed', 'failed', 'refunded'
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Payment Methods Table (for saved payment methods)
CREATE TABLE IF NOT EXISTS payment_methods (
  id SERIAL PRIMARY KEY,
  subscriber_type VARCHAR(50) NOT NULL,
  subscriber_id INTEGER NOT NULL,
  
  payment_gateway VARCHAR(50) NOT NULL,
  gateway_payment_method_id VARCHAR(255) NOT NULL,
  
  method_type VARCHAR(50), -- 'card', 'mobile_money', 'bank_account'
  is_default BOOLEAN DEFAULT false,
  
  -- Masked Details (for display)
  card_last4 VARCHAR(4),
  card_brand VARCHAR(50),
  mobile_number VARCHAR(50),
  
  expires_at DATE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Usage Logs (for tracking usage limits)
CREATE TABLE IF NOT EXISTS usage_logs (
  id SERIAL PRIMARY KEY,
  subscription_id INTEGER REFERENCES subscriptions(id),
  metric_type VARCHAR(50) NOT NULL, -- 'vehicles', 'users', 'orders', 'api_calls'
  metric_value INTEGER NOT NULL,
  logged_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_subscriber ON subscriptions(subscriber_type, subscriber_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_invoices_subscriber ON invoices(subscriber_type, subscriber_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_subscriber ON payment_methods(subscriber_type, subscriber_id);

-- Insert Default Subscription Plans
INSERT INTO subscription_plans (name, description, target_user_type, price_monthly, price_yearly, features, max_vehicles, max_users, max_orders_per_month) VALUES
-- Supplier Plans
('Supplier Basic', 'Perfect for small suppliers starting out', 'supplier', 49.99, 499.99, 
 '{"features": ["Up to 50 vehicles", "2 user accounts", "Basic analytics", "Email support"]}', 50, 2, 20),

('Supplier Pro', 'For growing supplier businesses', 'supplier', 99.99, 999.99,
 '{"features": ["Up to 200 vehicles", "5 user accounts", "Advanced analytics", "Priority support", "API access"]}', 200, 5, 100),

('Supplier Enterprise', 'For large-scale suppliers', 'supplier', 249.99, 2499.99,
 '{"features": ["Unlimited vehicles", "Unlimited users", "Custom analytics", "24/7 support", "Dedicated account manager", "Full API access"]}', NULL, NULL, NULL),

-- Dealership Plans
('Dealership Starter', 'Ideal for small dealerships', 'dealership', 39.99, 399.99,
 '{"features": ["Up to 30 vehicles", "3 user accounts", "Basic reports", "Email support"]}', 30, 3, 15),

('Dealership Business', 'For growing dealerships', 'dealership', 79.99, 799.99,
 '{"features": ["Up to 150 vehicles", "10 user accounts", "Advanced reports", "Priority support", "Multi-location support"]}', 150, 10, 80),

('Dealership Premium', 'For large dealership networks', 'dealership', 199.99, 1999.99,
 '{"features": ["Unlimited vehicles", "Unlimited users", "Custom reports", "24/7 support", "White-label option", "API access"]}', NULL, NULL, NULL)
ON CONFLICT DO NOTHING;

-- Add subscription_id column to foreign_bonds table if it doesn't exist
-- This links suppliers to their subscription
ALTER TABLE foreign_bonds ADD COLUMN IF NOT EXISTS subscription_id INTEGER REFERENCES subscriptions(id);
ALTER TABLE foreign_bonds ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'trial';

-- Add subscription_id column to dealerships table if it doesn't exist
-- This links dealerships to their subscription
ALTER TABLE dealerships ADD COLUMN IF NOT EXISTS subscription_id INTEGER REFERENCES subscriptions(id);
ALTER TABLE dealerships ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'trial';
