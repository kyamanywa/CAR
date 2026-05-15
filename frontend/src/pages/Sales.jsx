import { useState, useEffect } from 'react';
import { getSales, getSalesStats, getSale, createSale, updateSalePayment, deleteSale } from '../api';
import { getCustomers } from '../api';
import { getVehicles } from '../api';
import { DollarSign, TrendingUp, Users, AlertCircle, X, Car, User, FileText, Plus, Edit, Trash2, Printer, Download } from 'lucide-react';
import PrintableInvoice from '../components/PrintableInvoice';
import { formatCurrency, getCurrencyConfig, getExchangeRate } from '../utils/currencyUtils';
import { exportToExcel } from '../utils/exportData';
import { useLocation, useNavigate } from 'react-router-dom';

export default function Sales() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sales, setSales] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);
  const [saleDetail, setSaleDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showPrintable, setShowPrintable] = useState(false);
  const [pendingOpenSaleId, setPendingOpenSaleId] = useState(location.state?.openSaleId || null);
  
  // Create/Edit modal state
  const [showForm, setShowForm] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [formData, setFormData] = useState({
    customer_id: '',
    vehicle_id: '',
    quantity: 1,
    selling_price_ugx: '',
    amount_paid_ugx: '',
    payment_status: 'Pending',
    payment_method: 'Cash',
    notes: ''
  });
  const localSalesCurrencyCode = getCurrencyConfig('local_sales').code;

  useEffect(() => {
    fetchData();
    fetchCustomers();
    fetchVehicles();
  }, [filter]);

  useEffect(() => {
    if (!pendingOpenSaleId || sales.length === 0) return;
    const sale = sales.find(s => Number(s.id) === Number(pendingOpenSaleId));
    if (sale) {
      handleViewSale(sale);
      setPendingOpenSaleId(null);
      navigate('/sales', { replace: true, state: {} });
    }
  }, [pendingOpenSaleId, sales]);

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
      // Get both imported ('In Stock') and local ('Available') vehicles
      const res = await getVehicles();
      const available = (res.data.data || []).filter(v => v.status === 'In Stock' || v.status === 'Available');
      setVehicles(available);
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
      quantity: 1,
      selling_price_ugx: '',
      amount_paid_ugx: '',
      payment_status: 'Pending',
      payment_method: 'Cash',
      discount_ugx: '',
      trade_in_vehicle: '',
      trade_in_value_ugx: '',
      salesperson_name: '',
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
          quantity: parseInt(formData.quantity) || 1,
          selling_price_ugx: parseFloat(formData.selling_price_ugx),
          amount_paid_ugx: parseFloat(formData.amount_paid_ugx) || 0,
          payment_status: formData.payment_status,
          payment_method: formData.payment_method,
          discount_ugx: parseFloat(formData.discount_ugx) || 0,
          trade_in_vehicle: formData.trade_in_vehicle || '',
          trade_in_value_ugx: parseFloat(formData.trade_in_value_ugx) || 0,
          salesperson_name: formData.salesperson_name || '',
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
    if (vehicle && (vehicle.total_cost_ugx || vehicle.purchase_price_usd)) {
      const exchangeRate = getExchangeRate('usd_to_ugx') || 3750;
      const baseCost = vehicle.total_cost_ugx || ((parseFloat(vehicle.purchase_price_usd) || 0) * exchangeRate);
      // Suggest 15% markup
      const suggestedPrice = Math.round(baseCost * 1.15);
      setFormData(prev => ({ 
        ...prev, 
        vehicle_id: vehicleId,
        selling_price_ugx: suggestedPrice 
      }));
    }
  };

  const formatLocalMoney = (value) => formatCurrency(value, 'local_sales');

  const selectedVehicleData = vehicles.find(v => v.id === parseInt(formData.vehicle_id));
  const saleQty = parseInt(formData.quantity) || 1;
  const unitSalePrice = parseFloat(formData.selling_price_ugx) || 0;
  const discountAmt = parseFloat(formData.discount_ugx) || 0;
  const tradeInAmt = parseFloat(formData.trade_in_value_ugx) || 0;
  const exchangeRate = getExchangeRate('usd_to_ugx') || 3750;
  const unitCostUgx = selectedVehicleData
    ? (parseFloat(selectedVehicleData.total_cost_ugx) || ((parseFloat(selectedVehicleData.purchase_price_usd) || 0) * exchangeRate))
    : 0;
  const grossSaleAmount = unitSalePrice * saleQty;
  const netSaleAmount = Math.max(0, grossSaleAmount - discountAmt - tradeInAmt);
  const totalCostAmount = unitCostUgx * saleQty;
  const projectedProfit = netSaleAmount - totalCostAmount;
  const projectedMarginPct = netSaleAmount > 0 ? (projectedProfit / netSaleAmount) * 100 : 0;
  const paymentAmount = parseFloat(formData.amount_paid_ugx) || 0;
  const projectedBalance = Math.max(0, netSaleAmount - paymentAmount);

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
          <button
            onClick={() => exportToExcel(sales.map(s => ({
              Invoice: s.invoice_number,
              Date: s.sale_date,
              Customer: s.customer_name,
              Vehicle: `${s.make} ${s.model} ${s.year}`,
              Chassis: s.chassis_number,
              'Sale Price (UGX)': s.selling_price_ugx,
              'Cost (UGX)': s.total_cost_ugx,
              'Profit (UGX)': (parseFloat(s.selling_price_ugx || 0) - parseFloat(s.total_cost_ugx || 0)),
              'Margin %': (parseFloat(s.selling_price_ugx || 0) > 0
                ? (((parseFloat(s.selling_price_ugx || 0) - parseFloat(s.total_cost_ugx || 0)) / parseFloat(s.selling_price_ugx || 0)) * 100).toFixed(2)
                : '0.00'),
              'Amount Paid (UGX)': s.amount_paid_ugx,
              'Balance (UGX)': s.balance_ugx,
              Status: s.payment_status,
            })), `sales-${new Date().toISOString().slice(0,10)}`, 'Sales')}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700"
          >
            <Download size={14} /> Export
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
                <p className="text-xl font-bold">{formatLocalMoney(stats.total_revenue)}</p>
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
                <p className="text-xl font-bold">{formatLocalMoney(stats.total_profit)}</p>
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
                <p className="text-xl font-bold">{formatLocalMoney(stats.outstanding)}</p>
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
                <th className="text-right p-4 text-sm font-medium text-gray-600">Financials</th>
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
                sales.map((sale) => {
                  const rowRevenue = parseFloat(sale.selling_price_ugx || 0);
                  const rowCost = parseFloat(sale.total_cost_ugx || 0);
                  const rowProfit = rowRevenue - rowCost;
                  const rowMarginPct = rowRevenue > 0 ? (rowProfit / rowRevenue) * 100 : 0;

                  return (
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
                      <p className="font-medium">{formatLocalMoney(sale.selling_price_ugx)}</p>
                      <p className="text-xs text-gray-500">Paid: {formatLocalMoney(sale.amount_paid_ugx)}</p>
                      <p className={`text-xs font-medium ${rowProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        Profit: {formatLocalMoney(rowProfit)} ({rowMarginPct.toFixed(2)}%)
                      </p>
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
                )})
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
                            [{v.source_type === 'local_purchase' || v.source_type === 'local' ? 'Local' : 'Imported'}] {v.make} {v.model} ({v.year}) - {v.chassis_number}
                          </option>
                        ))}
                      </select>
                      {vehicles.length === 0 && (
                        <p className="text-xs text-red-500 mt-1">No vehicles in stock</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="label">Quantity *</label>
                      <input
                        type="number"
                        required
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                        className="input"
                        placeholder="1"
                        min="1"
                        max={vehicles.find(v => v.id === parseInt(formData.vehicle_id))?.quantity || 999}
                      />
                      {formData.vehicle_id && (
                        <p className="text-xs text-gray-500 mt-1">
                          Available: {vehicles.find(v => v.id === parseInt(formData.vehicle_id))?.quantity || 0} units
                        </p>
                      )}
                    </div>

                    <div className="col-span-2">
                      <label className="label">Unit Price ({localSalesCurrencyCode}) *</label>
                      <input
                        type="number"
                        required
                        value={formData.selling_price_ugx}
                        onChange={(e) => setFormData({ ...formData, selling_price_ugx: e.target.value })}
                        className="input"
                        placeholder="0"
                        min="0"
                      />
                      <p className="text-xs text-gray-500 mt-1">Price per vehicle unit</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div style={{display: 'none'}}>
                      <label className="label">Selling Price ({localSalesCurrencyCode}) *</label>
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
                      <label className="label">Discount ({localSalesCurrencyCode})</label>
                      <input
                        type="number"
                        value={formData.discount_ugx}
                        onChange={(e) => setFormData({ ...formData, discount_ugx: e.target.value })}
                        className="input"
                        placeholder="0"
                        min="0"
                      />
                    </div>
                  </div>

                  {/* Trade-in Vehicle */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Trade-in Vehicle (optional)</label>
                      <input
                        type="text"
                        value={formData.trade_in_vehicle}
                        onChange={(e) => setFormData({ ...formData, trade_in_vehicle: e.target.value })}
                        className="input"
                        placeholder="e.g. Toyota Corolla 2018"
                      />
                    </div>
                    <div>
                      <label className="label">Trade-in Value ({localSalesCurrencyCode})</label>
                      <input
                        type="number"
                        value={formData.trade_in_value_ugx}
                        onChange={(e) => setFormData({ ...formData, trade_in_value_ugx: e.target.value })}
                        className="input"
                        placeholder="0"
                        min="0"
                      />
                    </div>
                  </div>

                  {/* Pricing & Profitability summary */}
                  {formData.selling_price_ugx && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="font-semibold text-blue-700 mb-2">Sale Breakdown</p>
                        <div className="flex justify-between">
                          <span>Unit Price × Quantity:</span>
                          <span>{unitSalePrice.toLocaleString()} × {saleQty} = {grossSaleAmount.toLocaleString()} {localSalesCurrencyCode}</span>
                        </div>
                        {discountAmt > 0 && (
                          <div className="flex justify-between text-green-700">
                            <span>Discount:</span>
                            <span>- {discountAmt.toLocaleString()} {localSalesCurrencyCode}</span>
                          </div>
                        )}
                        {tradeInAmt > 0 && (
                          <div className="flex justify-between text-green-700">
                            <span>Trade-in:</span>
                            <span>- {tradeInAmt.toLocaleString()} {localSalesCurrencyCode}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-bold border-t mt-1 pt-1">
                          <span>Net Sale Total:</span>
                          <span>{netSaleAmount.toLocaleString()} {localSalesCurrencyCode}</span>
                        </div>
                      </div>

                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                        <p className="font-semibold text-emerald-700 mb-2">Cost & Margin Preview</p>
                        <div className="flex justify-between">
                          <span>Unit Cost (est.):</span>
                          <span>{unitCostUgx.toLocaleString()} {localSalesCurrencyCode}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Cost:</span>
                          <span>{totalCostAmount.toLocaleString()} {localSalesCurrencyCode}</span>
                        </div>
                        <div className="flex justify-between font-semibold">
                          <span>Projected Profit:</span>
                          <span className={projectedProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}>
                            {projectedProfit.toLocaleString()} {localSalesCurrencyCode}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Margin %:</span>
                          <span className={projectedMarginPct >= 0 ? 'text-emerald-700 font-semibold' : 'text-red-700 font-semibold'}>
                            {projectedMarginPct.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Amount Paid ({localSalesCurrencyCode}) *</label>
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
                    <div>
                      <label className="label">Salesperson Name</label>
                      <input
                        type="text"
                        value={formData.salesperson_name}
                        onChange={(e) => setFormData({ ...formData, salesperson_name: e.target.value })}
                        className="input"
                        placeholder="Name of staff"
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

                  {formData.selling_price_ugx && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm flex justify-between">
                      <span className="text-amber-700 font-medium">Projected Balance After Payment</span>
                      <span className="font-bold text-amber-800">{projectedBalance.toLocaleString()} {localSalesCurrencyCode}</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Update Payment Form */}
                  <div className="bg-blue-50 p-4 rounded-lg mb-4">
                    <p className="text-sm text-gray-600">Outstanding Balance:</p>
                    <p className="text-2xl font-bold text-blue-600">{formatLocalMoney(editingSale.balance)}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Payment Amount ({localSalesCurrencyCode}) *</label>
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
            ) : saleDetail && (() => {
              const detailRevenue = parseFloat(saleDetail.selling_price_ugx || 0);
              const detailCost = parseFloat(saleDetail.total_cost_ugx || 0);
              const detailProfit = detailRevenue - detailCost;
              const detailMarginPct = detailRevenue > 0 ? (detailProfit / detailRevenue) * 100 : 0;

              return (
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
                  {saleDetail.quantity && saleDetail.quantity > 1 && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Quantity:</span>
                        <span className="font-medium">{saleDetail.quantity} units</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Unit Price:</span>
                        <span className="font-medium">{formatLocalMoney(saleDetail.unit_price_ugx || (saleDetail.selling_price_ugx / saleDetail.quantity))}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>Subtotal ({saleDetail.quantity} × {formatLocalMoney(saleDetail.unit_price_ugx || (saleDetail.selling_price_ugx / saleDetail.quantity))}):</span>
                        <span>{formatLocalMoney(saleDetail.selling_price_ugx)}</span>
                      </div>
                      <div className="border-t pt-2"></div>
                    </>
                  )}
                  {(!saleDetail.quantity || saleDetail.quantity === 1) && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Quantity:</span>
                      <span className="font-medium">1 unit</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Selling Price:</span>
                    <span className="font-medium">{formatLocalMoney(saleDetail.selling_price_ugx)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount Paid:</span>
                    <span className="font-medium text-green-600">{formatLocalMoney(saleDetail.amount_paid_ugx)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Cost:</span>
                    <span className="font-medium">{formatLocalMoney(detailCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Profit:</span>
                    <span className={`font-semibold ${detailProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {formatLocalMoney(detailProfit)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Margin %:</span>
                    <span className={`font-semibold ${detailMarginPct >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {detailMarginPct.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-gray-600">Balance:</span>
                    <span className="font-bold text-lg">{formatLocalMoney(saleDetail.balance)}</span>
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

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4 border-t">
                  <button
                    onClick={() => setShowPrintable(true)}
                    className="flex items-center gap-2 flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 justify-center"
                  >
                    <Printer className="w-4 h-4" />
                    Print Invoice
                  </button>
                </div>
              </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Printable Invoice Modal */}
      {showPrintable && saleDetail && (
        <PrintableInvoice
          invoice={{
            ...saleDetail,
            invoice_number: selectedSale?.invoice_number,
            sale_date: selectedSale?.sale_date,
            customer_name: saleDetail.customer_name,
            selling_price_ugx: saleDetail.selling_price_ugx,
            total_cost_ugx: saleDetail.total_cost_ugx,
            profit_ugx: (parseFloat(saleDetail.selling_price_ugx || 0) - parseFloat(saleDetail.total_cost_ugx || 0)),
            amount_paid_ugx: saleDetail.amount_paid_ugx,
            balance_ugx: saleDetail.balance,
            payment_status: saleDetail.payment_status,
            item_name: `${saleDetail.make} ${saleDetail.model} ${saleDetail.year}`
          }}
          type="sales"
          onClose={() => setShowPrintable(false)}
        />
      )}
    </div>
  );
}
