import { useState, useEffect } from 'react';
import { getVehicles, getSales, getSalesStats, getCustomers } from '../api';
import { DollarSign, TrendingUp, Users, Car, Plus, Eye, Search, Package } from 'lucide-react';
import { formatCurrency, getCurrencyConfig } from '../utils/currencyUtils';
import { useNavigate } from 'react-router-dom';
import VehicleDetailModal from '../components/VehicleDetailModal';

export default function SalesDashboard() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [recentSales, setRecentSales] = useState([]);
  const [stats, setStats] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  
  const localSalesCurrency = getCurrencyConfig('local_sales');

  useEffect(() => {
    fetchData();
  }, []);

  const toArray = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
  };

  const toObject = (payload) => {
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      if (payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) {
        return payload.data;
      }
      return payload;
    }
    return {};
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [vehiclesRes, salesRes, statsRes, customersRes] = await Promise.all([
        getVehicles({ status: 'Available' }),
        getSales({ limit: 10 }),
        getSalesStats({}),
        getCustomers({})
      ]);
      
      setVehicles(toArray(vehiclesRes.data));
      setRecentSales(toArray(salesRes.data));
      setStats(toObject(statsRes.data));
      setCustomers(toArray(customersRes.data));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredVehicles = vehicles.filter(v => 
    !searchTerm || 
    v.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.chassis_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600">Loading sales dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Sales Dashboard</h1>
        <p className="text-gray-600 mt-1">Manage sales and view available inventory</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Available Vehicles</p>
              <p className="text-2xl font-bold mt-1">{vehicles.length}</p>
            </div>
            <Car className="w-10 h-10 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Sales</p>
              <p className="text-2xl font-bold mt-1">{stats?.total_sales || 0}</p>
            </div>
            <TrendingUp className="w-10 h-10 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Customers</p>
              <p className="text-2xl font-bold mt-1">{customers.length}</p>
            </div>
            <Users className="w-10 h-10 text-purple-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Payments</p>
              <p className="text-2xl font-bold mt-1">{stats?.pending_payments || 0}</p>
            </div>
            <DollarSign className="w-10 h-10 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <button
          onClick={() => navigate('/sales')}
          className="bg-green-600 text-white p-6 rounded-lg shadow hover:bg-green-700 transition flex items-center justify-between"
        >
          <div className="text-left">
            <div className="flex items-center gap-2 mb-2">
              <Plus className="w-6 h-6" />
              <span className="text-xl font-bold">Create New Sale</span>
            </div>
            <p className="text-green-100">Record a new vehicle sale</p>
          </div>
        </button>

        <button
          onClick={() => navigate('/customers')}
          className="bg-blue-600 text-white p-6 rounded-lg shadow hover:bg-blue-700 transition flex items-center justify-between"
        >
          <div className="text-left">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-6 h-6" />
              <span className="text-xl font-bold">Manage Customers</span>
            </div>
            <p className="text-blue-100">Add or view customer records</p>
          </div>
        </button>
      </div>

      {/* Available Vehicles */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Available Vehicles</h2>
            <button
              onClick={() => navigate('/inventory')}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              View All Inventory →
            </button>
          </div>
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by make, model, or chassis..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-4 text-sm font-semibold text-gray-600">Vehicle</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-600">Chassis</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-600">Year</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-600">Color</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-600">Price</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-600">Status</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center p-8 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No vehicles available for sale</p>
                  </td>
                </tr>
              ) : (
                filteredVehicles.map((vehicle) => (
                  <tr key={vehicle.id} className="border-b hover:bg-gray-50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {vehicle.image_url && (
                          <img
                            src={vehicle.image_url}
                            alt={`${vehicle.make} ${vehicle.model}`}
                            className="w-16 h-12 object-cover rounded"
                          />
                        )}
                        <div>
                          <p className="font-semibold">{vehicle.make} {vehicle.model}</p>
                          <p className="text-sm text-gray-500">{vehicle.body_type || 'N/A'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-sm">{vehicle.chassis_number}</td>
                    <td className="p-4">{vehicle.year}</td>
                    <td className="p-4">{vehicle.color || 'N/A'}</td>
                    <td className="p-4 font-semibold text-green-600">
                      {vehicle.sale_price_ugx 
                        ? formatCurrency(parseFloat(vehicle.sale_price_ugx), localSalesCurrency.code)
                        : 'N/A'}
                    </td>
                    <td className="p-4">
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                        {vehicle.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => setSelectedVehicle(vehicle)}
                        className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Sales */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Recent Sales</h2>
            <button
              onClick={() => navigate('/sales')}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              View All Sales →
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-4 text-sm font-semibold text-gray-600">Date</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-600">Customer</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-600">Vehicle</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-600">Amount</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentSales.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center p-8 text-gray-500">
                    No recent sales
                  </td>
                </tr>
              ) : (
                recentSales.slice(0, 10).map((sale) => (
                  <tr key={sale.id} className="border-b hover:bg-gray-50">
                    <td className="p-4">{new Date(sale.sale_date).toLocaleDateString()}</td>
                    <td className="p-4">
                      <p className="font-semibold">{sale.customer_name}</p>
                      <p className="text-sm text-gray-500">{sale.customer_phone}</p>
                    </td>
                    <td className="p-4">{sale.make} {sale.model} ({sale.year})</td>
                    <td className="p-4 font-semibold">
                      {formatCurrency(parseFloat(sale.selling_price_ugx || 0), localSalesCurrency.code)}
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        sale.payment_status === 'Paid' ? 'bg-green-100 text-green-800' :
                        sale.payment_status === 'Partial' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {sale.payment_status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vehicle Detail Modal */}
      {selectedVehicle && (
        <VehicleDetailModal 
          vehicle={selectedVehicle} 
          onClose={() => setSelectedVehicle(null)} 
        />
      )}
    </div>
  );
}
