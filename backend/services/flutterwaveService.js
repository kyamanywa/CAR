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

module.exports = {
  initiateMobileMoneyPayment,
  initiateCardPayment,
  verifyPayment,
  getPublicKey,
  calculateSubscriptionEndDate,
  PLAN_PRICES
};
