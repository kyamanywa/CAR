const axios = require('axios');

// Flutterwave API credentials (FREE - only pay transaction fees)
const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY || 'FLWSECK_TEST-XXXXXXXXXXXXX';
const FLUTTERWAVE_PUBLIC_KEY = process.env.FLUTTERWAVE_PUBLIC_KEY || 'FLWPUBK_TEST-XXXXXXXXXXXXX';
const FLUTTERWAVE_BASE_URL = 'https://api.flutterwave.com/v3';

// Plan prices in USD
const PLAN_PRICES = {
  starter: 49,
  professional: 199,
  enterprise: 499
};

/**
 * Initialize Mobile Money payment
 * FREE API - Only pay transaction fees (1.4% for MTN/Airtel in Uganda)
 * @param {Object} data - Payment details
 * @returns {Object} Payment URL and transaction reference
 */
async function initiateMobileMoneyPayment(data) {
  const { dealership_id, dealership_name, email, phone_number, plan, duration_months = 1 } = data;
  
  const amount = PLAN_PRICES[plan] * duration_months;
  const tx_ref = `TXN-${dealership_id}-${Date.now()}`;
  
  try {
    const response = await axios.post(
      `${FLUTTERWAVE_BASE_URL}/charges?type=mobile_money_uganda`,
      {
        tx_ref: tx_ref,
        amount: amount,
        currency: 'UGX',
        network: 'MTN', // or 'AIRTEL'
        email: email,
        phone_number: phone_number,
        fullname: dealership_name,
        client_ip: '127.0.0.1',
        device_fingerprint: 'fingerprintDevice',
        meta: {
          dealership_id: dealership_id,
          plan: plan,
          duration_months: duration_months
        },
        redirect_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/subscription/callback`
      },
      {
        headers: {
          'Authorization': `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: true,
      payment_url: response.data.data.link,
      tx_ref: tx_ref,
      amount: amount,
      message: 'Payment initiated. Please complete on your phone.'
    };
  } catch (error) {
    console.error('Flutterwave payment error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || 'Payment initialization failed',
      details: error.response?.data
    };
  }
}

/**
 * Initialize card payment (alternative to Mobile Money)
 * @param {Object} data - Payment details
 * @returns {Object} Payment link
 */
async function initiateCardPayment(data) {
  const { dealership_id, dealership_name, email, plan, duration_months = 1 } = data;
  
  const amount = PLAN_PRICES[plan] * duration_months;
  const tx_ref = `TXN-${dealership_id}-${Date.now()}`;
  
  try {
    const response = await axios.post(
      `${FLUTTERWAVE_BASE_URL}/payments`,
      {
        tx_ref: tx_ref,
        amount: amount,
        currency: 'USD',
        redirect_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/subscription/callback`,
        payment_options: 'card',
        customer: {
          email: email,
          name: dealership_name
        },
        customizations: {
          title: 'Car Tracking System Subscription',
          description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan - ${duration_months} month(s)`,
          logo: 'https://your-logo-url.com/logo.png'
        },
        meta: {
          dealership_id: dealership_id,
          plan: plan,
          duration_months: duration_months
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: true,
      payment_url: response.data.data.link,
      tx_ref: tx_ref,
      amount: amount
    };
  } catch (error) {
    console.error('Flutterwave card payment error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || 'Payment initialization failed'
    };
  }
}

/**
 * Verify payment status
 * @param {string} transaction_id - Flutterwave transaction ID
 * @returns {Object} Payment verification result
 */
async function verifyPayment(transaction_id) {
  try {
    const response = await axios.get(
      `${FLUTTERWAVE_BASE_URL}/transactions/${transaction_id}/verify`,
      {
        headers: {
          'Authorization': `Bearer ${FLUTTERWAVE_SECRET_KEY}`
        }
      }
    );

    const data = response.data.data;
    
    return {
      success: data.status === 'successful',
      status: data.status,
      amount: data.amount,
      currency: data.currency,
      tx_ref: data.tx_ref,
      transaction_id: data.id,
      meta: data.meta,
      charged_amount: data.charged_amount,
      payment_type: data.payment_type
    };
  } catch (error) {
    console.error('Payment verification error:', error.response?.data || error.message);
    return {
      success: false,
      error: 'Verification failed'
    };
  }
}

/**
 * Get public key for frontend integration
 */
function getPublicKey() {
  return FLUTTERWAVE_PUBLIC_KEY;
}

/**
 * Calculate subscription end date
 * @param {number} months - Duration in months
 * @returns {Date} End date
 */
function calculateSubscriptionEndDate(months) {
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + months);
  return endDate;
}

/**
 * Create or update customer in Flutterwave
 * @param {Object} customer - Customer details
 * @returns {Object} Customer data with flw_id
 */
async function createOrUpdateCustomer(customer) {
  try {
    const { email, name, phone, company_name } = customer;
    
    const response = await axios.post(
      `${FLUTTERWAVE_BASE_URL}/customers`,
      {
        email: email,
        name: name || company_name,
        phone_number: phone || '',
        meta: {
          company: company_name,
          account_type: 'dealership'
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: true,
      customer_id: response.data.data.id,
      email: response.data.data.email
    };
  } catch (error) {
    console.error('Error creating customer:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || 'Customer creation failed'
    };
  }
}

/**
 * Create a subscription plan
 * @param {Object} plan - Plan configuration
 * @returns {Object} Plan details with plan_id
 */
async function createSubscriptionPlan(plan) {
  try {
    const { name, amount, duration = 12, interval = 'monthly' } = plan;
    
    // Convert to kobo (smallest unit)
    const amountInKobo = amount * 100;
    
    const response = await axios.post(
      `${FLUTTERWAVE_BASE_URL}/plans`,
      {
        amount: amountInKobo,
        name: name,
        interval: interval,
        duration: duration
      },
      {
        headers: {
          'Authorization': `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: true,
      plan_id: response.data.data.id,
      plan_name: response.data.data.name
    };
  } catch (error) {
    console.error('Error creating plan:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || 'Plan creation failed'
    };
  }
}

/**
 * Get subscription status
 * @param {string} subscription_id - Flutterwave subscription ID
 * @returns {Object} Subscription details
 */
async function getSubscriptionStatus(subscription_id) {
  try {
    const response = await axios.get(
      `${FLUTTERWAVE_BASE_URL}/subscriptions/${subscription_id}`,
      {
        headers: {
          'Authorization': `Bearer ${FLUTTERWAVE_SECRET_KEY}`
        }
      }
    );

    const sub = response.data.data;
    
    return {
      success: true,
      subscription_id: sub.id,
      status: sub.status,
      plan_id: sub.plan,
      customer_email: sub.customer.email,
      next_payment_date: sub.next_payment_date,
      amount: sub.amount / 100,
      created_at: sub.created_at
    };
  } catch (error) {
    console.error('Error fetching subscription:', error.response?.data || error.message);
    return {
      success: false,
      error: 'Failed to fetch subscription status'
    };
  }
}

/**
 * Cancel a subscription
 * @param {string} subscription_id - Flutterwave subscription ID
 * @returns {Object} Cancellation result
 */
async function cancelSubscription(subscription_id) {
  try {
    const response = await axios.put(
      `${FLUTTERWAVE_BASE_URL}/subscriptions/${subscription_id}/cancel`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${FLUTTERWAVE_SECRET_KEY}`
        }
      }
    );

    return {
      success: response.data.status === 'success',
      message: response.data.message,
      subscription_id: subscription_id
    };
  } catch (error) {
    console.error('Error cancelling subscription:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || 'Cancellation failed'
    };
  }
}

/**
 * Verify webhook signature from Flutterwave
 * @param {string} signature - Signature from request headers
 * @param {string} body - Raw request body
 * @returns {boolean} Whether signature is valid
 */
function verifyWebhookSignature(signature, body) {
  try {
    const crypto = require('crypto');
    const WEBHOOK_SECRET = process.env.FLW_WEBHOOK_SECRET || 'webhook_secret';
    
    const hash = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(body)
      .digest('hex');

    return hash === signature;
  } catch (error) {
    console.error('Error verifying webhook:', error.message);
    return false;
  }
}

/**
 * Handle webhook event from Flutterwave
 * @param {Object} event - Webhook event data
 * @returns {Object} Processing result
 */
function handleWebhookEvent(event) {
  try {
    const eventType = event.type || event.event;
    
    console.log(`Flutterwave webhook: ${eventType}`);

    switch (eventType) {
      case 'charge.completed':
        return {
          processed: true,
          type: 'payment_success',
          reference: event.data.tx_ref,
          amount: event.data.amount,
          customer_email: event.data.customer.email
        };
        
      case 'charge.failed':
        return {
          processed: true,
          type: 'payment_failed',
          reference: event.data.tx_ref,
          reason: event.data.failure_reason
        };
        
      default:
        return {
          processed: false,
          reason: 'Unhandled event type'
        };
    }
  } catch (error) {
    console.error('Error handling webhook:', error.message);
    return {
      processed: false,
      error: error.message
    };
  }
}

module.exports = {
  // Payment processing
  initiateMobileMoneyPayment,
  initiateCardPayment,
  verifyPayment,
  
  // Customer management
  createOrUpdateCustomer,
  
  // Subscription management
  createSubscriptionPlan,
  getSubscriptionStatus,
  cancelSubscription,
  calculateSubscriptionEndDate,
  
  // Webhook handling
  verifyWebhookSignature,
  handleWebhookEvent,
  
  // Constants
  PLAN_PRICES,
  getPublicKey
};
