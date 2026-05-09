import { useState, useEffect } from 'react';
import { Package, TrendingUp, ShoppingCart, DollarSign, Plus, X, MapPin, Calendar } from 'lucide-react';
import { getMyVehicles, getMyOrders } from '../api';

export default function SupplierDashboard() {
  const [vehicles, setVehicles] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [vehiclesRes, ordersRes] = await Promise.all([
        getMyVehicles(),
        getMyOrders()
      ]);
      console.log('=== DASHBOARD LOAD DATA ===');
      console.log('Vehicles API Response:', vehiclesRes);
      console.log('Vehicles Data:', vehiclesRes.data);
      console.log('Vehicles Array:', vehiclesRes.data.data);
      console.log('Vehicle Count:', vehiclesRes.data.data?.length);
      console.log('Orders Data:', ordersRes.data);
      
      const vehicleArray = vehiclesRes.data.data || [];
      const orderArray = ordersRes.data.data || [];
      
      console.log('Setting vehicles state:', vehicleArray.length, 'vehicles');
      console.log('Setting orders state:', orderArray.length, 'orders');
      
      setVehicles(vehicleArray);
      setOrders(orderArray);
    } catch (error) {
      console.error('Failed to load data:', error);
      alert('Error loading data: ' + error.message);
      setVehicles([]);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    totalVehicles: vehicles.length,
    availableVehicles: vehicles.filter(v => v.status?.toLowerCase() === 'available').length,
    orderedVehicles: vehicles.filter(v => v.status?.toLowerCase() === 'ordered').length,
    totalValue: vehicles.reduce((sum, v) => sum + (parseFloat(v.sale_price_usd || v.sale_price) || 0), 0),
    totalOrders: orders.length,
    pendingOrders: orders.filter(o => o.status === 'pending').length
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Supplier Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage your vehicle inventory and buyer orders</p>
          <div className="mt-2">
            <span className="text-2xl font-bold text-blue-600">{stats.totalVehicles} Vehicles</span>
            <span className="text-gray-500 ml-2">in your inventory</span>
          </div>
        </div>
        <button
          onClick={() => window.location.href = '/supplier/add-vehicle'}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Vehicle
        </button>
      </div>

      {/* Stats Grid - Clickable Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div 
          onClick={() => window.location.href = '/supplier/inventory'}
          className="bg-white p-6 rounded-lg shadow cursor-pointer hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Vehicles</p>
              <p className="text-3xl font-bold mt-2">{stats.totalVehicles}</p>
              <p className="text-xs text-blue-600 mt-1">Click to view all →</p>
            </div>
            <Package className="w-12 h-12 text-blue-600" />
          </div>
        </div>

        <div 
          onClick={() => window.location.href = '/supplier/inventory?filter=available'}
          className="bg-white p-6 rounded-lg shadow cursor-pointer hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Available</p>
              <p className="text-3xl font-bold mt-2 text-green-600">{stats.availableVehicles}</p>
              <p className="text-xs text-green-600 mt-1">Click to view →</p>
            </div>
            <TrendingUp className="w-12 h-12 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Orders</p>
              <p className="text-3xl font-bold mt-2 text-purple-600">{stats.totalOrders}</p>
            </div>
            <ShoppingCart className="w-12 h-12 text-purple-600" />
          </div>
        </div>

        <div 
          onClick={() => window.location.href = '/supplier/inventory'}
          className="bg-white p-6 rounded-lg shadow cursor-pointer hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Inventory Value</p>
              <p className="text-3xl font-bold mt-2 text-orange-600">
                ${stats.totalValue.toLocaleString()}
              </p>
              <p className="text-xs text-orange-600 mt-1">Click to view →</p>
            </div>
            <DollarSign className="w-12 h-12 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Recent Vehicles */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">My Vehicles</h2>
            <p className="text-sm text-gray-500 mt-1">Showing {Math.min(vehicles.length, 10)} of {vehicles.length} total vehicles</p>
          </div>
          {vehicles.length > 10 && (
            <button
              onClick={() => window.location.href = '/supplier/inventory'}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              View All →
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chassis</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {vehicles.slice(0, 10).map((vehicle) => (
                <tr 
                  key={vehicle.id} 
                  onClick={() => setSelectedVehicle(vehicle)}
                  className="hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4 text-sm font-mono">{vehicle.chassis_number}</td>
                  <td className="px-6 py-4 text-sm">{vehicle.make} {vehicle.model}</td>
                  <td className="px-6 py-4 text-sm">{vehicle.year}</td>
                  <td className="px-6 py-4 text-sm font-semibold">${parseFloat(vehicle.sale_price_usd || vehicle.sale_price || 0).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      vehicle.status?.toLowerCase() === 'available' ? 'bg-green-100 text-green-800' :
                      vehicle.status?.toLowerCase() === 'ordered' ? 'bg-blue-100 text-blue-800' :
                      vehicle.status?.toLowerCase() === 'sold' ? 'bg-gray-100 text-gray-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {vehicle.status}
                    </span>
                  </td>
                </tr>
              ))}
              {vehicles.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    No vehicles yet. Click "Add Vehicle" to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Orders - Orders FROM Buyers */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">Orders from Buyers</h2>
          <p className="text-sm text-gray-500 mt-1">Purchase orders from dealerships/bonds for your vehicles</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Buyer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicles</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.slice(0, 10).map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-mono">#{order.id}</td>
                  <td className="px-6 py-4 text-sm">{order.dealership_name || order.bond_name || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm">{order.vehicle_count || 0}</td>
                  <td className="px-6 py-4 text-sm font-semibold">${parseFloat(order.total_value || 0).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      order.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                      order.status === 'shipped' ? 'bg-purple-100 text-purple-800' :
                      order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {new Date(order.order_date).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    No orders yet. Start by adding vehicles to your inventory.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vehicle Detail Modal */}
      {selectedVehicle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-start sticky top-0 bg-white">
              <div>
                <h2 className="text-2xl font-bold">{selectedVehicle.make} {selectedVehicle.model}</h2>
                <p className="text-gray-600 mt-1">{selectedVehicle.year} • Chassis: {selectedVehicle.chassis_number}</p>
              </div>
              <button onClick={() => setSelectedVehicle(null)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Status Badge */}
              <div>
                <span className={`px-4 py-2 rounded-full text-sm font-medium inline-flex items-center gap-2 ${
                  selectedVehicle.status === 'Available' ? 'bg-green-100 text-green-800' :
                  selectedVehicle.status === 'ordered' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  <Package className="w-4 h-4" />
                  {selectedVehicle.status}
                </span>
                {selectedVehicle.quantity > 1 && (
                  <span className="ml-3 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                    {selectedVehicle.quantity} units in stock
                  </span>
                )}
              </div>

              {/* Vehicle Identification */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Chassis Number</p>
                  <p className="text-lg font-mono font-bold mt-1">{selectedVehicle.chassis_number}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Engine Number</p>
                  <p className="text-lg font-mono font-bold mt-1">{selectedVehicle.engine_number || 'N/A'}</p>
                </div>
              </div>

              {/* Pricing Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Pricing Details
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <p className="text-sm text-orange-600">Purchase Cost</p>
                    <p className="text-xl font-bold mt-1">${parseFloat(selectedVehicle.purchase_price_usd || 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-600">Sale Price</p>
                    <p className="text-xl font-bold mt-1">${parseFloat(selectedVehicle.sale_price_usd || selectedVehicle.sale_price || 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-green-600">Profit Margin</p>
                    <p className="text-xl font-bold mt-1">
                      ${(parseFloat(selectedVehicle.sale_price_usd || selectedVehicle.sale_price || 0) - parseFloat(selectedVehicle.purchase_price_usd || 0)).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Vehicle Details */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Vehicle Specifications</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Make</p>
                    <p className="font-semibold">{selectedVehicle.make}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Model</p>
                    <p className="font-semibold">{selectedVehicle.model}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Year</p>
                    <p className="font-semibold">{selectedVehicle.year}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Color</p>
                    <p className="font-semibold">{selectedVehicle.color || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Fuel Type</p>
                    <p className="font-semibold">{selectedVehicle.fuel_type || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Transmission</p>
                    <p className="font-semibold">{selectedVehicle.transmission || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Location & Dates */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Location & Timeline
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <p className="text-sm text-gray-600">Added On</p>
                    </div>
                    <p className="font-semibold">{new Date(selectedVehicle.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <p className="text-sm text-gray-600">Last Updated</p>
                    </div>
                    <p className="font-semibold">{new Date(selectedVehicle.updated_at || selectedVehicle.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {selectedVehicle.notes && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Notes</h3>
                  <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{selectedVehicle.notes}</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setSelectedVehicle(null)}
                className="px-6 py-2 border rounded-lg hover:bg-gray-100"
              >
                Close
              </button>
              <button
                onClick={() => window.location.href = '/supplier/inventory'}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Go to Full Inventory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
