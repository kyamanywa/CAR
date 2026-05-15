import { useState, useEffect } from 'react';
import { getDashboardStats, getPipeline, getRecentOrders, getRecentSales, getUgandanBonds } from '../api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Car, ShoppingCart, DollarSign, Building2, TrendingUp, Package, Users, CheckCircle, XCircle, Calendar } from 'lucide-react';
import { useAuth } from '../AuthContext';
import UsageMeter from '../components/UsageMeter';
import { useCurrency } from '../CurrencyContext';
import { useNavigate } from 'react-router-dom';

const DATE_RANGES = [
  { label: 'This Month', value: 'month' },
  { label: 'Last 3 Months', value: '3months' },
  { label: 'This Year', value: 'year' },
  { label: 'All Time', value: 'all' },
];

function getDateRange(range) {
  const now = new Date();
  const from = new Date();
  if (range === 'month') from.setDate(1);
  else if (range === '3months') from.setMonth(now.getMonth() - 3);
  else if (range === 'year') from.setMonth(0, 1);
  else return {};
  return { from: from.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) };
}

export default function Dashboard() {
  const { user } = useAuth();
  const { formatUGX } = useCurrency();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [pipeline, setPipeline] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [recentSales, setRecentSales] = useState([]);
  const [bonds, setBonds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('month');

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const rangeParams = getDateRange(dateRange);
      const promises = [
        getDashboardStats(rangeParams),
        getPipeline(),
        getRecentOrders(),
        getRecentSales()
      ];
      
      // Admin also fetches bonds data
      if (user?.role === 'admin') {
        promises.push(getUgandanBonds());
      }
      
      const results = await Promise.all(promises);
      const normalizePipeline = (raw = []) => {
        const stageOrder = ['Available', 'Ordered', 'In Transit', 'At Border', 'In Stock', 'Sold'];
        const byStage = new Map((raw || []).map((r) => [r.stage, Number(r.count || 0)]));
        return stageOrder.map((stage) => ({ stage, count: byStage.get(stage) || 0 }));
      };
      
      setStats(results[0].data.data);
      setPipeline(normalizePipeline(results[1].data.data));
      setRecentOrders(results[2].data.data);
      setRecentSales(results[3].data.data);
      
      if (user?.role === 'admin' && results[4]) {
        setBonds(results[4].data.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatLocalMoney = (value) => formatUGX(value);
  const salesRevenue = Number(stats?.sales?.total_revenue || 0);
  const salesProfit = Number(stats?.sales?.total_profit || 0);
  const salesCost = Math.max(0, salesRevenue - salesProfit);
  const salesMarginPct = salesRevenue > 0 ? (salesProfit / salesRevenue) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500">
            {user?.role === 'admin' 
              ? 'System Overview - All Subscribers' 
              : 'Welcome to Uganda Car Import Tracking System'}
          </p>
        </div>
        {/* Date range selector */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-1.5 shadow-sm">
          <Calendar size={15} className="text-gray-400" />
          <div className="flex gap-1">
            {DATE_RANGES.map(r => (
              <button
                key={r.value}
                onClick={() => setDateRange(r.value)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${dateRange === r.value ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        {/* Usage Meter for Dealerships */}
        {user?.account_type?.includes('dealership') && (
          <div className="w-80">
            <UsageMeter />
          </div>
        )}
      </div>

      {/* Admin: Subscriber Stats */}
      {user?.role === 'admin' && bonds.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-medium">Total Subscribers</p>
                <p className="text-3xl font-bold text-blue-900">{bonds.length}</p>
                <p className="text-xs text-blue-600">Registered bonds</p>
              </div>
              <div className="p-3 bg-blue-200 rounded-lg">
                <Building2 className="w-7 h-7 text-blue-700" />
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-medium">Active Subscribers</p>
                <p className="text-3xl font-bold text-green-900">
                  {bonds.filter(b => b.status === 'Active').length}
                </p>
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Currently using system
                </p>
              </div>
              <div className="p-3 bg-green-200 rounded-lg">
                <CheckCircle className="w-7 h-7 text-green-700" />
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700 font-medium">Inactive Subscribers</p>
                <p className="text-3xl font-bold text-red-900">
                  {bonds.filter(b => b.status !== 'Active').length}
                </p>
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <XCircle className="w-3 h-3" />
                  Suspended accounts
                </p>
              </div>
              <div className="p-3 bg-red-200 rounded-lg">
                <XCircle className="w-7 h-7 text-red-700" />
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-700 font-medium">Total Inventory</p>
                <p className="text-3xl font-bold text-purple-900">
                  {bonds.reduce((sum, b) => sum + (b.in_stock_count || 0), 0)}
                </p>
                <p className="text-xs text-purple-600">Vehicles across all bonds</p>
              </div>
              <div className="p-3 bg-purple-200 rounded-lg">
                <Car className="w-7 h-7 text-purple-700" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Regular Stats Grid */}
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          KPI Summary — {DATE_RANGES.find(r => r.value === dateRange)?.label}
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Vehicles</p>
              <p className="text-2xl font-bold">{stats?.vehicles?.total || 0}</p>
              <p className="text-xs text-green-600">{stats?.vehicles?.in_stock || 0} in stock</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Car className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Orders</p>
              <p className="text-2xl font-bold">{stats?.orders?.total || 0}</p>
              <p className="text-xs text-yellow-600">{stats?.orders?.shipped || 0} in transit</p>
              <p className="text-xs text-gray-400 italic">Orders to suppliers</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="text-2xl font-bold">{formatLocalMoney(stats?.sales?.total_revenue)}</p>
              <p className="text-xs text-green-600">{stats?.sales?.total_sales || 0} sales</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Cost of Sales</p>
              <p className="text-2xl font-bold">{formatLocalMoney(salesCost)}</p>
              <p className="text-xs text-gray-500">Estimated acquisition cost</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <Package className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Profit</p>
              <p className="text-2xl font-bold">{formatLocalMoney(stats?.sales?.total_profit)}</p>
              <p className="text-xs text-blue-600">Margin: {salesMarginPct.toFixed(2)}%</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline Chart */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Vehicle Pipeline</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={pipeline} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="stage" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Recent Orders</h2>
          <div className="space-y-3">
            {recentOrders.length === 0 ? (
              <p className="text-gray-500 text-sm">No recent orders</p>
            ) : (
              recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{order.order_number}</p>
                    <p className="text-sm text-gray-500">{order.dealership_name || order.foreign_bond_name}</p>
                  </div>
                  <div className="text-right">
                    <span className={`badge ${
                      order.order_status === 'Delivered' ? 'badge-green' :
                      order.order_status === 'Shipped' ? 'badge-blue' :
                      order.order_status === 'At Border' ? 'badge-yellow' : 'badge-gray'
                    }`}>
                      {order.order_status}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">{order.vehicle_count} vehicles</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Sales */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Recent Sales</h2>
          <div className="space-y-3">
            {recentSales.length === 0 ? (
              <p className="text-gray-500 text-sm">No recent sales</p>
            ) : (
              recentSales.map((sale) => (
                <button
                  key={sale.id}
                  onClick={() => navigate('/sales', { state: { openSaleId: sale.id } })}
                  className="w-full text-left flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <div>
                    <p className="font-medium">{sale.make} {sale.model} {sale.year}</p>
                    <p className="text-sm text-gray-500">{sale.customer_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-green-600">{formatLocalMoney(sale.selling_price_ugx)}</p>
                    <span className={`badge ${
                      sale.payment_status === 'Paid' ? 'badge-green' :
                      sale.payment_status === 'Partial' ? 'badge-yellow' : 'badge-red'
                    }`}>
                      {sale.payment_status}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Admin: Active Subscribers List */}
      {user?.role === 'admin' && bonds.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Active Subscribers</h2>
            <a href="/ugandan-bonds" className="text-sm text-blue-600 hover:underline">
              View All →
            </a>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bonds
              .filter(b => b.status === 'Active')
              .slice(0, 6)
              .map((bond) => (
                <div key={bond.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-blue-600" />
                      <h3 className="font-semibold text-sm">{bond.name}</h3>
                    </div>
                    <span className="badge badge-green text-xs">Active</span>
                  </div>
                  <div className="text-xs text-gray-600 mb-2">{bond.city}</div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1">
                      <Car className="w-3 h-3" />
                      {bond.in_stock_count || 0} vehicles
                    </span>
                    <span className="flex items-center gap-1">
                      <Package className="w-3 h-3" />
                      {bond.pending_orders || 0} orders
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
