import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { getDealership, getForeignBond, getMySubscription } from '../api';
import { Building2, Users, Truck, AlertCircle, CheckCircle, Clock } from 'lucide-react';

export default function CompanyProfile() {
  const { user } = useAuth();
  const [company, setCompany] = useState(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCompanyDetails();
  }, [user]);

  const fetchCompanyDetails = async () => {
    try {
      setLoading(true);
      if (!user) {
        setError('User not authenticated');
        return;
      }
      
      let companyResponse;
      
      if (user?.role === 'foreign_bond_user' && user?.foreign_bond_id) {
        // Supplier/Foreign Bond profile
        companyResponse = await getForeignBond(user.foreign_bond_id);
      } else if (user?.dealership_id) {
        // Dealership profile
        companyResponse = await getDealership(user.dealership_id);
      } else {
        setError('No company associated with this user');
        return;
      }

      let subscriptionResponse = null;
      try {
        subscriptionResponse = await getMySubscription();
      } catch (subscriptionError) {
        console.warn('Subscription info could not be loaded for profile usage metrics:', subscriptionError);
      }

      const rawCompany = companyResponse?.data?.data || companyResponse?.data || null;
      const subPayload = subscriptionResponse?.data || null;

      const normalizedCompany = {
        ...rawCompany,
        // Use subscription table values if company table does not have them.
        subscription_plan:
          rawCompany?.subscription_plan ||
          subPayload?.subscription?.plan_name ||
          'Free Trial',
        subscription_status:
          rawCompany?.subscription_status ||
          subPayload?.subscription?.status ||
          'Active',
        subscription_start_date:
          rawCompany?.subscription_start_date ||
          subPayload?.subscription?.current_period_start ||
          null,
        subscription_end_date:
          rawCompany?.subscription_end_date ||
          subPayload?.subscription?.current_period_end ||
          null,
        // Normalize contact fields from either schema.
        contact_phone: rawCompany?.contact_phone || rawCompany?.phone || null,
        contact_email: rawCompany?.contact_email || rawCompany?.email || null,
        // Real-time usage from subscription-info endpoint.
        vehicle_count: Number(subPayload?.usage?.vehicles || 0),
        user_count: Number(subPayload?.usage?.users || 0),
        order_count: Number(subPayload?.usage?.orders_this_month || 0)
      };
      
      setCompany(normalizedCompany);
      setSubscriptionInfo(subPayload);
      setError(null);
    } catch (err) {
      console.error('Error fetching company details:', err);
      setError('Failed to load company profile');
    } finally {
      setLoading(false);
    }
  };

  const getSubscriptionStatus = () => {
    if (!company) return null;
    const status = company.subscription_status?.toLowerCase();
    const endDate = company.subscription_end_date;
    
    if (status === 'active') {
      if (!endDate) {
        return { text: 'Active (Perpetual)', color: 'text-green-600', bgColor: 'bg-green-50', icon: CheckCircle };
      }
      const now = new Date();
      const end = new Date(endDate);
      const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
      
      if (daysLeft <= 7) {
        return { text: `Expiring in ${daysLeft} days`, color: 'text-orange-600', bgColor: 'bg-orange-50', icon: AlertCircle };
      }
      return { text: `Active until ${end.toLocaleDateString()}`, color: 'text-green-600', bgColor: 'bg-green-50', icon: CheckCircle };
    } else if (status === 'expired' || status === 'inactive') {
      return { text: 'Subscription Expired', color: 'text-red-600', bgColor: 'bg-red-50', icon: AlertCircle };
    }
    return { text: status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Active', color: 'text-gray-600', bgColor: 'bg-gray-50', icon: Clock };
  };

  const subscriptionStatus = getSubscriptionStatus();
  const StatusIcon = subscriptionStatus?.icon || Clock;

  const resolvedLimits = {
    vehicles: Number(subscriptionInfo?.limits?.vehicles) || getLimit(company?.subscription_plan, 'vehicles'),
    users: Number(subscriptionInfo?.limits?.users) || getLimit(company?.subscription_plan, 'users'),
    orders: Number(subscriptionInfo?.limits?.orders) || getLimit(company?.subscription_plan, 'orders')
  };

  const availableVehicles = Math.max(0, resolvedLimits.vehicles - (company?.vehicle_count || 0));
  const availableUsers = Math.max(0, resolvedLimits.users - (company?.user_count || 0));
  const availableOrders = Math.max(0, resolvedLimits.orders - (company?.order_count || 0));

  const plansPath =
    user?.role === 'foreign_bond_user'
      ? '/supplier/subscription'
      : user?.role === 'dealership_manager'
        ? '/payment'
        : '/system';

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (error || !company) {
    return <div className="p-8 text-center text-red-600">{error || 'No company data'}</div>;
  }

  const isPlan = (plan, name) => plan?.toLowerCase() === name.toLowerCase();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="bg-blue-100 p-4 rounded-lg">
                <Building2 className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{company?.name || 'Company'}</h1>
                <p className="text-gray-500 mt-1">
                  {[company?.city, company?.country].filter(Boolean).join(', ') || 'Location not available'}
                </p>
              </div>
            </div>
            <div className={`${subscriptionStatus?.bgColor} p-4 rounded-lg flex items-center gap-2`}>
              <StatusIcon className={`h-5 w-5 ${subscriptionStatus?.color}`} />
              <span className={`font-semibold ${subscriptionStatus?.color}`}>
                {subscriptionStatus?.text}
              </span>
            </div>
          </div>
        </div>

        {/* Company Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Contact Information */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Contact Information</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-500">Contact Person</p>
                <p className="text-gray-900 font-medium">{company.contact_person || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-500">Email</p>
                <p className="text-gray-900 font-medium">{company.contact_email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-500">Phone</p>
                <p className="text-gray-900 font-medium">{company.contact_phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-500">Address</p>
                <p className="text-gray-900 font-medium">{company.address || 'N/A'}</p>
              </div>
              {company.license_number && (
                <div>
                  <p className="text-gray-500">License Number</p>
                  <p className="text-gray-900 font-medium">{company.license_number}</p>
                </div>
              )}
            </div>
          </div>

          {/* Subscription Details */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Subscription Details</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-500">Current Plan</p>
                <p className="text-lg font-bold text-blue-600">{company.subscription_plan || 'Free Trial'}</p>
              </div>
              <div>
                <p className="text-gray-500">Status</p>
                <p className={`font-semibold ${subscriptionStatus?.color}`}>
                  {subscriptionStatus?.text}
                </p>
              </div>
              {company.subscription_start_date && (
                <div>
                  <p className="text-gray-500">Started</p>
                  <p className="text-gray-900">
                    {new Date(company.subscription_start_date).toLocaleDateString()}
                  </p>
                </div>
              )}
              {company.subscription_end_date && (
                <div>
                  <p className="text-gray-500">Expires</p>
                  <p className="text-gray-900">
                    {new Date(company.subscription_end_date).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
            {company.subscription_status?.toLowerCase() === 'expired' && (
              <a href="/subscription" className="mt-4 block w-full bg-red-600 text-white py-2 rounded-lg text-center hover:bg-red-700">
                Renew Subscription
              </a>
            )}
          </div>

          {/* Plan Features */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Plan Features</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Up to {resolvedLimits.vehicles} Vehicles</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Up to {resolvedLimits.users} Team Members</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>{resolvedLimits.orders} Orders/Month</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>
                  {isPlan(company.subscription_plan, 'Professional') || isPlan(company.subscription_plan, 'Enterprise')
                    ? 'Priority Support'
                    : 'Standard Support'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Usage & Limits */}
        {['dealership_manager', 'foreign_bond_user'].includes(user?.role) && (
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Usage & Limits</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Vehicles */}
              <div className="border rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Truck className="h-5 w-5 text-blue-600" />
                    Vehicles
                  </h3>
                </div>
                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Current Usage</span>
                    <span className="font-semibold">
                      {company.vehicle_count || 0} / {resolvedLimits.vehicles}
                    </span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          ((company.vehicle_count || 0) / Math.max(1, resolvedLimits.vehicles)) * 100,
                          100
                        )}%`
                      }}
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  {availableVehicles} slots available
                </p>
              </div>

              {/* Team Members */}
              <div className="border rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Users className="h-5 w-5 text-green-600" />
                    Team Members
                  </h3>
                </div>
                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Current Usage</span>
                    <span className="font-semibold">
                      {company.user_count || 0} / {resolvedLimits.users}
                    </span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-green-600 h-3 rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          ((company.user_count || 0) / Math.max(1, resolvedLimits.users)) * 100,
                          100
                        )}%`
                      }}
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  {availableUsers} slots available
                </p>
              </div>

              {/* Orders (Monthly) */}
              <div className="border rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Orders/Month</h3>
                </div>
                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">This Month</span>
                    <span className="font-semibold">
                      {company.order_count || 0} / {resolvedLimits.orders}
                    </span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-orange-600 h-3 rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          ((company.order_count || 0) / Math.max(1, resolvedLimits.orders)) * 100,
                          100
                        )}%`
                      }}
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  {availableOrders} slots available
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  All-time orders: {Number(subscriptionInfo?.usage?.orders_total || 0)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Upgrade CTA */}
        {!isPlan(company.subscription_plan, 'Enterprise') && (
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-md p-8 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold mb-2">Ready to Grow?</h3>
                <p className="text-blue-100">
                  Upgrade your subscription plan to unlock more vehicles, team members, and orders.
                </p>
              </div>
              <a
                href={plansPath}
                className="px-8 py-3 bg-white text-blue-600 font-bold rounded-lg hover:bg-blue-50 transition whitespace-nowrap"
              >
                View Plans
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function to get plan limits
function getLimit(plan, type) {
  const limits = {
    'Free Trial': { vehicles: 50, users: 3, orders: 20 },
    'Starter': { vehicles: 50, users: 3, orders: 20 },
    'Professional': { vehicles: 200, users: 10, orders: 100 },
    'Enterprise': { vehicles: 999999, users: 999999, orders: 999999 }
  };
  
  const planLimits = limits[plan] || limits['Free Trial'];
  return planLimits[type] || 0;
}
