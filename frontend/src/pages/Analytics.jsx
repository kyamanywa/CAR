import { useState, useEffect } from 'react';
import { getSalesAnalytics, getImportAnalytics } from '../api';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { TrendingUp, Package, DollarSign, Car } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { formatCurrency, getCurrencyConfig } from '../utils/currencyUtils';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

function normalizeSalesAnalytics(payload) {
  if (!payload) {
    return {
      sales_over_time: [],
      sales_by_make: [],
      sales_by_model: [],
      sales_by_color: [],
      payment_status: []
    };
  }

  return {
    sales_over_time: payload.sales_over_time || payload.salesOverTime || [],
    sales_by_make: payload.sales_by_make || payload.salesByMake || [],
    sales_by_model: payload.sales_by_model || payload.salesByModel || [],
    sales_by_color: payload.sales_by_color || payload.salesByColor || [],
    payment_status: payload.payment_status || payload.paymentStatus || []
  };
}

function normalizeImportAnalytics(payload) {
  if (!payload) {
    return {
      orders_over_time: [],
      orders_by_country: [],
      orders_by_status: [],
      avg_transit_days: null,
      most_imported_makes: [],
      most_imported_models: []
    };
  }

  return {
    orders_over_time: payload.orders_over_time || payload.ordersOverTime || [],
    orders_by_country: payload.orders_by_country || payload.ordersByCountry || [],
    orders_by_status: payload.orders_by_status || payload.ordersByStatus || [],
    avg_transit_days: payload.avg_transit_days ?? payload.avgTransitDays ?? null,
    most_imported_makes: payload.most_imported_makes || payload.mostImportedMakes || [],
    most_imported_models: payload.most_imported_models || payload.mostImportedModels || []
  };
}

function AnalyticsEmptyState({ title, description }) {
  return (
    <div className="card">
      <div className="py-16 text-center">
        <p className="text-lg font-semibold text-gray-700">{title}</p>
        <p className="mt-2 text-sm text-gray-500">{description}</p>
      </div>
    </div>
  );
}

export default function Analytics() {
  const { user } = useAuth();
  const [salesData, setSalesData] = useState(null);
  const [importData, setImportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [activeTab, setActiveTab] = useState(user?.role === 'foreign_bond_user' ? 'imports' : 'sales');

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [salesRes, importRes] = await Promise.all([
        getSalesAnalytics({ period }),
        getImportAnalytics({ period })
      ]);
      setSalesData(normalizeSalesAnalytics(salesRes.data.data));
      setImportData(normalizeImportAnalytics(importRes.data.data));
    } catch (error) {
      console.error('Error:', error);
      setSalesData(normalizeSalesAnalytics(null));
      setImportData(normalizeImportAnalytics(null));
    } finally {
      setLoading(false);
    }
  };

  const hasSalesData = Boolean(
    salesData && (
      salesData.sales_over_time.length ||
      salesData.sales_by_make.length ||
      salesData.sales_by_model.length ||
      salesData.sales_by_color.length ||
      salesData.payment_status.length
    )
  );

  const hasImportData = Boolean(
    importData && (
      importData.orders_over_time.length ||
      importData.orders_by_country.length ||
      importData.orders_by_status.length ||
      importData.avg_transit_days !== null ||
      importData.most_imported_makes.length ||
      importData.most_imported_models.length
    )
  );

  const topSoldBrand = salesData?.sales_by_make?.[0] || null;
  const topSoldModel = salesData?.sales_by_model?.[0] || null;
  const topImportedBrand = importData?.most_imported_makes?.[0] || null;
  const topImportedModel = importData?.most_imported_models?.[0] || null;
  const localCode = getCurrencyConfig('local_sales').code;

  const formatUGX = (value) => {
    if (!value) return '0';
    return Number(value).toLocaleString();
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    if (period === 'year') {
      return date.toLocaleDateString('en-US', { month: 'short' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Analytics</h1>
          <p className="text-gray-500">Business performance insights</p>
        </div>
        <div className="flex gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="input w-36"
          >
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="quarter">Last Quarter</option>
            <option value="year">Last Year</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {user?.role !== 'foreign_bond_user' && (
          <button
            onClick={() => setActiveTab('sales')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'sales' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Local Sales Analytics
          </button>
        )}
        <button
          onClick={() => setActiveTab('imports')}
          className={`px-6 py-3 font-medium ${
            activeTab === 'imports' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {user?.role === 'foreign_bond_user' ? 'Orders Analytics' : 'Import Orders Analytics'}
        </button>
      </div>

      {activeTab === 'sales' && salesData && hasSalesData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Most Sold Brand</p>
                  <p className="text-2xl font-bold text-gray-900">{topSoldBrand?.make || 'N/A'}</p>
                  <p className="text-sm text-gray-600 mt-1">{topSoldBrand ? `${topSoldBrand.count} sales` : 'No data yet'}</p>
                </div>
                <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
                  <Car className="w-6 h-6" />
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Most Sold Car Type (Model)</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {topSoldModel ? `${topSoldModel.make} ${topSoldModel.model}` : 'N/A'}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">{topSoldModel ? `${topSoldModel.count} sales` : 'No data yet'}</p>
                </div>
                <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>
            </div>
          </div>

          {/* Sales Over Time */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Sales Trend</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesData.sales_over_time || []} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={formatDate} />
                  <YAxis yAxisId="left" tickFormatter={formatUGX} />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'revenue_ugx' || name === 'profit_ugx' ? formatCurrency(value, 'local_sales') : value,
                      name === 'revenue_ugx' ? 'Revenue' : name === 'profit_ugx' ? 'Profit' : 'Sales'
                    ]}
                    labelFormatter={formatDate}
                  />
                  <Legend />
                  <Line yAxisId="right" type="monotone" dataKey="sales_count" name="Sales Count" stroke="#3B82F6" strokeWidth={2} dot={false} />
                  <Line yAxisId="left" type="monotone" dataKey="revenue_ugx" name="Revenue" stroke="#10B981" strokeWidth={2} dot={false} />
                  <Line yAxisId="left" type="monotone" dataKey="profit_ugx" name="Profit" stroke="#8B5CF6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sales by Make & Color */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Sales by Make</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesData.sales_by_make || []} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="make" type="category" />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Sales by Color</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={salesData.sales_by_color || []}
                      dataKey="count"
                      nameKey="color"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ color, count }) => `${color}: ${count}`}
                    >
                      {(salesData.sales_by_color || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Payment Status */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Payment Status Breakdown</h2>
            <div className="grid grid-cols-3 gap-4">
              {(salesData.payment_status || []).map((status, idx) => (
                <div key={idx} className={`p-4 rounded-lg ${
                  status.payment_status === 'Paid' ? 'bg-green-50' :
                  status.payment_status === 'Partial' ? 'bg-yellow-50' : 'bg-red-50'
                }`}>
                  <p className="text-sm text-gray-600">{status.payment_status}</p>
                  <p className="text-2xl font-bold">{status.count}</p>
                  <p className="text-sm text-gray-500">{formatCurrency(status.amount, 'local_sales')}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'sales' && salesData && !hasSalesData && (
        <AnalyticsEmptyState
          title={user?.role === 'foreign_bond_user' ? 'Sales analytics do not apply to suppliers' : 'No sales analytics yet'}
          description={user?.role === 'foreign_bond_user' ? 'Suppliers do not record local sales in this module.' : 'Record local vehicle sales and payments to populate revenue, profit, and payment analytics.'}
        />
      )}

      {activeTab === 'imports' && importData && hasImportData && (
        <div className="space-y-6">
          {user?.role === 'foreign_bond_user' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Top Imported Brand</p>
                    <p className="text-2xl font-bold text-gray-900">{topImportedBrand?.make || 'N/A'}</p>
                    <p className="text-sm text-gray-600 mt-1">{topImportedBrand ? `${topImportedBrand.count} vehicles` : 'No data yet'}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
                    <Car className="w-6 h-6" />
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Top Imported Car Type (Model)</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {topImportedModel ? `${topImportedModel.make} ${topImportedModel.model}` : 'N/A'}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">{topImportedModel ? `${topImportedModel.count} vehicles` : 'No data yet'}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
                    <Package className="w-6 h-6" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Orders Over Time */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Import Orders Trend</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={importData.orders_over_time || []} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={formatDate} />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => formatCurrency(v, 'import_orders')} />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'total_value_usd' ? formatCurrency(value, 'import_orders') : value,
                      name === 'order_count' ? 'Orders' : name === 'vehicle_count' ? 'Vehicles' : 'Value'
                    ]}
                    labelFormatter={formatDate}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="order_count" name="Orders" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="left" dataKey="vehicle_count" name="Vehicles" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Orders by Country & Status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Orders by Origin Country</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={importData.orders_by_country || []}
                      dataKey="count"
                      nameKey="country"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ country, count }) => `${country}: ${count}`}
                    >
                      {(importData.orders_by_country || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name, props) => [value, props.payload.country]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Orders by Status</h2>
              <div className="space-y-3">
                {(importData.orders_by_status || []).map((status, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                      <span className="font-medium">{status.order_status}</span>
                    </div>
                    <span className="text-lg font-bold">{status.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Average Transit Time */}
          {importData.avg_transit_days && (
            <div className="card bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-white/20 rounded-lg">
                  <Package className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-sm opacity-90">Average Transit Time</p>
                  <p className="text-3xl font-bold">{Math.round(importData.avg_transit_days)} days</p>
                  <p className="text-sm opacity-90">From departure to delivery</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'imports' && importData && !hasImportData && (
        <AnalyticsEmptyState
          title="No import analytics yet"
          description="Create import orders, confirm them, and move them through shipping and border clearance to populate this dashboard."
        />
      )}
    </div>
  );
}
