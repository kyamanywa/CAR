import { useState, useEffect } from 'react';
import { fetchWithAuth } from '../api';
import api from '../api';
import { Building2, Users, DollarSign, TrendingUp, AlertCircle, CheckCircle, XCircle, Clock, Crown } from 'lucide-react';

export default function AdminDashboard() {
  const [dealerships, setDealerships] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [plans, setPlans] = useState([]); // DB plans for dropdown

  useEffect(() => {
    loadData();
    // Load dealership plans from DB
    api.get('/subscriptions/admin/plans').then(res => {
      setPlans((res.data.data || []).filter(p => p.target_user_type === 'dealership' && p.status === 'active'));
    }).catch(() => {});
  }, []);

  const loadData = async () => {
    try {
      const dealershipsRes = await fetchWithAuth('/dealerships');
      
      // Extract data from response (backend returns {data: [...]})
      const dealershipsList = dealershipsRes.data || dealershipsRes;
      setDealerships(dealershipsList);
      
      // Calculate admin stats from dealerships list (case-insensitive)
      const activeCount = dealershipsList.filter(d => 
        d.subscription_status && d.subscription_status.toLowerCase() === 'active'
      ).length;
      const trialCount = dealershipsList.filter(d => 
        d.subscription_status && d.subscription_status.toLowerCase() === 'trial'
      ).length;
      const suspendedCount = dealershipsList.filter(d => 
        d.subscription_status && d.subscription_status.toLowerCase() === 'suspended'
      ).length;
      
      // Calculate MRR (Monthly Recurring Revenue) - use actual subscription_amount from database
      const mrr = dealershipsList
        .filter(d => d.subscription_status && d.subscription_status.toLowerCase() === 'active')
        .reduce((sum, d) => sum + (parseFloat(d.subscription_amount) || 0), 0);
      
      // Count total orders tracked across all dealerships
      const totalOrders = dealershipsList.reduce((sum, d) => sum + (parseInt(d.pending_orders) || 0), 0);
      
      setStats({
        totalDealerships: dealershipsList.length,
        active: activeCount,
        trial: trialCount,
        suspended: suspendedCount,
        mrr: mrr,
        arr: mrr * 12,
        totalOrders: totalOrders // System usage metric
      });
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (dealershipId, newStatus) => {
    if (!confirm(`Are you sure you want to change subscription status to "${newStatus}"?`)) {
      return;
    }

    try {
      await fetchWithAuth(`/dealerships/${dealershipId}`, {
        method: 'PATCH',
        body: JSON.stringify({ subscription_status: newStatus })
      });
      alert('Status updated successfully');
      loadData();
    } catch (error) {
      alert('Failed to update status: ' + error.message);
    }
  };

  const handlePlanChange = async (dealershipId, planId) => {
    const selectedPlan = plans.find(p => String(p.id) === String(planId));
    if (!selectedPlan) return;
    if (!confirm(`Assign "${selectedPlan.name}" ($${selectedPlan.price_monthly}/mo) to this dealership?`)) return;
    try {
      await api.post('/subscriptions/admin/assign', {
        subscriber_type: 'dealership',
        subscriber_id: dealershipId,
        plan_id: planId,
        billing_cycle: 'monthly',
      });
      loadData();
    } catch (error) {
      alert('Failed to update plan: ' + (error.response?.data?.error || error.message));
    }
  };

  const filteredDealerships = dealerships.filter(d => {
    if (filter === 'all') return true;
    if (!d.subscription_status) return false;
    
    const status = d.subscription_status.toLowerCase();
    
    if (filter === 'active') return status === 'active';
    if (filter === 'inactive') return status === 'suspended';
    if (filter === 'trial') return status === 'trial';
    return true;
  });

  const getStatusBadge = (status) => {
    if (!status) return <span className="text-gray-400">-</span>;
    
    // Normalize status to lowercase for comparison
    const normalizedStatus = status.toLowerCase();
    
    const styles = {
      active: 'bg-green-100 text-green-800 border-green-200',
      trial: 'bg-blue-100 text-blue-800 border-blue-200',
      suspended: 'bg-red-100 text-red-800 border-red-200',
      expired: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    
    const icons = {
      active: <CheckCircle className="w-3 h-3" />,
      trial: <Clock className="w-3 h-3" />,
      suspended: <XCircle className="w-3 h-3" />,
      expired: <AlertCircle className="w-3 h-3" />
    };

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${styles[normalizedStatus] || styles.expired}`}>
        {icons[normalizedStatus]}
        {status}
      </span>
    );
  };

  const getPlanBadge = (plan) => {
    const styles = {
      starter: 'bg-gray-100 text-gray-800',
      professional: 'bg-purple-100 text-purple-800',
      enterprise: 'bg-yellow-100 text-yellow-800'
    };

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[plan] || styles.starter}`}>
        {plan === 'enterprise' && <Crown className="w-3 h-3" />}
        {plan}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">🎛️ Admin Dashboard</h1>
        <p className="text-gray-500">Manage all dealerships and subscriptions</p>
      </div>

      {/* Revenue Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-medium">Monthly Revenue</p>
                <p className="text-3xl font-bold text-green-900">${stats.mrr.toLocaleString()}</p>
                <p className="text-xs text-green-600">MRR (Active subs only)</p>
              </div>
              <div className="p-3 bg-green-200 rounded-lg">
                <DollarSign className="w-7 h-7 text-green-700" />
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-medium">Annual Revenue</p>
                <p className="text-3xl font-bold text-blue-900">${stats.arr.toLocaleString()}</p>
                <p className="text-xs text-blue-600">ARR (MRR × 12)</p>
              </div>
              <div className="p-3 bg-blue-200 rounded-lg">
                <TrendingUp className="w-7 h-7 text-blue-700" />
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-700 font-medium">Total Dealerships</p>
                <p className="text-3xl font-bold text-purple-900">{stats.totalDealerships}</p>
                <p className="text-xs text-purple-600">
                  {stats.active} active, {stats.trial} trial
                </p>
              </div>
              <div className="p-3 bg-purple-200 rounded-lg">
                <Building2 className="w-7 h-7 text-purple-700" />
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-700 font-medium">System Usage</p>
                <p className="text-3xl font-bold text-orange-900">{stats.totalOrders}</p>
                <p className="text-xs text-orange-600">orders tracked</p>
              </div>
              <div className="p-3 bg-orange-200 rounded-lg">
                <Users className="w-7 h-7 text-orange-700" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              filter === 'all' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({dealerships.length})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              filter === 'active' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Active ({stats?.active || 0})
          </button>
          <button
            onClick={() => setFilter('trial')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              filter === 'trial' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Trial ({stats?.trial || 0})
          </button>
          <button
            onClick={() => setFilter('inactive')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              filter === 'inactive' 
                ? 'bg-red-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Suspended ({stats?.suspended || 0})
          </button>
        </div>
      </div>

      {/* Dealerships Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dealership
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Started
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expires
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDealerships.map((dealership) => (
                <tr key={dealership.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {dealership.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {dealership.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getPlanBadge(dealership.subscription_plan)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {dealership.subscription_amount
                      ? `$${Number(dealership.subscription_amount).toLocaleString()}/mo`
                      : <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(dealership.subscription_status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {dealership.subscription_start_date 
                      ? new Date(dealership.subscription_start_date).toLocaleDateString()
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {dealership.subscription_end_date 
                      ? new Date(dealership.subscription_end_date).toLocaleDateString()
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-2">
                      <select
                        value={dealership.subscription_status}
                        onChange={(e) => handleStatusChange(dealership.id, e.target.value)}
                        className="text-xs border border-gray-300 rounded px-2 py-1"
                      >
                        <option value="active">Active</option>
                        <option value="trial">Trial</option>
                        <option value="suspended">Suspended</option>
                        <option value="expired">Expired</option>
                      </select>
                      <select
                        value={plans.find(p => p.name.toLowerCase() === (dealership.subscription_plan || '').toLowerCase())?.id || ''}
                        onChange={(e) => handlePlanChange(dealership.id, e.target.value)}
                        className="text-xs border border-gray-300 rounded px-2 py-1"
                      >
                        <option value="">Select plan</option>
                        {plans.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} — ${p.price_monthly}/mo
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredDealerships.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No dealerships found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filter !== 'all' ? 'Try changing the filter.' : 'No dealerships registered yet.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
