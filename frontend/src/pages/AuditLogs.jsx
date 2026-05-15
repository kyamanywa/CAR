import { useState, useEffect, useCallback } from 'react';
import { Search, Filter, RefreshCw, AlertCircle, CheckCircle, User, Clock } from 'lucide-react';
import api from '../api';

const ACTION_COLORS = {
  create: 'bg-green-100 text-green-800',
  update: 'bg-blue-100 text-blue-800',
  delete: 'bg-red-100 text-red-800',
};

const RESOURCE_LABELS = {
  vehicles: 'Vehicle',
  import_orders: 'Import Order',
  local_sales: 'Local Sale',
  customers: 'Customer',
  users: 'User',
  subscriptions: 'Subscription',
};

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 1 });
  const [resources, setResources] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  const [filters, setFilters] = useState({
    resource: '',
    action: '',
    user_id: '',
    from: '',
    to: '',
  });

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 50, ...filters };
      // Remove empty filters
      Object.keys(params).forEach(k => !params[k] && delete params[k]);
      const res = await api.get('/audit-logs', { params });
      setLogs(res.data.data || []);
      setPagination(res.data.pagination || { page: 1, limit: 50, total: 0, pages: 1 });
    } catch (err) {
      console.error('Failed to fetch audit logs', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  useEffect(() => {
    api.get('/audit-logs/resources').then(res => setResources(res.data.data || [])).catch(() => {});
  }, []);

  const formatDate = (dt) => {
    if (!dt) return '—';
    return new Date(dt).toLocaleString();
  };

  const parseDetails = (details) => {
    try { return JSON.parse(details); } catch { return null; }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-sm text-gray-500 mt-1">Full record of all changes made in the system</p>
        </div>
        <button onClick={() => fetchLogs(pagination.page)} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium">
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5 grid grid-cols-2 md:grid-cols-5 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Resource</label>
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            value={filters.resource}
            onChange={e => setFilters(f => ({ ...f, resource: e.target.value }))}
          >
            <option value="">All resources</option>
            {resources.map(r => <option key={r} value={r}>{RESOURCE_LABELS[r] || r}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Action</label>
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            value={filters.action}
            onChange={e => setFilters(f => ({ ...f, action: e.target.value }))}
          >
            <option value="">All actions</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">From date</label>
          <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">To date</label>
          <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} />
        </div>
        <div className="flex items-end">
          <button
            onClick={() => setFilters({ resource: '', action: '', user_id: '', from: '', to: '' })}
            className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Clear filters
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="text-sm text-gray-500 mb-3">
        {loading ? 'Loading...' : `Showing ${logs.length} of ${pagination.total.toLocaleString()} total events`}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400">
            <RefreshCw size={20} className="animate-spin mr-2" /> Loading audit logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <AlertCircle size={32} className="mb-2" />
            <p>No audit log entries found</p>
            <p className="text-xs mt-1">Events will appear here as users make changes in the system</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">When</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">User</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Action</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Resource</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Record ID</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">IP Address</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map(log => {
                const details = parseDetails(log.details);
                const isExpanded = expandedId === log.id;
                return (
                  <>
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Clock size={13} />
                          {formatDate(log.created_at)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700">
                            <User size={11} />
                          </div>
                          <div>
                            <div className="font-medium text-gray-800">{log.user_email || 'System'}</div>
                            <div className="text-xs text-gray-400">{log.user_role || ''}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-700'}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-700 capitalize">
                        {RESOURCE_LABELS[log.resource] || log.resource}
                      </td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{log.resource_id || '—'}</td>
                      <td className="px-4 py-3">
                        {log.status === 'success'
                          ? <span className="flex items-center gap-1 text-green-600 text-xs"><CheckCircle size={13} /> Success</span>
                          : <span className="flex items-center gap-1 text-red-600 text-xs"><AlertCircle size={13} /> Failed</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs">{log.ip_address || '—'}</td>
                      <td className="px-4 py-3">
                        {details && (
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : log.id)}
                            className="text-xs text-indigo-600 hover:underline"
                          >
                            {isExpanded ? 'Hide' : 'View'}
                          </button>
                        )}
                      </td>
                    </tr>
                    {isExpanded && details && (
                      <tr key={`${log.id}-detail`} className="bg-gray-50">
                        <td colSpan={8} className="px-6 py-3">
                          <div className="rounded-lg bg-gray-900 text-green-400 text-xs p-4 overflow-auto max-h-48 font-mono">
                            <pre>{JSON.stringify(details, null, 2)}</pre>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-gray-500">Page {pagination.page} of {pagination.pages}</span>
          <div className="flex gap-2">
            <button
              disabled={pagination.page === 1}
              onClick={() => fetchLogs(pagination.page - 1)}
              className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >← Previous</button>
            <button
              disabled={pagination.page >= pagination.pages}
              onClick={() => fetchLogs(pagination.page + 1)}
              className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}
