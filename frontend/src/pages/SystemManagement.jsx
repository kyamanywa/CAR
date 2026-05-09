import { useState, useEffect } from 'react';
import { Bell, Activity, Database, Users, DollarSign, TrendingUp, AlertCircle, CheckCircle, Clock, Send } from 'lucide-react';
import api from '../api';

export default function SystemManagement() {
  const [activeTab, setActiveTab] = useState('overview');
  const [systemStats, setSystemStats] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notification, setNotification] = useState({
    title: '',
    message: '',
    type: 'info',
    target: 'all'
  });

  useEffect(() => {
    fetchSystemData();
  }, []);

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
          {['overview', 'analytics', 'activity', 'notifications'].map((tab) => (
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
