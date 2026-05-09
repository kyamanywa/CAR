import { useState, useEffect } from 'react';
import { getSales, getSalesStats, getSale, createSale, updateSalePayment, deleteSale } from '../api';
import { getCustomers } from '../api';
import { getVehicles } from '../api';
import { DollarSign, TrendingUp, Users, AlertCircle, X, Car, User, FileText, Plus, Edit, Trash2 } from 'lucide-react';

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);
  const [saleDetail, setSaleDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  
  // Create/Edit modal state
  const [showForm, setShowForm] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [formData, setFormData] = useState({
    customer_id: '',
    vehicle_id: '',
    selling_price_ugx: '',
    amount_paid_ugx: '',
    payment_status: 'Pending',
    payment_method: 'Cash',
    notes: ''
  });

  useEffect(() => {
    fetchData();
    fetchCustomers();
    fetchVehicles();
  }, [filter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = filter ? { payment_status: filter } : {};
      const [salesRes, statsRes] = await Promise.all([
        getSales(params),
        getSalesStats({})
      ]);
      setSales(salesRes.data.data);
      setStats(statsRes.data.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await getCustomers();
      setCustomers(res.data.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchVehicles = async () => {
    try {
      // Get only In Stock vehicles for sale
      const res = await getVehicles({ status: 'In Stock' });
      setVehicles(res.data.data);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    }
  };

  const handleViewSale = async (sale) => {
    setSelectedSale(sale);
    setDetailLoading(true);
    try {
      const res = await getSale(sale.id);
      setSaleDetail(res.data.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreateSale = () => {
    setEditingSale(null);
    setFormData({
      customer_id: '',
      vehicle_id: '',
      selling_price_ugx: '',
      amount_paid_ugx: '',
      payment_status: 'Pending',
      payment_method: 'Cash',
      notes: ''
    });
    setShowForm(true);
  };

  const handleEditPayment = (sale) => {
    setEditingSale(sale);
    setFormData({
      amount_paid_ugx: sale.balance || 0,
      payment_method: 'Cash',
      notes: ''
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSale) {
        // Update payment
        await updateSalePayment(editingSale.id, {
          amount_paid_ugx: parseFloat(formData.amount_paid_ugx),
          payment_method: formData.payment_method,
          notes: formData.notes
        });
        alert('Payment updated successfully!');
      } else {
        // Create new sale
        await createSale({
          customer_id: parseInt(formData.customer_id),
          vehicle_id: parseInt(formData.vehicle_id),
          selling_price_ugx: parseFloat(formData.selling_price_ugx),
          amount_paid_ugx: parseFloat(formData.amount_paid_ugx),
          payment_status: formData.payment_status,
          payment_method: formData.payment_method,
          notes: formData.notes
        });
        alert('Sale created successfully!');
      }
      setShowForm(false);
      fetchData();
      fetchVehicles(); // Refresh vehicles list
    } catch (error) {
      console.error('Error saving sale:', error);
      alert(error.response?.data?.error || 'Failed to save sale');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this sale? This will return the vehicle to inventory.')) return;
    try {
      await deleteSale(id);
      alert('Sale deleted successfully!');
      fetchData();
      fetchVehicles();
    } catch (error) {
      console.error('Error deleting sale:', error);
      alert(error.response?.data?.error || 'Failed to delete sale');
    }
  };

  const handleVehicleSelect = (e) => {
    const vehicleId = e.target.value;
    setFormData({ ...formData, vehicle_id: vehicleId });
    
    // Auto-fill selling price based on vehicle cost
    const vehicle = vehicles.find(v => v.id === parseInt(vehicleId));
    if (vehicle && vehicle.total_cost_ugx) {
      // Suggest 15% markup
      const suggestedPrice = Math.round(vehicle.total_cost_ugx * 1.15);
      setFormData(prev => ({ 
        ...prev, 
        vehicle_id: vehicleId,
        selling_price_ugx: suggestedPrice 
      }));
    }
  };

  const formatUGX = (value) => {
    if (!value) return 'UGX 0';
    if (value >= 1000000000) return `UGX ${(value / 1000000000).toFixed(2)}B`;
    if (value >= 1000000) return `UGX ${(value / 1000000).toFixed(1)}M`;
    return `UGX ${value.toLocaleString()}`;
  };

  const statuses = ['Paid', 'Partial', 'Pending'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Local Sales</h1>
          <p className="text-gray-500">Sales to local customers</p>
        </div>
        <div className="flex gap-3">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="input w-40"
          >
            <option value="">All Status</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={handleCreateSale} className="btn btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Sale
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Sales</p>
                <p className="text-xl font-bold">{stats.total_sales || 0}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Revenue</p>
                <p className="text-xl font-bold">{formatUGX(stats.total_revenue)}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Profit</p>
                <p className="text-xl font-bold">{formatUGX(stats.total_profit)}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Outstanding</p>
                <p className="text-xl font-bold">{formatUGX(stats.outstanding)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-gray-600">Invoice</th>
                <th className="text-left p-4 text-sm font-medium text-gray-600">Vehicle</th>
                <th className="text-left p-4 text-sm font-medium text-gray-600">Customer</th>
                <th className="text-right p-4 text-sm font-medium text-gray-600">Amount</th>
                <th className="text-left p-4 text-sm font-medium text-gray-600">Status</th>
                <th className="text-right p-4 text-sm font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sales.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-500">
                    No sales found. Click "New Sale" to create one.
                  </td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="p-4">
                      <p className="font-medium">{sale.invoice_number}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(sale.sale_date).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="p-4">
                      <p className="font-medium">{sale.make} {sale.model}</p>
                      <p className="text-xs text-gray-500">{sale.year} • {sale.color}</p>
                    </td>
                    <td className="p-4">
                      <p>{sale.customer_name}</p>
                      <p className="text-xs text-gray-500">{sale.customer_phone}</p>
                    </td>
                    <td className="p-4 text-right">
                      <p className="font-medium">{formatUGX(sale.selling_price_ugx)}</p>
                      <p className="text-xs text-gray-500">Paid: {formatUGX(sale.amount_paid_ugx)}</p>
                    </td>
                    <td className="p-4">
                      <span className={`badge ${
                        sale.payment_status === 'Paid' ? 'badge-green' :
                        sale.payment_status === 'Partial' ? 'badge-yellow' : 'badge-red'
                      }`}>
                        {sale.payment_status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewSale(sale)}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          View
                        </button>
                        {sale.payment_status !== 'Paid' && (
                          <button
                            onClick={() => handleEditPayment(sale)}
                            className="text-sm text-green-600 hover:text-green-800"
                          >
                            Pay
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(sale.id)}
                          className="text-sm text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
              <h2 className="text-lg font-semibold">
                {editingSale ? 'Record Payment' : 'Create New Sale'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {!editingSale ? (
                <>
                  {/* Create Sale Form */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Customer *</label>
                      <select
                        required
                        value={formData.customer_id}
                        onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                        className="input"
                      >
                        <option value="">Select Customer</option>
                        {customers.map(c => (
                          <option key={c.id} value={c.id}>{c.full_name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="label">Vehicle *</label>
                      <select
                        required
                        value={formData.vehicle_id}
                        onChange={handleVehicleSelect}
                        className="input"
                      >
                        <option value="">Select Vehicle</option>
                        {vehicles.map(v => (
                          <option key={v.id} value={v.id}>
                            {v.make} {v.model} ({v.year}) - {v.chassis_number}
                          </option>
                        ))}
                      </select>
                      {vehicles.length === 0 && (
                        <p className="text-xs text-red-500 mt-1">No vehicles in stock</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Selling Price (UGX) *</label>
                      <input
                        type="number"
                        required
                        value={formData.selling_price_ugx}
                        onChange={(e) => setFormData({ ...formData, selling_price_ugx: e.target.value })}
                        className="input"
                        placeholder="0"
                        min="0"
                      />
                    </div>
                    
                    <div>
                      <label className="label">Amount Paid (UGX) *</label>
                      <input
                        type="number"
                        required
                        value={formData.amount_paid_ugx}
                        onChange={(e) => setFormData({ ...formData, amount_paid_ugx: e.target.value })}
                        className="input"
                        placeholder="0"
                        min="0"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Payment Method *</label>
                      <select
                        value={formData.payment_method}
                        onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                        className="input"
                      >
                        <option value="Cash">Cash</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Mobile Money">Mobile Money</option>
                        <option value="Cheque">Cheque</option>
                      </select>
                    </div>

                    <div>
                      <label className="label">Payment Status</label>
                      <select
                        value={formData.payment_status}
                        onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}
                        className="input"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Partial">Partial</option>
                        <option value="Paid">Paid</option>
                      </select>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Update Payment Form */}
                  <div className="bg-blue-50 p-4 rounded-lg mb-4">
                    <p className="text-sm text-gray-600">Outstanding Balance:</p>
                    <p className="text-2xl font-bold text-blue-600">{formatUGX(editingSale.balance)}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Payment Amount (UGX) *</label>
                      <input
                        type="number"
                        required
                        value={formData.amount_paid_ugx}
                        onChange={(e) => setFormData({ ...formData, amount_paid_ugx: e.target.value })}
                        className="input"
                        placeholder="0"
                        max={editingSale.balance}
                        min="0"
                      />
                    </div>

                    <div>
                      <label className="label">Payment Method *</label>
                      <select
                        value={formData.payment_method}
                        onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                        className="input"
                      >
                        <option value="Cash">Cash</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Mobile Money">Mobile Money</option>
                        <option value="Cheque">Cheque</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="label">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input"
                  rows="3"
                  placeholder="Additional notes..."
                ></textarea>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  {editingSale ? 'Record Payment' : 'Create Sale'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sale Detail Modal */}
      {selectedSale && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
              <div>
                <h2 className="text-lg font-semibold">Invoice {selectedSale.invoice_number}</h2>
                <p className="text-sm text-gray-500">
                  {new Date(selectedSale.sale_date).toLocaleDateString()}
                </p>
              </div>
              <button onClick={() => setSelectedSale(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailLoading ? (
              <div className="p-8 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : saleDetail && (
              <div className="p-6 space-y-6">
                {/* Customer Info */}
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Customer</p>
                    <p className="font-medium">{saleDetail.customer_name}</p>
                    <p className="text-sm text-gray-500">{saleDetail.customer_phone}</p>
                  </div>
                </div>

                {/* Vehicle Info */}
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Car className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Vehicle</p>
                    <p className="font-medium">{saleDetail.make} {saleDetail.model}</p>
                    <p className="text-sm text-gray-500">
                      {saleDetail.year} • {saleDetail.color} • {saleDetail.chassis_number}
                    </p>
                  </div>
                </div>

                {/* Financial Details */}
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Selling Price:</span>
                    <span className="font-medium">{formatUGX(saleDetail.selling_price_ugx)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount Paid:</span>
                    <span className="font-medium text-green-600">{formatUGX(saleDetail.amount_paid_ugx)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-gray-600">Balance:</span>
                    <span className="font-bold text-lg">{formatUGX(saleDetail.balance)}</span>
                  </div>
                </div>

                {/* Payment Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Payment Status</p>
                    <span className={`badge ${
                      saleDetail.payment_status === 'Paid' ? 'badge-green' :
                      saleDetail.payment_status === 'Partial' ? 'badge-yellow' : 'badge-red'
                    }`}>
                      {saleDetail.payment_status}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Payment Method</p>
                    <p className="font-medium">{saleDetail.payment_method}</p>
                  </div>
                </div>

                {saleDetail.notes && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Notes</p>
                    <p className="text-sm bg-gray-50 p-3 rounded">{saleDetail.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
