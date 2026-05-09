import { useState, useEffect } from 'react';
import { getBorderClearances, createBorderClearance, updateClearanceStatus, getImportOrders } from '../api';
import { Shield, Plus, MapPin, FileCheck, X, Edit, Clock } from 'lucide-react';

const BORDER_POINTS = ['Malaba', 'Busia', 'Mutukula', 'Katuna', 'Elegu', 'Mombasa Port'];
const CLEARANCE_STATUSES = ['Pending', 'In Progress', 'Inspection', 'Cleared', 'Released'];

export default function BorderClearanceManagement() {
  const [clearances, setClearances] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState('');
  
  const [formData, setFormData] = useState({
    order_id: '',
    border_point: 'Mombasa Port',
    ura_declaration_number: '',
    clearance_status: 'Pending',
    inspection_date: '',
    customs_cleared_date: '',
    release_date: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = filter ? { status: filter } : {};
      const [clearancesRes, ordersRes] = await Promise.all([
        getBorderClearances(params),
        getImportOrders({ status: 'At Border' })
      ]);
      setClearances(clearancesRes.data.data);
      setOrders(ordersRes.data.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await updateClearanceStatus(editing.id, {
          status: formData.clearance_status,
          inspection_date: formData.inspection_date || null,
          customs_cleared_date: formData.customs_cleared_date || null,
          release_date: formData.release_date || null,
          notes: formData.notes
        });
        alert('Clearance updated!');
      } else {
        await createBorderClearance(formData);
        alert('Border clearance record created!');
      }
      setShowForm(false);
      setEditing(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error:', error);
      alert(error.response?.data?.error || 'Failed to save clearance');
    }
  };

  const resetForm = () => {
    setFormData({
      order_id: '',
      border_point: 'Mombasa Port',
      ura_declaration_number: '',
      clearance_status: 'Pending',
      inspection_date: '',
      customs_cleared_date: '',
      release_date: '',
      notes: ''
    });
  };

  const handleEdit = (clearance) => {
    setEditing(clearance);
    setFormData({
      order_id: clearance.order_id,
      border_point: clearance.border_point || 'Mombasa Port',
      ura_declaration_number: clearance.ura_declaration_number || '',
      clearance_status: clearance.clearance_status || 'Pending',
      inspection_date: clearance.inspection_date ? clearance.inspection_date.split('T')[0] : '',
      customs_cleared_date: clearance.customs_cleared_date ? clearance.customs_cleared_date.split('T')[0] : '',
      release_date: clearance.release_date ? clearance.release_date.split('T')[0] : '',
      notes: clearance.notes || ''
    });
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Border Clearance Management</h1>
          <p className="text-gray-500">Manage customs and URA clearance records</p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditing(null);
            resetForm();
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Clearance
        </button>
      </div>

      {/* Filter */}
      <div className="card">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="input w-48"
        >
          <option value="">All Statuses</option>
          {CLEARANCE_STATUSES.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Clearances Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 text-left text-sm font-semibold">Order</th>
              <th className="p-4 text-left text-sm font-semibold">Border Point</th>
              <th className="p-4 text-left text-sm font-semibold">URA Declaration</th>
              <th className="p-4 text-left text-sm font-semibold">Dates</th>
              <th className="p-4 text-left text-sm font-semibold">Status</th>
              <th className="p-4 text-left text-sm font-semibold">Notes</th>
              <th className="p-4 text-right text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan="7" className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </td>
              </tr>
            ) : clearances.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-8 text-center text-gray-500">
                  <Shield className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  No clearance records found
                </td>
              </tr>
            ) : (
              clearances.map((clearance) => (
                <tr key={clearance.id} className="hover:bg-gray-50">
                  <td className="p-4">
                    <p className="font-medium">{clearance.order_number}</p>
                    <p className="text-xs text-gray-500">{clearance.dealership_name}</p>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-500" />
                      {clearance.border_point}
                    </div>
                  </td>
                  <td className="p-4 font-mono text-sm">{clearance.ura_declaration_number || '-'}</td>
                  <td className="p-4 text-xs">
                    {clearance.inspection_date && (
                      <p>Inspect: {new Date(clearance.inspection_date).toLocaleDateString()}</p>
                    )}
                    {clearance.customs_cleared_date && (
                      <p>Cleared: {new Date(clearance.customs_cleared_date).toLocaleDateString()}</p>
                    )}
                    {clearance.release_date && (
                      <p className="text-green-600">Released: {new Date(clearance.release_date).toLocaleDateString()}</p>
                    )}
                    {!clearance.inspection_date && !clearance.customs_cleared_date && !clearance.release_date && (
                      <p className="text-gray-400">No dates set</p>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={`badge ${
                      clearance.clearance_status === 'Cleared' || clearance.clearance_status === 'Released' ? 'badge-green' :
                      clearance.clearance_status === 'Inspection' || clearance.clearance_status === 'In Progress' ? 'badge-yellow' :
                      'badge-gray'
                    }`}>
                      {clearance.clearance_status}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-gray-600 max-w-xs truncate">
                    {clearance.notes || '-'}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleEdit(clearance)}
                      className="text-blue-600 hover:text-blue-800 p-2"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
              <h2 className="text-lg font-semibold">
                {editing ? 'Edit Border Clearance' : 'Create New Clearance'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditing(null);
                  resetForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {!editing && (
                <div>
                  <label className="label">Order *</label>
                  <select
                    required
                    value={formData.order_id}
                    onChange={(e) => setFormData({ ...formData, order_id: e.target.value })}
                    className="input"
                  >
                    <option value="">Select Order</option>
                    {orders.map(o => (
                      <option key={o.id} value={o.id}>
                        {o.order_number} - {o.dealership_name} ({o.vehicle_count} vehicles)
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Only orders with status "At Border" are shown</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Border Point *</label>
                  <select
                    required
                    value={formData.border_point}
                    onChange={(e) => setFormData({ ...formData, border_point: e.target.value })}
                    className="input"
                  >
                    {BORDER_POINTS.map(bp => (
                      <option key={bp} value={bp}>{bp}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">URA Declaration Number</label>
                  <input
                    type="text"
                    value={formData.ura_declaration_number}
                    onChange={(e) => setFormData({ ...formData, ura_declaration_number: e.target.value })}
                    className="input"
                    placeholder="URA-XXX-XXXXXX"
                  />
                  <p className="text-xs text-gray-500 mt-1">Optional</p>
                </div>
              </div>

              <div>
                <label className="label">Clearance Status *</label>
                <select
                  required
                  value={formData.clearance_status}
                  onChange={(e) => setFormData({ ...formData, clearance_status: e.target.value })}
                  className="input"
                >
                  {CLEARANCE_STATUSES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">Inspection Date</label>
                  <input
                    type="date"
                    value={formData.inspection_date}
                    onChange={(e) => setFormData({ ...formData, inspection_date: e.target.value })}
                    className="input"
                  />
                </div>

                <div>
                  <label className="label">Customs Cleared Date</label>
                  <input
                    type="date"
                    value={formData.customs_cleared_date}
                    onChange={(e) => setFormData({ ...formData, customs_cleared_date: e.target.value })}
                    className="input"
                  />
                </div>

                <div>
                  <label className="label">Release Date</label>
                  <input
                    type="date"
                    value={formData.release_date}
                    onChange={(e) => setFormData({ ...formData, release_date: e.target.value })}
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="label">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input min-h-[80px]"
                  placeholder="Add any notes about delays, issues, or special requirements..."
                ></textarea>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditing(null);
                    resetForm();
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1">
                  {editing ? 'Update Clearance' : 'Create Clearance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
