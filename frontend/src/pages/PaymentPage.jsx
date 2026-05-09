import { useState, useEffect } from 'react';
import { fetchWithAuth } from '../api';
import { CreditCard, Smartphone, CheckCircle, AlertCircle, Crown, Zap } from 'lucide-react';

export default function PaymentPage() {
  const [plans] = useState([
    {
      id: 'starter',
      name: 'Starter',
      price: 49,
      icon: <Zap className="w-6 h-6" />,
      features: [
        '50 vehicles',
        '20 orders per month',
        '3 team members',
        'Email notifications',
        'Basic reports'
      ],
      color: 'gray'
    },
    {
      id: 'professional',
      name: 'Professional',
      price: 199,
      icon: <CreditCard className="w-6 h-6" />,
      features: [
        '200 vehicles',
        '100 orders per month',
        '10 team members',
        'Email & SMS notifications',
        'Advanced analytics',
        'Priority support'
      ],
      color: 'purple',
      popular: true
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 499,
      icon: <Crown className="w-6 h-6" />,
      features: [
        'Unlimited vehicles',
        'Unlimited orders',
        'Unlimited team members',
        'All notifications',
        'Custom reports',
        'API access',
        'Dedicated support'
      ],
      color: 'yellow'
    }
  ]);

  const [selectedPlan, setSelectedPlan] = useState('professional');
  const [paymentMethod, setPaymentMethod] = useState('mobile_money');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [network, setNetwork] = useState('MTN');
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState(null);

  const handlePayment = async () => {
    if (paymentMethod === 'mobile_money' && !phoneNumber) {
      setMessage({ type: 'error', text: 'Please enter your phone number' });
      return;
    }

    setProcessing(true);
    setMessage(null);

    try {
      let result;
      
      if (paymentMethod === 'mobile_money') {
        result = await fetchWithAuth('/payments/mobile-money', {
          method: 'POST',
          body: JSON.stringify({
            phone_number: phoneNumber,
            network: network,
            plan: selectedPlan,
            duration_months: 1
          })
        });
      } else {
        result = await fetchWithAuth('/payments/card', {
          method: 'POST',
          body: JSON.stringify({
            plan: selectedPlan,
            duration_months: 1
          })
        });
      }

      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: 'Payment initiated! Please complete on your phone.' 
        });
        
        // Redirect to payment page after 2 seconds
        setTimeout(() => {
          window.location.href = result.data.payment_url;
        }, 2000);
      } else {
        setMessage({ 
          type: 'error', 
          text: result.error || 'Payment failed. Please try again.' 
        });
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Payment initialization failed. Please try again.' 
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">💳 Upgrade Subscription</h1>
        <p className="text-gray-500">Choose your plan and complete payment</p>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            onClick={() => setSelectedPlan(plan.id)}
            className={`relative card cursor-pointer transition-all ${
              selectedPlan === plan.id
                ? 'ring-2 ring-blue-600 shadow-lg scale-105'
                : 'hover:shadow-md'
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                  MOST POPULAR
                </span>
              </div>
            )}

            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 bg-${plan.color}-100 rounded-lg`}>
                {plan.icon}
              </div>
              <div>
                <h3 className="font-bold text-lg">{plan.name}</h3>
                <p className="text-2xl font-bold text-blue-600">
                  ${plan.price}
                  <span className="text-sm text-gray-500">/month</span>
                </p>
              </div>
            </div>

            <ul className="space-y-2 mb-4">
              {plan.features.map((feature, idx) => (
                <li key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  {feature}
                </li>
              ))}
            </ul>

            {selectedPlan === plan.id && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <CheckCircle className="w-6 h-6 text-green-600 mx-auto" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Payment Method Selection */}
      <div className="card">
        <h2 className="text-lg font-bold mb-4">Payment Method</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div
            onClick={() => setPaymentMethod('mobile_money')}
            className={`p-4 border-2 rounded-lg cursor-pointer transition ${
              paymentMethod === 'mobile_money'
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <Smartphone className="w-6 h-6 text-blue-600" />
              <div>
                <p className="font-medium">Mobile Money</p>
                <p className="text-xs text-gray-500">MTN / Airtel Money (Uganda)</p>
              </div>
            </div>
          </div>

          <div
            onClick={() => setPaymentMethod('card')}
            className={`p-4 border-2 rounded-lg cursor-pointer transition ${
              paymentMethod === 'card'
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <CreditCard className="w-6 h-6 text-blue-600" />
              <div>
                <p className="font-medium">Card Payment</p>
                <p className="text-xs text-gray-500">Visa / Mastercard</p>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Money Details */}
        {paymentMethod === 'mobile_money' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Network
              </label>
              <select
                value={network}
                onChange={(e) => setNetwork(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md"
              >
                <option value="MTN">MTN Mobile Money</option>
                <option value="AIRTEL">Airtel Money</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="256XXXXXXXXX"
                className="w-full px-4 py-2 border border-gray-300 rounded-md"
              />
              <p className="text-xs text-gray-500 mt-1">
                Format: 256700000000 (country code + number)
              </p>
            </div>
          </div>
        )}

        {/* Message Display */}
        {message && (
          <div className={`mt-4 p-4 rounded-md ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            <div className="flex items-center gap-2">
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <p className="text-sm font-medium">{message.text}</p>
            </div>
          </div>
        )}

        {/* Pay Button */}
        <button
          onClick={handlePayment}
          disabled={processing}
          className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-md hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition"
        >
          {processing ? (
            <span className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Processing...
            </span>
          ) : (
            `Pay $${plans.find(p => p.id === selectedPlan)?.price} - Activate Now`
          )}
        </button>

        <p className="text-xs text-gray-500 text-center mt-4">
          🔒 Secure payment powered by Flutterwave. Your subscription will be activated immediately after payment.
        </p>
      </div>
    </div>
  );
}
