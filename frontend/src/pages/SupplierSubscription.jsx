import { useState, useEffect } from 'react';
import { CreditCard, Calendar, Users, Package, ShoppingCart, TrendingUp, AlertCircle, CheckCircle, Crown } from 'lucide-react';
import { getMySubscription } from '../api';
import api from '../api';

export default function SupplierSubscription() {
  const [subscription, setSubscription] = useState(null);
  const [usage, setUsage] = useState(null);
  const [limits, setLimits] = useState(null);
  const [daysRemaining, setDaysRemaining] = useState(null);
  const [loading, setLoading] = useState(true);
  const [availablePlans, setAvailablePlans] = useState([]);

  useEffect(() => {
    loadSubscription();
    loadAvailablePlans();
  }, []);

  const loadAvailablePlans = async () => {
    try {
      const res = await api.get('/subscriptions/plans?target_user_type=supplier');
      setAvailablePlans(res.data.data || []);
    } catch (e) {
      console.error('Failed to load available plans:', e);
    }
  };

  const loadSubscription = async () => {
    try {
      const res = await getMySubscription();
      setSubscription(res.data.subscription);
      setUsage(res.data.usage);
      setLimits(res.data.limits);
      setDaysRemaining(res.data.daysRemaining);
    } catch (error) {
      console.error('Failed to load subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const [selecting, setSelecting] = useState(null); // plan id being selected

  const handleSelectPlan = async (plan) => {
    if (!confirm(`Select the "${plan.name}" plan for $${plan.price_monthly}/month?`)) return;
    setSelecting(plan.id);
    try {
      await api.post('/subscriptions/subscriptions', {
        plan_id: plan.id,
        billing_cycle: 'monthly',
      });
      await loadSubscription();
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to select plan. Please contact support.');
    } finally {
      setSelecting(null);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: { bg: 'bg-green-100', text: 'text-green-800', label: 'Active', icon: CheckCircle },
      trial: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Trial', icon: AlertCircle },
      past_due: { bg: 'bg-red-100', text: 'text-red-800', label: 'Past Due', icon: AlertCircle },
      none: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'No Subscription', icon: AlertCircle }
    };
    const badge = badges[status] || badges.none;
    const Icon = badge.icon;
    
    return (
      <span className={`${badge.bg} ${badge.text} px-4 py-2 rounded-full text-sm font-medium inline-flex items-center gap-2`}>
        <Icon className="w-4 h-4" />
        {badge.label}
      </span>
    );
  };

  const getUsagePercentage = (current, max) => {
    if (!max) return 0;
    return Math.min((current / max) * 100, 100);
  };

  const getUsageColor = (percentage) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading subscription details...</div>;
  }

  const isOwner = true; // TODO: Get from AuthContext

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Subscription & Billing</h1>
        <p className="text-gray-600 mt-1">Manage your subscription plan and usage</p>
      </div>

      {/* Current Plan Card */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-lg shadow-lg p-8">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Crown className="w-8 h-8" />
              <h2 className="text-2xl font-bold">{subscription?.plan_name || 'No Subscription'}</h2>
            </div>
            {getStatusBadge(subscription?.status || 'none')}
          </div>
          <div className="text-right">
            {subscription?.price_monthly && (
              <>
                <div className="text-4xl font-bold">
                  ${subscription.billing_cycle === 'yearly' ? subscription.price_yearly : subscription.price_monthly}
                </div>
                <div className="text-blue-100 mt-1">
                  per {subscription.billing_cycle === 'yearly' ? 'year' : 'month'}
                </div>
              </>
            )}
          </div>
        </div>

        {daysRemaining !== null && (
          <div className="mt-6 pt-6 border-t border-blue-400">
            <div className="flex items-center gap-2 text-blue-100">
              <Calendar className="w-5 h-5" />
              <span>
                {daysRemaining > 0 ? (
                  <>Renews in <strong>{daysRemaining} days</strong> on {new Date(subscription.current_period_end).toLocaleDateString()}</>
                ) : (
                  <>Expired on {new Date(subscription.current_period_end).toLocaleDateString()}</>
                )}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Usage Statistics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-bold mb-6">Current Usage</h3>
        
        <div className="space-y-6">
          {/* Vehicles Usage */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                <span className="font-semibold">Vehicles</span>
              </div>
              <span className="text-sm text-gray-600">
                {usage?.vehicles || 0} / {limits?.vehicles || 0}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all ${getUsageColor(getUsagePercentage(usage?.vehicles, limits?.vehicles))}`}
                style={{ width: `${getUsagePercentage(usage?.vehicles, limits?.vehicles)}%` }}
              />
            </div>
            {getUsagePercentage(usage?.vehicles, limits?.vehicles) >= 90 && (
              <p className="text-sm text-red-600 mt-1">⚠️ Almost at limit! Upgrade to add more vehicles.</p>
            )}
          </div>

          {/* Users Usage */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                <span className="font-semibold">Team Members</span>
              </div>
              <span className="text-sm text-gray-600">
                {usage?.users || 0} / {limits?.users || 0}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all ${getUsageColor(getUsagePercentage(usage?.users, limits?.users))}`}
                style={{ width: `${getUsagePercentage(usage?.users, limits?.users)}%` }}
              />
            </div>
            {getUsagePercentage(usage?.users, limits?.users) >= 90 && (
              <p className="text-sm text-red-600 mt-1">⚠️ Almost at limit! Upgrade to add more team members.</p>
            )}
          </div>

          {/* Orders Usage */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-green-600" />
                <span className="font-semibold">Orders This Month</span>
              </div>
              <span className="text-sm text-gray-600">
                {usage?.orders_this_month || 0} / {limits?.orders || 0}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all ${getUsageColor(getUsagePercentage(usage?.orders_this_month, limits?.orders))}`}
                style={{ width: `${getUsagePercentage(usage?.orders_this_month, limits?.orders)}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 mt-1">Resets on the 1st of next month</p>
          </div>
        </div>
      </div>

      {/* Plan Features */}
      {subscription?.features && Array.isArray(subscription.features) && subscription.features.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold mb-4">Plan Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {subscription.features.map((feature, index) => (
              <div key={index} className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Plans */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">Available Plans</h3>
          {!isOwner && (
            <p className="text-sm text-gray-600">Contact your account owner to upgrade</p>
          )}
        </div>

        {availablePlans.length === 0 ? (
          <p className="text-gray-500 text-sm">No plans available. Contact support.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {availablePlans.map((plan, idx) => {
              const isPopular = idx === 1;
              const isCurrent = subscription?.plan_name === plan.name;
              return (
                <div
                  key={plan.id}
                  className={`border-2 rounded-lg p-6 transition-colors relative ${
                    isCurrent ? 'border-green-500 bg-green-50' :
                    isPopular ? 'border-blue-500 bg-blue-50' :
                    'border-gray-200 hover:border-blue-400'
                  }`}
                >
                  {isPopular && !isCurrent && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                      POPULAR
                    </div>
                  )}
                  {isCurrent && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> CURRENT
                    </div>
                  )}
                  <h4 className="text-xl font-bold mb-2">{plan.name}</h4>
                  <div className="text-3xl font-bold mb-4">
                    ${plan.price_monthly}<span className="text-lg text-gray-600">/mo</span>
                  </div>
                  <ul className="space-y-2 mb-6">
                    {plan.max_vehicles && (
                      <li className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        {plan.max_vehicles >= 999999 ? 'Unlimited vehicles' : `Up to ${plan.max_vehicles} vehicles`}
                      </li>
                    )}
                    {plan.max_users && (
                      <li className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        {plan.max_users >= 999999 ? 'Unlimited team members' : `${plan.max_users} team members`}
                      </li>
                    )}
                    {plan.max_orders_per_month && (
                      <li className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        {plan.max_orders_per_month >= 999999 ? 'Unlimited orders/month' : `${plan.max_orders_per_month} orders/month`}
                      </li>
                    )}
                    {plan.description && (
                      <li className="text-sm text-gray-600 mt-2">{plan.description}</li>
                    )}
                  </ul>
                  <button
                    disabled={isCurrent || selecting === plan.id}
                    onClick={() => !isCurrent && handleSelectPlan(plan)}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {selecting === plan.id ? 'Selecting...' : isCurrent ? 'Current Plan' : 'Select Plan'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Billing Information */}
      {isOwner && subscription?.billing_email && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <CreditCard className="w-6 h-6" />
            Billing Information
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Billing Email</p>
              <p className="font-semibold">{subscription.billing_email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Payment Gateway</p>
              <p className="font-semibold capitalize">{subscription.payment_gateway || 'Not set'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
