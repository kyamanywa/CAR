# 💳 SUBSCRIPTION SYSTEM DOCUMENTATION

## 🎯 Overview

Complete B2B SaaS subscription system ready for payment gateway integration.

---

## ✅ WHAT'S COMPLETED

### 1. Database Schema ✅
- **subscription_plans** - Pricing tiers for suppliers and dealerships
- **subscriptions** - Active subscriptions with billing info
- **invoices** - Payment records and billing history
- **transactions** - Commission and payment tracking
- **payment_methods** - Saved payment methods
- **usage_logs** - Usage tracking for plan limits

### 2. Default Plans Created ✅

**Supplier Plans:**
- **Basic** - $49.99/mo | 50 vehicles, 2 users, 20 orders/mo
- **Pro** - $99.99/mo | 200 vehicles, 5 users, 100 orders/mo
- **Enterprise** - $249.99/mo | Unlimited everything

**Dealership Plans:**
- **Starter** - $39.99/mo | 30 vehicles, 3 users, 15 orders/mo
- **Business** - $79.99/mo | 150 vehicles, 10 users, 80 orders/mo
- **Premium** - $199.99/mo | Unlimited everything

### 3. API Endpoints Created ✅

All endpoints are at: `http://localhost:3000/api/subscriptions`

#### Public (No Auth):
- `GET /plans` - Get all subscription plans
- `GET /plans/:id` - Get single plan
- `POST /webhook/:gateway` - Payment gateway webhooks

#### Authenticated Users:
- `GET /my-subscription` - Get current subscription
- `GET /my-invoices` - Get billing history
- `POST /subscriptions` - Create/upgrade subscription
- `POST /subscriptions/cancel` - Cancel subscription
- `GET /usage/check` - Check usage against limits

#### Admin Only:
- `POST /plans` - Create new plan
- `PUT /plans/:id` - Update plan
- `GET /subscriptions` - View all subscriptions
- `GET /invoices` - View all invoices

---

## 🔌 PAYMENT GATEWAY INTEGRATION GUIDE

### Supported Gateways:
1. **Stripe** (International cards)
2. **Flutterwave** (African mobile money + cards)
3. **PayPal** (International)
4. **Pesapal** (East African mobile money)

---

### STEP 1: Choose Your Gateway

#### Option A: Stripe (Recommended for International)
```bash
npm install stripe
```

Add to `.env`:
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### Option B: Flutterwave (Recommended for Uganda)
```bash
npm install flutterwave-node-v3
```

Add to `.env`:
```env
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-...
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST-...
```

#### Option C: PayPal
```bash
npm install @paypal/checkout-server-sdk
```

Add to `.env`:
```env
PAYPAL_CLIENT_ID=...
PAYPAL_SECRET=...
PAYPAL_MODE=sandbox # or 'live'
```

#### Option D: Pesapal
```bash
npm install pesapal-node
```

Add to `.env`:
```env
PESAPAL_CONSUMER_KEY=...
PESAPAL_CONSUMER_SECRET=...
PESAPAL_ENV=sandbox # or 'live'
```

---

### STEP 2: Implement Payment Gateway Integration

Create `backend/services/paymentGateway.js`:

```javascript
const Stripe = require('stripe');
// or const Flutterwave = require('flutterwave-node-v3');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

class PaymentGateway {
  // Create customer
  async createCustomer(email, name, metadata) {
    // Stripe:
    return await stripe.customers.create({
      email,
      name,
      metadata
    });
    
    // Flutterwave: Store customer in your DB
    // PayPal: Create customer profile
    // Pesapal: Use IPN callbacks
  }
  
  // Create subscription
  async createSubscription(customerId, priceId) {
    // Stripe:
    return await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent']
    });
    
    // Flutterwave: Create payment link
    // PayPal: Create billing agreement
    // Pesapal: Create recurring payment
  }
  
  // Cancel subscription
  async cancelSubscription(subscriptionId) {
    // Stripe:
    return await stripe.subscriptions.cancel(subscriptionId);
  }
  
  // Process one-time payment
  async processPayment(amount, currency, paymentMethod) {
    // Implement based on gateway
  }
}

module.exports = new PaymentGateway();
```

---

### STEP 3: Update Subscription Routes

In `backend/routes/subscriptions.js`, replace TODO comments:

```javascript
const paymentGateway = require('../services/paymentGateway');

// In POST /subscriptions
const customer = await paymentGateway.createCustomer(
  billing_email,
  billing_name,
  { subscriber_id: subscriberId, subscriber_type: subscriberType }
);

const gatewaySubscription = await paymentGateway.createSubscription(
  customer.id,
  plan_price_id // You need to create prices in gateway dashboard
);

// Save gateway IDs in database
gateway_customer_id = customer.id;
gateway_subscription_id = gatewaySubscription.id;
```

---

### STEP 4: Handle Webhooks

Update `POST /webhook/:gateway`:

```javascript
router.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    
    switch (event.type) {
      case 'invoice.payment_succeeded':
        // Update invoice to paid
        await db.query(
          'UPDATE invoices SET status = $1, paid_at = NOW() WHERE gateway_invoice_id = $2',
          ['paid', event.data.object.id]
        );
        break;
        
      case 'customer.subscription.deleted':
        // Cancel subscription in DB
        await db.query(
          'UPDATE subscriptions SET status = $1 WHERE gateway_subscription_id = $2',
          ['canceled', event.data.object.id]
        );
        break;
        
      case 'invoice.payment_failed':
        // Mark subscription as past_due
        await db.query(
          'UPDATE subscriptions SET status = $1 WHERE gateway_subscription_id = $2',
          ['past_due', event.data.object.subscription]
        );
        break;
    }
    
    res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});
```

---

### STEP 5: Create Frontend Integration

Create `frontend/src/components/SubscriptionPlans.jsx`:

```jsx
import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe('pk_test_...');

export default function SubscriptionPlans() {
  const [plans, setPlans] = useState([]);
  
  useEffect(() => {
    fetch('http://localhost:3000/api/subscriptions/plans?target_user_type=supplier')
      .then(res => res.json())
      .then(data => setPlans(data.data));
  }, []);
  
  const handleSubscribe = async (planId) => {
    // Call your backend to create subscription
    const response = await fetch('http://localhost:3000/api/subscriptions/subscriptions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        plan_id: planId,
        billing_cycle: 'monthly',
        payment_gateway: 'stripe'
      })
    });
    
    const { data } = await response.json();
    
    // Redirect to Stripe checkout
    const stripe = await stripePromise;
    await stripe.redirectToCheckout({
      sessionId: data.gateway_session_id
    });
  };
  
  return (
    <div className="grid grid-cols-3 gap-6">
      {plans.map(plan => (
        <div key={plan.id} className="border rounded-lg p-6">
          <h3 className="text-xl font-bold">{plan.name}</h3>
          <p className="text-3xl font-bold mt-4">
            ${plan.price_monthly}
            <span className="text-sm">/month</span>
          </p>
          <button 
            onClick={() => handleSubscribe(plan.id)}
            className="mt-6 w-full bg-blue-600 text-white py-2 rounded"
          >
            Subscribe Now
          </button>
        </div>
      ))}
    </div>
  );
}
```

---

## 📋 MIGRATION INSTRUCTIONS

### Run the subscription migration:

```bash
cd backend
node migrate-subscriptions.js
```

This will:
- ✅ Create all subscription tables
- ✅ Insert default plans
- ✅ Add subscription columns to foreign_bonds and dealerships

---

## 🔒 USAGE LIMITS ENFORCEMENT

### Example: Check limits before adding vehicle

In `backend/routes/inventory.js`:

```javascript
router.post('/my/vehicles', auth, bondFilter, async (req, res) => {
  // Check usage limits
  const usageCheck = await fetch('http://localhost:3000/api/subscriptions/usage/check', {
    headers: { Authorization: req.headers.authorization }
  });
  
  const usage = await usageCheck.json();
  
  if (!usage.withinLimits) {
    return res.status(403).json({ 
      error: 'Vehicle limit reached. Upgrade your plan.',
      currentUsage: usage.current,
      limits: usage.limits
    });
  }
  
  // Proceed with adding vehicle...
});
```

---

## 📊 ADMIN DASHBOARD FEATURES

### View all subscriptions:
```javascript
GET /api/subscriptions/subscriptions
```

### View revenue analytics:
```javascript
GET /api/subscriptions/invoices?status=paid
```

### Subscription stats:
```sql
SELECT 
  subscriber_type,
  COUNT(*) as total_subscriptions,
  SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
  SUM(CASE WHEN status = 'canceled' THEN 1 ELSE 0 END) as canceled
FROM subscriptions
GROUP BY subscriber_type;
```

---

## 💰 COMMISSION TRACKING

Track per-order commissions:

```javascript
// After successful order
await db.query(`
  INSERT INTO transactions (
    transaction_type, subscriber_type, subscriber_id,
    amount, currency, description, reference_id, reference_type
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
`, [
  'commission',
  'supplier',
  supplierId,
  order.total_amount * 0.05, // 5% commission
  'USD',
  'Order commission',
  orderId,
  'order'
]);
```

---

## 🎨 FRONTEND PAGES TO CREATE

1. **Subscription Plans Page** - `/pricing`
   - Display plans
   - Checkout flow

2. **Billing Dashboard** - `/billing`
   - Current subscription
   - Invoices history
   - Payment methods
   - Usage stats

3. **Admin Subscription Management** - `/admin/subscriptions`
   - All subscriptions
   - Revenue analytics
   - Plan management

---

## 🚀 GO-LIVE CHECKLIST

Before going live:

- [ ] Set payment gateway to production mode
- [ ] Update .env with production keys
- [ ] Test subscription creation
- [ ] Test webhooks (use ngrok for testing)
- [ ] Set up proper error monitoring
- [ ] Configure email notifications
- [ ] Test cancellation flow
- [ ] Test upgrade/downgrade
- [ ] Configure automatic billing
- [ ] Set up invoice generation (PDFs)
- [ ] Test failed payment scenarios
- [ ] Configure grace period for overdue accounts
- [ ] Set up customer support for billing issues

---

## 📞 SUPPORT INTEGRATION

For Uganda, consider:
- **MTN Mobile Money**
- **Airtel Money**
- **Bank transfers**

Use **Flutterwave** or **Pesapal** for local payment support.

---

## 🔐 SECURITY NOTES

1. **Never** expose secret keys in frontend
2. Always verify webhook signatures
3. Use HTTPS in production
4. Encrypt sensitive payment data
5. Log all payment events
6. Set up fraud detection
7. Comply with PCI-DSS if handling cards

---

## 📈 ANALYTICS TRACKING

Track these metrics:
- Monthly Recurring Revenue (MRR)
- Churn rate
- Average Revenue Per User (ARPU)
- Conversion rate (free trial → paid)
- Lifetime Value (LTV)
- Customer Acquisition Cost (CAC)

---

This system is **100% ready for payment gateway integration**. Just plug in your gateway of choice!

For questions, refer to:
- Stripe Docs: https://stripe.com/docs/billing
- Flutterwave Docs: https://developer.flutterwave.com
- PayPal Docs: https://developer.paypal.com
- Pesapal Docs: https://developer.pesapal.com
