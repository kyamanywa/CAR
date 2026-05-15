import { useState, useEffect } from 'react';
import { Bell, Activity, Database, Users, DollarSign, TrendingUp, AlertCircle, CheckCircle, Clock, Send } from 'lucide-react';
import api from '../api';

const emptyPlanForm = {
  id: null,
  name: '',
  description: '',
  target_user_type: 'dealership',
  price_monthly: '',
  price_yearly: '',
  max_vehicles: '',
  max_users: '',
  max_orders_per_month: '',
  commission_percentage: '0',
  features_text: '',
  status: 'active'
};

export default function SystemManagement() {
  const [activeTab, setActiveTab] = useState('overview');
  const [systemStats, setSystemStats] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [plans, setPlans] = useState([]);
  const [planLoading, setPlanLoading] = useState(false);
  const [planForm, setPlanForm] = useState(emptyPlanForm);
  const [showPlanForm, setShowPlanForm] = useState(false);

  // Assign plan state
  const [subscribers, setSubscribers] = useState([]);
  const [assignForm, setAssignForm] = useState({ subscriber_type: '', subscriber_id: '', plan_id: '', billing_cycle: 'monthly' });
  const [showAssignForm, setShowAssignForm] = useState(false);

  // Exchange rates state
  const [exchangeRates, setExchangeRates] = useState([]);
  const [erForm, setErForm] = useState({ from_currency: 'USD', to_currency: 'UGX', rate: '', effective_date: new Date().toISOString().split('T')[0], notes: '' });
  const [erLoading, setErLoading] = useState(false);

  // Financial dashboard state
  const [financials, setFinancials] = useState(null);
  const [notification, setNotification] = useState({
    title: '',
    message: '',
    type: 'info',
    target: 'all'
  });

  useEffect(() => {
    fetchSystemData();
  }, []);

  useEffect(() => {
    if (activeTab === 'plans') {
      fetchPlans();
    }
    if (activeTab === 'exchange-rates') {
      fetchExchangeRates();
    }
    if (activeTab === 'financials') {
      fetchFinancials();
    }
  }, [activeTab]);

  const fetchSystemData = async () => {
    try {
      setLoading(true);
      const [statsRes, logsRes] = await Promise.all([
        api.get('/system/stats'),
        api.get('/system/activity-logs')
      ]);
      setSystemStats(statsRes.data.data);
      setActivityLogs(logsRes.data.data || []);
    } catch (error) {
      console.error('Error fetching system data:', error);
    } finally {
      setLoading(false);
    }
  };

  const normalizeFeaturesToText = (features) => {
    if (!features) return '';

    let parsed = features;
    if (typeof features === 'string') {
      try {
        parsed = JSON.parse(features);
      } catch {
        return features;
      }
    }

    if (Array.isArray(parsed)) {
      return parsed.join('\n');
    }

    if (Array.isArray(parsed?.features)) {
      return parsed.features.join('\n');
    }

    return '';
  };

  const parseFeaturesFromText = (text) => {
    const list = text
      .split('\n')
      .map((x) => x.trim())
      .filter(Boolean);

    return list;
  };

  const fetchPlans = async () => {
    try {
      setPlanLoading(true);
      const [plansRes, subsRes] = await Promise.all([
        api.get('/subscriptions/admin/plans'),
        api.get('/subscriptions/admin/subscribers').catch(() => ({ data: { data: [] } }))
      ]);
      setPlans(plansRes.data.data || []);
      setSubscribers(subsRes.data.data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
      alert('Failed to load subscription plans');
    } finally {
      setPlanLoading(false);
    }
  };

  const openCreatePlan = () => {
    setPlanForm(emptyPlanForm);
    setShowPlanForm(true);
  };

  const openEditPlan = (plan) => {
    setPlanForm({
      id: plan.id,
      name: plan.name || '',
      description: plan.description || '',
      target_user_type: plan.target_user_type || 'dealership',
      price_monthly: plan.price_monthly ?? '',
      price_yearly: plan.price_yearly ?? '',
      max_vehicles: plan.max_vehicles ?? '',
      max_users: plan.max_users ?? '',
      max_orders_per_month: plan.max_orders_per_month ?? '',
      commission_percentage: plan.commission_percentage ?? 0,
      features_text: normalizeFeaturesToText(plan.features),
      status: plan.status || 'active'
    });
    setShowPlanForm(true);
  };

  const handleSavePlan = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: planForm.name,
        description: planForm.description,
        target_user_type: planForm.target_user_type,
        price_monthly: Number(planForm.price_monthly || 0),
        price_yearly: Number(planForm.price_yearly || 0),
        max_vehicles: planForm.max_vehicles === '' ? null : Number(planForm.max_vehicles),
        max_users: planForm.max_users === '' ? null : Number(planForm.max_users),
        max_orders_per_month: planForm.max_orders_per_month === '' ? null : Number(planForm.max_orders_per_month),
        commission_percentage: Number(planForm.commission_percentage || 0),
        features: parseFeaturesFromText(planForm.features_text),
        status: planForm.status
      };

      if (planForm.id) {
        await api.put(`/subscriptions/plans/${planForm.id}`, payload);
      } else {
        await api.post('/subscriptions/plans', payload);
      }

      setShowPlanForm(false);
      setPlanForm(emptyPlanForm);
      await fetchPlans();
      alert('Subscription plan saved successfully');
    } catch (error) {
      console.error('Error saving plan:', error);
      alert(error.response?.data?.error || 'Failed to save plan');
    }
  };

  const handleDeactivatePlan = async (planId) => {
    if (!confirm('Deactivate this plan?')) return;
    try {
      await api.delete(`/subscriptions/plans/${planId}`);
      await fetchPlans();
      alert('Plan deactivated');
    } catch (error) {
      console.error('Error deactivating plan:', error);
      alert(error.response?.data?.error || 'Failed to deactivate plan');
    }
  };

  const handleHardDeletePlan = async (planId) => {
    if (!confirm('Permanently DELETE this plan? This cannot be undone.')) return;
    try {
      await api.delete(`/subscriptions/plans/${planId}?force=true`);
      await fetchPlans();
      alert('Plan permanently deleted');
    } catch (error) {
      console.error('Error deleting plan:', error);
      alert(error.response?.data?.error || 'Failed to delete plan');
    }
  };

  const handleAssignPlan = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/subscriptions/admin/assign', assignForm);
      alert(res.data.message || 'Plan assigned');
      setShowAssignForm(false);
      setAssignForm({ subscriber_type: '', subscriber_id: '', plan_id: '', billing_cycle: 'monthly' });
      await fetchPlans();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to assign plan');
    }
  };

  const fetchExchangeRates = async () => {
    setErLoading(true);
    try {
      const res = await api.get('/exchange-rates');
      setExchangeRates(res.data?.data || []);
    } catch (e) { console.error(e); } finally { setErLoading(false); }
  };

  const handleAddRate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/exchange-rates', erForm);
      setErForm(f => ({ ...f, rate: '', notes: '' }));
      fetchExchangeRates();
    } catch (err) { alert(err.response?.data?.error || 'Failed to add rate'); }
  };

  const handleDeleteRate = async (id) => {
    if (!confirm('Delete this rate?')) return;
    try {
      await api.delete(`/exchange-rates/${id}`);
      fetchExchangeRates();
    } catch (err) { alert('Failed to delete rate'); }
  };

  const fetchFinancials = async () => {
    try {
      const res = await api.get('/system/financials');
      setFinancials(res.data?.data || null);
    } catch (e) { console.error(e); }
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();
    try {
      await api.post('/system/notifications', notification);
      alert('Notification sent successfully!');
      setShowNotificationModal(false);
      setNotification({ title: '', message: '', type: 'info', target: 'all' });
    } catch (error) {
      console.error('Error sending notification:', error);
      alert('Failed to send notification');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading system data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">System Management</h1>
          <p className="text-gray-500">Monitor and control your entire SaaS platform</p>
        </div>
        <button
          onClick={() => setShowNotificationModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Bell className="w-4 h-4" />
          Send Notification
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-4">
          {['overview', 'financials', 'analytics', 'activity', 'plans', 'exchange-rates', 'notifications'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 px-4 font-medium capitalize ${
                activeTab === tab
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* System Health Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-lg">
                <Users className="w-8 h-8 mb-2 opacity-80" />
                <div className="text-3xl font-bold">{systemStats?.total_dealerships || 0}</div>
                <div className="text-sm opacity-90">Total Dealerships</div>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-lg">
                <CheckCircle className="w-8 h-8 mb-2 opacity-80" />
                <div className="text-3xl font-bold">{systemStats?.active_dealerships || 0}</div>
                <div className="text-sm opacity-90">Active Subscribers</div>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-lg">
                <Activity className="w-8 h-8 mb-2 opacity-80" />
                <div className="text-3xl font-bold">{systemStats?.total_users || 0}</div>
                <div className="text-sm opacity-90">System Users</div>
              </div>
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-lg">
                <Database className="w-8 h-8 mb-2 opacity-80" />
                <div className="text-3xl font-bold">{systemStats?.total_vehicles || 0}</div>
                <div className="text-sm opacity-90">Total Vehicles</div>
              </div>
            </div>

            {/* Revenue & Growth */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  Monthly Revenue
                </h3>
                <div className="text-4xl font-bold text-gray-800 mb-2">
                  ${systemStats?.monthly_revenue?.toLocaleString() || '0'}
                </div>
                <div className="text-sm text-green-600 flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  +{systemStats?.revenue_growth || '0'}% from last month
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  Growth Metrics
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">New Dealerships (30d)</span>
                    <span className="font-semibold">{systemStats?.new_dealerships_30d || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Churn Rate</span>
                    <span className="font-semibold text-red-600">{systemStats?.churn_rate || '0'}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg. Vehicles per Dealership</span>
                    <span className="font-semibold">{systemStats?.avg_vehicles_per_dealership || 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* System Status */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">System Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div>
                    <div className="font-medium">Database</div>
                    <div className="text-sm text-gray-600">Operational</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div>
                    <div className="font-medium">API Server</div>
                    <div className="text-sm text-gray-600">Healthy</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div>
                    <div className="font-medium">Storage</div>
                    <div className="text-sm text-gray-600">{systemStats?.storage_used || '0'}% Used</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'plans' && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">Subscription Plans (Admin CRUD)</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAssignForm(!showAssignForm)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  Assign Plan to Tenant
                </button>
                <button
                  onClick={openCreatePlan}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Create Plan
                </button>
              </div>
            </div>

            {/* Assign Plan Form */}
            {showAssignForm && (
              <form onSubmit={handleAssignPlan} className="mb-6 p-4 border rounded-lg bg-green-50 space-y-3">
                <h4 className="font-semibold text-green-800">Assign Plan to Tenant</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <select
                    className="border rounded px-3 py-2"
                    value={assignForm.subscriber_type}
                    onChange={(e) => setAssignForm({ ...assignForm, subscriber_type: e.target.value, subscriber_id: '' })}
                    required
                  >
                    <option value="">Select tenant type</option>
                    <option value="supplier">Supplier (Foreign Bond)</option>
                    <option value="dealership">Dealership</option>
                  </select>
                  <select
                    className="border rounded px-3 py-2"
                    value={assignForm.subscriber_id}
                    onChange={(e) => setAssignForm({ ...assignForm, subscriber_id: e.target.value })}
                    required
                    disabled={!assignForm.subscriber_type}
                  >
                    <option value="">Select tenant</option>
                    {subscribers
                      .filter(s => s.subscriber_type === assignForm.subscriber_type)
                      .map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.plan_name ? `(current: ${s.plan_name})` : '(no plan)'}
                        </option>
                      ))}
                  </select>
                  <select
                    className="border rounded px-3 py-2"
                    value={assignForm.plan_id}
                    onChange={(e) => setAssignForm({ ...assignForm, plan_id: e.target.value })}
                    required
                  >
                    <option value="">Select plan</option>
                    {plans
                      .filter(p => p.status === 'active')
                      .map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} — ${p.price_monthly}/mo | ${p.price_yearly}/yr ({p.target_user_type})
                        </option>
                      ))}
                  </select>
                  <select
                    className="border rounded px-3 py-2"
                    value={assignForm.billing_cycle}
                    onChange={(e) => setAssignForm({ ...assignForm, billing_cycle: e.target.value })}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                {/* Price preview */}
                {assignForm.plan_id && (() => {
                  const selectedPlan = plans.find(p => String(p.id) === String(assignForm.plan_id));
                  if (!selectedPlan) return null;
                  const price = assignForm.billing_cycle === 'yearly'
                    ? selectedPlan.price_yearly
                    : selectedPlan.price_monthly;
                  return (
                    <div className="text-sm font-medium text-green-800 bg-green-100 rounded px-3 py-2">
                      Amount that will be charged: <span className="font-bold">${price}</span> / {assignForm.billing_cycle === 'yearly' ? 'year' : 'month'}
                    </div>
                  );
                })()}
                <div className="flex gap-2">
                  <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Assign Plan</button>
                  <button type="button" onClick={() => setShowAssignForm(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300">Cancel</button>
                </div>
              </form>
            )}

            {showPlanForm && (
              <form onSubmit={handleSavePlan} className="mb-6 p-4 border rounded-lg bg-gray-50 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input className="border rounded px-3 py-2" placeholder="Plan name" value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} required />
                  <select className="border rounded px-3 py-2" value={planForm.target_user_type} onChange={(e) => setPlanForm({ ...planForm, target_user_type: e.target.value })}>
                    <option value="dealership">Dealership</option>
                    <option value="supplier">Supplier</option>
                  </select>
                  <input className="border rounded px-3 py-2" type="number" step="0.01" placeholder="Monthly price" value={planForm.price_monthly} onChange={(e) => setPlanForm({ ...planForm, price_monthly: e.target.value })} required />
                  <input className="border rounded px-3 py-2" type="number" step="0.01" placeholder="Yearly price" value={planForm.price_yearly} onChange={(e) => setPlanForm({ ...planForm, price_yearly: e.target.value })} required />
                  <input className="border rounded px-3 py-2" type="number" placeholder="Max vehicles" value={planForm.max_vehicles} onChange={(e) => setPlanForm({ ...planForm, max_vehicles: e.target.value })} />
                  <input className="border rounded px-3 py-2" type="number" placeholder="Max users" value={planForm.max_users} onChange={(e) => setPlanForm({ ...planForm, max_users: e.target.value })} />
                  <input className="border rounded px-3 py-2" type="number" placeholder="Max orders/month" value={planForm.max_orders_per_month} onChange={(e) => setPlanForm({ ...planForm, max_orders_per_month: e.target.value })} />
                  <input className="border rounded px-3 py-2" type="number" step="0.01" placeholder="Commission %" value={planForm.commission_percentage} onChange={(e) => setPlanForm({ ...planForm, commission_percentage: e.target.value })} />
                  <select className="border rounded px-3 py-2" value={planForm.status} onChange={(e) => setPlanForm({ ...planForm, status: e.target.value })}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <textarea className="border rounded px-3 py-2 w-full" rows={2} placeholder="Description" value={planForm.description} onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })} />
                <textarea className="border rounded px-3 py-2 w-full" rows={4} placeholder="Features (one per line)" value={planForm.features_text} onChange={(e) => setPlanForm({ ...planForm, features_text: e.target.value })} />
                <div className="flex gap-2">
                  <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Save Plan</button>
                  <button type="button" onClick={() => { setShowPlanForm(false); setPlanForm(emptyPlanForm); }} className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300">Cancel</button>
                </div>
              </form>
            )}

            {planLoading ? (
              <div className="text-gray-500">Loading plans...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left px-3 py-2 border">Name</th>
                      <th className="text-left px-3 py-2 border">Target</th>
                      <th className="text-right px-3 py-2 border">Monthly</th>
                      <th className="text-right px-3 py-2 border">Yearly</th>
                      <th className="text-center px-3 py-2 border">Limits</th>
                      <th className="text-center px-3 py-2 border">Status</th>
                      <th className="text-center px-3 py-2 border">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plans.map((plan) => (
                      <tr key={plan.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 border">{plan.name}</td>
                        <td className="px-3 py-2 border capitalize">{plan.target_user_type}</td>
                        <td className="px-3 py-2 border text-right">${Number(plan.price_monthly || 0).toLocaleString()}</td>
                        <td className="px-3 py-2 border text-right">${Number(plan.price_yearly || 0).toLocaleString()}</td>
                        <td className="px-3 py-2 border text-center">V:{plan.max_vehicles ?? '∞'} U:{plan.max_users ?? '∞'} O:{plan.max_orders_per_month ?? '∞'}</td>
                        <td className="px-3 py-2 border text-center">{plan.status}</td>
                        <td className="px-3 py-2 border text-center">
                          <div className="flex gap-2 justify-center">
                            <button onClick={() => openEditPlan(plan)} className="px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200">Edit</button>
                            {plan.status === 'active' && (
                              <button onClick={() => handleDeactivatePlan(plan.id)} className="px-2 py-1 rounded bg-yellow-100 text-yellow-700 hover:bg-yellow-200">Deactivate</button>
                            )}
                            <button onClick={() => handleHardDeletePlan(plan.id)} className="px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200">Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!plans.length && (
                      <tr>
                        <td colSpan={7} className="text-center text-gray-500 py-6">No plans found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tenant Plan Assignments */}
            {subscribers.length > 0 && (
              <div className="mt-8">
                <h4 className="font-semibold text-gray-700 mb-3">Current Tenant Plan Assignments</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full border text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="text-left px-3 py-2 border">Tenant</th>
                        <th className="text-left px-3 py-2 border">Type</th>
                        <th className="text-left px-3 py-2 border">Plan</th>
                        <th className="text-center px-3 py-2 border">Cycle</th>
                        <th className="text-right px-3 py-2 border">Amount</th>
                        <th className="text-center px-3 py-2 border">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subscribers.map((s) => (
                        <tr key={`${s.subscriber_type}-${s.id}`} className="hover:bg-gray-50">
                          <td className="px-3 py-2 border">{s.name}</td>
                          <td className="px-3 py-2 border capitalize">{s.subscriber_type}</td>
                          <td className="px-3 py-2 border">{s.plan_name || <span className="text-gray-400">No plan</span>}</td>
                          <td className="px-3 py-2 border text-center capitalize">{s.billing_cycle || '—'}</td>
                          <td className="px-3 py-2 border text-right">
                            {s.plan_name
                              ? `$${s.billing_cycle === 'yearly' ? Number(s.price_yearly || 0).toLocaleString() : Number(s.price_monthly || 0).toLocaleString()}`
                              : '—'}
                          </td>
                          <td className="px-3 py-2 border text-center">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.subscription_status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                              {s.subscription_status || 'unsubscribed'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Platform Analytics</h3>
            <div className="space-y-6">
              <div>
                <h4 className="font-medium mb-2">Top Performing Dealerships</h4>
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="font-medium">Dealership {i}</span>
                      <span className="text-gray-600">{100 - i * 10} vehicles sold</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Usage Statistics</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{systemStats?.daily_active_users || 0}</div>
                    <div className="text-sm text-gray-600">Daily Active Users</div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{systemStats?.total_transactions || 0}</div>
                    <div className="text-sm text-gray-600">Total Transactions</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold">Recent Activity Logs</h3>
            </div>
            <div className="divide-y max-h-[600px] overflow-y-auto">
              {activityLogs.length > 0 ? (
                activityLogs.map((log, index) => (
                  <div key={index} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full ${
                        log.type === 'success' ? 'bg-green-100' :
                        log.type === 'warning' ? 'bg-yellow-100' :
                        log.type === 'error' ? 'bg-red-100' : 'bg-blue-100'
                      }`}>
                        <Activity className={`w-4 h-4 ${
                          log.type === 'success' ? 'text-green-600' :
                          log.type === 'warning' ? 'text-yellow-600' :
                          log.type === 'error' ? 'text-red-600' : 'text-blue-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{log.action || 'System Activity'}</div>
                        <div className="text-sm text-gray-600">{log.dealership || 'System'} - {log.user || 'Admin'}</div>
                        <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Just now'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  No activity logs available yet
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Notification History</h3>
            <div className="space-y-2">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-3">
                  <Bell className="w-5 h-5 text-blue-600 mt-1" />
                  <div className="flex-1">
                    <div className="font-medium">System Maintenance Scheduled</div>
                    <div className="text-sm text-gray-600">Sent to: All dealerships</div>
                    <div className="text-xs text-gray-400 mt-1">2 hours ago</div>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-start gap-3">
                  <Bell className="w-5 h-5 text-green-600 mt-1" />
                  <div className="flex-1">
                    <div className="font-medium">New Feature Released</div>
                    <div className="text-sm text-gray-600">Sent to: All dealerships</div>
                    <div className="text-xs text-gray-400 mt-1">1 day ago</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Exchange Rates Tab */}
        {activeTab === 'exchange-rates' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border p-6">
              <h3 className="text-lg font-semibold mb-4">Add Exchange Rate</h3>
              <form onSubmit={handleAddRate} className="flex flex-wrap gap-3 items-end">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
                  <input value={erForm.from_currency} onChange={e => setErForm(f => ({...f, from_currency: e.target.value}))}
                    className="border rounded px-3 py-2 w-24 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
                  <input value={erForm.to_currency} onChange={e => setErForm(f => ({...f, to_currency: e.target.value}))}
                    className="border rounded px-3 py-2 w-24 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Rate *</label>
                  <input required type="number" min="0" step="0.01" placeholder="e.g. 3800"
                    value={erForm.rate} onChange={e => setErForm(f => ({...f, rate: e.target.value}))}
                    className="border rounded px-3 py-2 w-32 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Effective Date</label>
                  <input type="date" value={erForm.effective_date}
                    onChange={e => setErForm(f => ({...f, effective_date: e.target.value}))}
                    className="border rounded px-3 py-2 text-sm" />
                </div>
                <div className="flex-1 min-w-40">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
                  <input placeholder="Optional note" value={erForm.notes}
                    onChange={e => setErForm(f => ({...f, notes: e.target.value}))}
                    className="border rounded px-3 py-2 w-full text-sm" />
                </div>
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
                  Add Rate
                </button>
              </form>
            </div>

            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="px-6 py-4 border-b bg-gray-50">
                <h3 className="font-semibold">Rate History</h3>
              </div>
              {erLoading ? <div className="p-6 text-center text-gray-400">Loading...</div> : (
                <table className="min-w-full">
                  <thead className="bg-gray-50"><tr>
                    {['From', 'To', 'Rate', 'Effective Date', 'Notes', 'Added By', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody className="divide-y">
                    {exchangeRates.length === 0 && <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">No rates yet</td></tr>}
                    {exchangeRates.map(r => (
                      <tr key={r.id} className={r.is_current ? 'bg-green-50' : ''}>
                        <td className="px-4 py-3 text-sm">{r.from_currency}</td>
                        <td className="px-4 py-3 text-sm">{r.to_currency}</td>
                        <td className="px-4 py-3 text-sm font-semibold">{Number(r.rate).toLocaleString()}{r.is_current && <span className="ml-2 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Current</span>}</td>
                        <td className="px-4 py-3 text-sm">{r.effective_date ? new Date(r.effective_date).toLocaleDateString() : '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{r.notes || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{r.created_by_name || '-'}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => handleDeleteRate(r.id)} className="text-red-500 text-xs hover:text-red-700">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Financial Dashboard Tab */}
        {activeTab === 'financials' && (
          <div className="space-y-6">
            {!financials ? (
              <div className="p-8 text-center text-gray-400">Loading financial data...</div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-5 rounded-xl">
                    <p className="text-sm opacity-80">Monthly Recurring Revenue</p>
                    <p className="text-3xl font-bold">${(financials.mrr || 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-5 rounded-xl">
                    <p className="text-sm opacity-80">Annual Run Rate</p>
                    <p className="text-3xl font-bold">${((financials.mrr || 0) * 12).toLocaleString()}</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-5 rounded-xl">
                    <p className="text-sm opacity-80">Active Subscriptions</p>
                    <p className="text-3xl font-bold">{financials.active_subscriptions || 0}</p>
                  </div>
                  <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-5 rounded-xl">
                    <p className="text-sm opacity-80">Avg Revenue / Sub</p>
                    <p className="text-3xl font-bold">${financials.active_subscriptions ? Math.round((financials.mrr || 0) / financials.active_subscriptions) : 0}</p>
                  </div>
                </div>

                {/* Revenue by Plan */}
                <div className="bg-white rounded-xl border p-6">
                  <h3 className="font-semibold mb-4">Revenue by Plan</h3>
                  <table className="min-w-full">
                    <thead className="bg-gray-50"><tr>
                      {['Plan', 'Subscribers', 'Monthly Revenue', 'Yearly Subs'].map(h => (
                        <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody className="divide-y">
                      {(financials.by_plan || []).map(p => (
                        <tr key={p.plan_name}>
                          <td className="px-4 py-3 font-medium">{p.plan_name}</td>
                          <td className="px-4 py-3">{p.subscriber_count}</td>
                          <td className="px-4 py-3 font-semibold text-green-700">${(p.monthly_revenue || 0).toLocaleString()}</td>
                          <td className="px-4 py-3">{p.yearly_count || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Upcoming Expirations */}
                <div className="bg-white rounded-xl border p-6">
                  <h3 className="font-semibold mb-4">Upcoming Expirations (next 30 days)</h3>
                  {(financials.upcoming_expirations || []).length === 0 ? (
                    <p className="text-gray-400 text-sm">No expirations in the next 30 days</p>
                  ) : (
                    <table className="min-w-full">
                      <thead className="bg-gray-50"><tr>
                        {['Subscriber', 'Plan', 'Expires', 'Amount'].map(h => (
                          <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                        ))}
                      </tr></thead>
                      <tbody className="divide-y">
                        {(financials.upcoming_expirations || []).map(s => (
                          <tr key={s.id}>
                            <td className="px-4 py-3 text-sm">{s.name}</td>
                            <td className="px-4 py-3 text-sm">{s.plan_name}</td>
                            <td className="px-4 py-3 text-sm text-orange-600">{new Date(s.end_date).toLocaleDateString()}</td>
                            <td className="px-4 py-3 text-sm">${s.subscription_amount}/mo</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Send Notification Modal */}
      {showNotificationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Send System Notification</h2>
            <form onSubmit={handleSendNotification} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={notification.title}
                  onChange={(e) => setNotification({ ...notification, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Notification title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Message *</label>
                <textarea
                  required
                  rows={4}
                  value={notification.message}
                  onChange={(e) => setNotification({ ...notification, message: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Your message to dealerships..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select
                  value={notification.type}
                  onChange={(e) => setNotification({ ...notification, type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="success">Success</option>
                  <option value="alert">Alert</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Target</label>
                <select
                  value={notification.target}
                  onChange={(e) => setNotification({ ...notification, target: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="all">All Dealerships</option>
                  <option value="active">Active Only</option>
                  <option value="suspended">Suspended Only</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2">
                  <Send className="w-4 h-4" />
                  Send Notification
                </button>
                <button
                  type="button"
                  onClick={() => setShowNotificationModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
