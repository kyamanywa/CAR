import { useState, useEffect } from 'react';
import { getMyOrders, getMakes, getModels, getVehicles, updateVehicleImage, confirmOrder, updateOrderStatus } from '../api';
import { Package, ChevronDown, ChevronRight, Image as ImageIcon, Upload, CheckCircle, Truck, Printer, X } from 'lucide-react';
import PrintableInvoice from '../components/PrintableInvoice';

export default function SupplierOrders() {
  const [orders, setOrders] = useState([]);
  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [selectedMake, setSelectedMake] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [expandedVehicles, setExpandedVehicles] = useState({});
  const [loading, setLoading] = useState(true);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showPrintable, setShowPrintable] = useState(false);

  useEffect(() => {
    loadData();
  }, []);
  
  useEffect(() => {
    if (selectedMake) {
      loadModels(selectedMake);
      loadVehicles();
    }
  }, [selectedMake]);
  
  useEffect(() => {
    if (selectedModel) {
      loadVehicles();
    }
  }, [selectedModel]);

  const loadData = async () => {
    try {
      const [ordersRes, makesRes] = await Promise.all([
        getMyOrders(),
        getMakes()
      ]);
      setOrders(ordersRes.data.data || []);
      setMakes(makesRes.data.data || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const loadModels = async (makeName) => {
    try {
      // Find the make ID from the make name
      const selectedMakeObj = makes.find(m => m.name === makeName);
      if (!selectedMakeObj) return;
      
      const res = await getModels(selectedMakeObj.id);
      setModels(res.data.data || []);
      setSelectedModel(''); // Reset model when make changes
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  };
  
  const loadVehicles = async () => {
    if (!selectedMake) return;
    
    setVehiclesLoading(true);
    try {
      const params = { make: selectedMake };
      if (selectedModel) params.model = selectedModel;
      
      const res = await getVehicles(params);
      setVehicles(res.data.data || []);
    } catch (error) {
      console.error('Failed to load vehicles:', error);
    } finally {
      setVehiclesLoading(false);
    }
  };
  
  const handleImageUpload = async (vehicleId, event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    // For now, we'll use a placeholder URL. In production, upload to cloud storage
    const reader = new FileReader();
    reader.onloadend = async () => {
      setUploadingImage(vehicleId);
      try {
        await updateVehicleImage(vehicleId, reader.result);
        loadVehicles(); // Reload to show updated image
        alert('Image uploaded successfully!');
      } catch (error) {
        console.error('Failed to upload image:', error);
        alert('Failed to upload image');
      } finally {
        setUploadingImage(null);
      }
    };
    reader.readAsDataURL(file);
  };
  
  const toggleVehicle = (vehicleId) => {
    setExpandedVehicles(prev => ({
      ...prev,
      [vehicleId]: !prev[vehicleId]
    }));
  };
  
  const handleConfirmOrder = async (orderId) => {
    if (!confirm('Confirm this order? This will reduce inventory by the ordered quantities.')) return;
    
    try {
      await confirmOrder(orderId);
      alert('Order confirmed successfully! Inventory has been updated.');
      loadData(); // Reload orders
    } catch (error) {
      console.error('Failed to confirm order:', error);
      alert(error.response?.data?.error || 'Failed to confirm order');
    }
  };
  
  const handleMarkShipped = async (orderId) => {
    if (!confirm('Mark this order as shipped?')) return;
    
    try {
      await updateOrderStatus(orderId, 'Shipped');
      alert('Order marked as shipped!');
      loadData(); // Reload orders
    } catch (error) {
      console.error('Failed to update order:', error);
      alert('Failed to update order status');
    }
  };

  if (loading) return <div className="flex justify-center items-center h-64">Loading...</div>;

  // Group vehicles by model for display
  const groupedByModel = vehicles.reduce((acc, vehicle) => {
    const model = vehicle.model || 'Unknown';
    if (!acc[model]) acc[model] = [];
    acc[model].push(vehicle);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Orders & Inventory</h1>
        <p className="text-gray-600 mt-1">Manage orders from buyers and browse your vehicle inventory</p>
      </div>

      {/* Orders Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-600 text-sm">Total Orders</p>
          <p className="text-3xl font-bold mt-2">{orders.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-600 text-sm">Pending</p>
          <p className="text-3xl font-bold mt-2 text-yellow-600">
            {orders.filter(o => o.status === 'pending').length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-600 text-sm">Shipped</p>
          <p className="text-3xl font-bold mt-2 text-blue-600">
            {orders.filter(o => o.status === 'shipped').length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-600 text-sm">Delivered</p>
          <p className="text-3xl font-bold mt-2 text-green-600">
            {orders.filter(o => o.status === 'delivered').length}
          </p>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">Recent Orders</h2>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.slice(0, 5).map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-mono">#{order.id}</td>
                  <td className="px-6 py-4 text-sm">{order.dealership_name || order.bond_name || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm">{order.vehicle_count || 0}</td>
                  <td className="px-6 py-4 text-sm font-semibold">${parseFloat(order.total_value || 0).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      order.status?.toLowerCase() === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      order.status?.toLowerCase() === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                      order.status?.toLowerCase() === 'shipped' ? 'bg-purple-100 text-purple-800' :
                      order.status?.toLowerCase() === 'delivered' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {new Date(order.order_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowPrintable(true);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-purple-500 text-white rounded hover:bg-purple-600 text-xs font-medium"
                      >
                        <Printer className="w-4 h-4" />
                        Print
                      </button>
                      {order.status?.toLowerCase() === 'pending' && (
                        <button
                          onClick={() => handleConfirmOrder(order.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded hover:bg-green-600 text-xs font-medium"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Confirm
                        </button>
                      )}
                      {order.status?.toLowerCase() === 'confirmed' && (
                        <button
                          onClick={() => handleMarkShipped(order.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs font-medium"
                        >
                          <Truck className="w-4 h-4" />
                          Ship
                        </button>
                      )}
                      {(order.status?.toLowerCase() === 'shipped' || order.status?.toLowerCase() === 'delivered') && (
                        <span className="text-xs text-gray-500 italic">No action needed</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                    No orders yet. Orders will appear here when dealerships purchase your vehicles.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Vehicle Inventory Browser */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">Browse Vehicle Inventory</h2>
          <p className="text-sm text-gray-600 mt-1">Select make and model to view your vehicles with photos</p>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Filter Dropdowns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Make
              </label>
              <select
                value={selectedMake}
                onChange={(e) => setSelectedMake(e.target.value)}
                className="input w-full"
              >
                <option value="">-- All Makes --</option>
                {makes.map((make) => (
                  <option key={make.id} value={make.name}>
                    {make.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Model
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="input w-full"
                disabled={!selectedMake}
              >
                <option value="">-- All Models --</option>
                {models.map((model) => (
                  <option key={model.id} value={model.name}>
                    {model.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Vehicles Display */}
          {vehiclesLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : selectedMake ? (
            <div className="space-y-4">
              {Object.entries(groupedByModel).map(([model, modelVehicles]) => (
                <div key={model} className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-6 py-3 border-b">
                    <h3 className="font-semibold text-lg">
                      {selectedMake} {model}
                      <span className="text-sm font-normal text-gray-600 ml-2">
                        ({modelVehicles.length} units)
                      </span>
                    </h3>
                  </div>
                  
                  <div className="divide-y">
                    {modelVehicles.map((vehicle) => (
                      <div key={vehicle.id} className="p-4">
                        <div 
                          className="flex items-start gap-4 cursor-pointer"
                          onClick={() => toggleVehicle(vehicle.id)}
                        >
                          {/* Vehicle Image */}
                          <div className="w-32 h-24 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0 relative group">
                            {vehicle.image_url ? (
                              <img 
                                src={vehicle.image_url} 
                                alt={`${vehicle.make} ${vehicle.model}`}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <ImageIcon className="w-8 h-8" />
                              </div>
                            )}
                            <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                              <Upload className="w-6 h-6 text-white" />
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageUpload(vehicle.id, e)}
                                className="hidden"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </label>
                            {uploadingImage === vehicle.id && (
                              <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                              </div>
                            )}
                          </div>
                          
                          {/* Vehicle Info */}
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-semibold text-lg">
                                  {vehicle.year} {vehicle.make} {vehicle.model}
                                </h4>
                                <p className="text-sm text-gray-600 mt-1">
                                  {vehicle.color} • {vehicle.engine_cc}cc • {vehicle.transmission} • {vehicle.fuel_type}
                                </p>
                                <p className="text-xs text-gray-500 font-mono mt-1">
                                  Chassis: {vehicle.chassis_number}
                                </p>
                                {vehicle.quantity > 1 && (
                                  <span className="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                                    Quantity: {vehicle.quantity}
                                  </span>
                                )}
                              </div>
                              
                              <div className="text-right">
                                <p className="text-xl font-bold text-blue-600">
                                  ${vehicle.purchase_price_usd?.toLocaleString()}
                                </p>
                                <span className={`inline-block mt-1 px-2 py-1 rounded text-xs font-medium ${
                                  vehicle.status === 'Available' ? 'bg-green-100 text-green-800' :
                                  vehicle.status === 'ordered' ? 'bg-yellow-100 text-yellow-800' :
                                  vehicle.status === 'In Transit' ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {vehicle.status}
                                </span>
                              </div>
                            </div>
                            
                            {/* Expanded Details */}
                            {expandedVehicles[vehicle.id] && (
                              <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                                <div>
                                  <p className="text-gray-500">Body Type</p>
                                  <p className="font-medium">{vehicle.body_type || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Mileage</p>
                                  <p className="font-medium">{vehicle.mileage?.toLocaleString()} km</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Capacity</p>
                                  <p className="font-medium">{vehicle.capacity_tons ? `${vehicle.capacity_tons} tons` : 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Added</p>
                                  <p className="font-medium">{new Date(vehicle.created_at).toLocaleDateString()}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Updated</p>
                                  <p className="font-medium">{new Date(vehicle.updated_at).toLocaleDateString()}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Sale Price</p>
                                  <p className="font-medium">${vehicle.sale_price_usd?.toLocaleString() || 'Not set'}</p>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-shrink-0">
                            {expandedVehicles[vehicle.id] ? (
                              <ChevronDown className="w-5 h-5 text-gray-400" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              {vehicles.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No vehicles found for the selected filters</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Select a make to browse your vehicles</p>
            </div>
          )}
        </div>
      </div>

      {/* Printable Invoice Modal */}
      {showPrintable && selectedOrder && (
        <PrintableInvoice
          invoice={{
            order_number: selectedOrder.order_number,
            created_at: selectedOrder.order_date,
            counterparty_name: selectedOrder.dealership_name || selectedOrder.bond_name || 'N/A',
            total_amount_usd: selectedOrder.total_value || 0,
            units: selectedOrder.vehicle_count || 0,
            order_status: selectedOrder.status
          }}
          type="order"
          onClose={() => setShowPrintable(false)}
        />
      )}
    </div>
  );
}
