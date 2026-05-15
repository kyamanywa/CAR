import { useState, useEffect } from 'react';
import { getImportOrders, getImportOrder, createImportOrder, updateImportOrder, deleteImportOrder, getForeignBonds, getForeignBondVehicles } from '../api';
import { Package, X, Check, Clock, Truck, Ship, Shield, MapPin, Plus, ChevronDown, ChevronRight, Navigation, Edit, Trash2 } from 'lucide-react';
import TrackingTimeline from '../components/TrackingTimeline';

const ORDER_STEPS = [
  { status: 'Pending', icon: Clock, label: 'Pending' },
  { status: 'Confirmed', icon: Check, label: 'Confirmed' },
  { status: 'Shipped', icon: Ship, label: 'Shipped' },
  { status: 'At Border', icon: Shield, label: 'At Border' },
  { status: 'Cleared', icon: Check, label: 'Cleared' },
  { status: 'Delivered', icon: MapPin, label: 'Delivered' },
];

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetail, setOrderDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showTracking, setShowTracking] = useState(false);
  const [trackingOrderId, setTrackingOrderId] = useState(null);
  
  // Create order states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [foreignBonds, setForeignBonds] = useState([]);
  const [selectedBond, setSelectedBond] = useState('');
  const [bondVehicles, setBondVehicles] = useState([]);
  const [selectedVehicles, setSelectedVehicles] = useState([]);
  const [vehicleQuantities, setVehicleQuantities] = useState({}); // Track quantities for each vehicle
  const [creating, setCreating] = useState(false);
  const [expandedMakes, setExpandedMakes] = useState({});
  const [expandedModels, setExpandedModels] = useState({});

  useEffect(() => {
    fetchOrders();
  }, [filter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = filter ? { status: filter } : {};
      const res = await getImportOrders(params);
      setOrders(res.data.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewOrder = async (order) => {
    setSelectedOrder(order);
    setDetailLoading(true);
    try {
      const res = await getImportOrder(order.id);
      console.log('Order detail response:', res.data);
      setOrderDetail(res.data.data);
    } catch (error) {
      console.error('Error loading order details:', error);
      setOrderDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const getStepIndex = (status) => {
    const idx = ORDER_STEPS.findIndex(s => s.status === status);
    return idx >= 0 ? idx : 0;
  };
  
  const handleOpenCreateModal = async () => {
    setShowCreateModal(true);
    try {
      const res = await getForeignBonds();
      setForeignBonds(res.data.data);
    } catch (error) {
      console.error('Error loading bonds:', error);
    }
  };
  
  const handleBondSelect = async (bondId) => {
    setSelectedBond(bondId);
    setSelectedVehicles([]);
    if (bondId) {
      try {
        const res = await getForeignBondVehicles(bondId, { orderable: 'true' });
        setBondVehicles(res.data.data);
      } catch (error) {
        console.error('Error loading vehicles:', error);
      }
    } else {
      setBondVehicles([]);
    }
  };
  
  const toggleVehicle = (vehicleId) => {
    setSelectedVehicles(prev => {
      const isSelected = prev.includes(vehicleId);
      if (isSelected) {
        // Remove vehicle and its quantity
        setVehicleQuantities(prevQty => {
          const newQty = { ...prevQty };
          delete newQty[vehicleId];
          return newQty;
        });
        return prev.filter(id => id !== vehicleId);
      } else {
        // Add vehicle with default quantity of 1
        setVehicleQuantities(prevQty => ({ ...prevQty, [vehicleId]: 1 }));
        return [...prev, vehicleId];
      }
    });
  };
  
  const updateVehicleQuantity = (vehicleId, quantity, maxQuantity) => {
    const qty = Math.max(1, Math.min(parseInt(quantity) || 1, maxQuantity));
    setVehicleQuantities(prev => ({ ...prev, [vehicleId]: qty }));
  };
  
  const toggleMake = (make) => {
    setExpandedMakes(prev => ({ ...prev, [make]: !prev[make] }));
  };
  
  const toggleModel = (make, model) => {
    const key = `${make}-${model}`;
    setExpandedModels(prev => ({ ...prev, [key]: !prev[key] }));
  };
  
  // Group vehicles by make and model
  const groupedVehicles = bondVehicles.reduce((acc, vehicle) => {
    const make = vehicle.make || 'Unknown';
    const model = vehicle.model || 'Unknown';
    if (!acc[make]) acc[make] = {};
    if (!acc[make][model]) acc[make][model] = [];
    acc[make][model].push(vehicle);
    return acc;
  }, {});
  
  const handleCreateOrder = async () => {
    if (!selectedBond || selectedVehicles.length === 0) {
      alert('Please select a foreign bond and at least one vehicle');
      return;
    }
    
    setCreating(true);
    try {
      // Calculate total amount considering quantities
      const totalAmount = bondVehicles
        .filter(v => selectedVehicles.includes(v.id))
        .reduce((sum, v) => {
          const qty = vehicleQuantities[v.id] || 1;
          return sum + (parseFloat(v.sale_price_usd) || parseFloat(v.sale_price) || 0) * qty;
        }, 0);
      
      // Count total units
      const totalUnits = Object.values(vehicleQuantities).reduce((sum, qty) => sum + qty, 0);
      
      await createImportOrder({
        foreign_bond_id: parseInt(selectedBond),
        vehicle_ids: selectedVehicles,
        vehicle_quantities: vehicleQuantities,
        total_amount_usd: totalAmount,
        notes: `Order for ${selectedVehicles.length} vehicle types, ${totalUnits} total units`
      });
      
      alert('Order created successfully!');
      setShowCreateModal(false);
      setSelectedBond('');
      setSelectedVehicles([]);
      setVehicleQuantities({});
      setBondVehicles([]);
      fetchOrders();
    } catch (error) {
      console.error('Error creating order:', error);
      alert(error.response?.data?.error || 'Failed to create order');
    } finally {
      setCreating(false);
    }
  };
  
  const handleEditOrder = async (order) => {
    setEditingOrder(order);
    setSelectedBond(order.foreign_bond_id);
    setShowEditModal(true);
    
    try {
      const res = await getForeignBondVehicles(order.foreign_bond_id, { orderable: 'true' });
      setBondVehicles(res.data.data);
      
      // Get current order details
      const orderRes = await getImportOrder(order.id);
      const currentVehicleIds = orderRes.data.data.vehicles.map(v => v.id);
      setSelectedVehicles(currentVehicleIds);
      
      // Set default quantities to 1 for all selected vehicles
      const quantities = {};
      currentVehicleIds.forEach(id => {
        quantities[id] = 1;
      });
      setVehicleQuantities(quantities);
    } catch (error) {
      console.error('Error loading order for edit:', error);
    }
  };
  
  const handleUpdateOrder = async () => {
    if (!editingOrder || selectedVehicles.length === 0) {
      alert('Please select at least one vehicle');
      return;
    }
    
    setCreating(true);
    try {
      // Calculate total amount considering quantities
      const totalAmount = bondVehicles
        .filter(v => selectedVehicles.includes(v.id))
        .reduce((sum, v) => {
          const qty = vehicleQuantities[v.id] || 1;
          return sum + (parseFloat(v.sale_price_usd) || parseFloat(v.sale_price) || 0) * qty;
        }, 0);
      
      const totalUnits = Object.values(vehicleQuantities).reduce((sum, qty) => sum + qty, 0);
      
      await updateImportOrder(editingOrder.id, {
        vehicle_ids: selectedVehicles,
        vehicle_quantities: vehicleQuantities,
        total_amount_usd: totalAmount,
        notes: `Updated order - ${selectedVehicles.length} vehicle types, ${totalUnits} total units`
      });
      
      alert('Order updated successfully!');
      setShowEditModal(false);
      setEditingOrder(null);
      setSelectedBond('');
      setSelectedVehicles([]);
      setVehicleQuantities({});
      setBondVehicles([]);
      setSelectedOrder(null);
      fetchOrders();
    } catch (error) {
      console.error('Error updating order:', error);
      alert(error.response?.data?.error || 'Failed to update order');
    } finally {
      setCreating(false);
    }
  };
  
  const handleDeleteOrder = async () => {
    if (!selectedOrder) return;
    
    try {
      await deleteImportOrder(selectedOrder.id);
      alert('Order deleted successfully!');
      setShowDeleteConfirm(false);
      setSelectedOrder(null);
      fetchOrders();
    } catch (error) {
      console.error('Error deleting order:', error);
      alert(error.response?.data?.error || 'Failed to delete order');
    }
  };

  const statuses = ['Pending', 'Confirmed', 'Shipped', 'At Border', 'Cleared', 'Delivered', 'Cancelled'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Import Orders</h1>
          <p className="text-gray-500">Track orders from foreign bonds</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="input w-40"
          >
            <option value="">All Status</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={handleOpenCreateModal} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Order
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-gray-600">Order</th>
                <th className="text-left p-4 text-sm font-medium text-gray-600">From → To</th>
                <th className="text-left p-4 text-sm font-medium text-gray-600">Vehicles</th>
                <th className="text-left p-4 text-sm font-medium text-gray-600">Progress</th>
                <th className="text-right p-4 text-sm font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-500">No orders found</td>
                </tr>
              ) : (
                orders.map((order) => {
                  const stepIdx = getStepIndex(order.order_status);
                  return (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="p-4">
                        <p className="font-medium">{order.order_number}</p>
                        <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString()}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-sm">{order.foreign_bond_name}</p>
                        <p className="text-xs text-gray-500">{order.origin_country}</p>
                      </td>
                      <td className="p-4">
                        <span className="text-lg font-medium">{order.vehicle_count}</span>
                        <span className="text-sm text-gray-500 ml-1">vehicles</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          {ORDER_STEPS.map((step, idx) => (
                            <div
                              key={step.status}
                              className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                idx <= stepIdx
                                  ? 'bg-green-500 text-white'
                                  : 'bg-gray-200 text-gray-400'
                              }`}
                              title={step.label}
                            >
                              <step.icon className="w-3 h-3" />
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{order.order_status}</p>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleViewOrder(order)}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h2 className="text-lg font-semibold">{selectedOrder.order_number}</h2>
                <p className="text-sm text-gray-500">
                  Supplier: {selectedOrder.foreign_bond_name} ({selectedOrder.origin_country})
                </p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-auto max-h-[60vh]">
              {detailLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : orderDetail ? (
                <div className="space-y-6">
                  {/* Progress Steps */}
                  <div className="flex justify-between items-center">
                    {ORDER_STEPS.map((step, idx) => {
                      const currentIdx = getStepIndex(orderDetail.order_status);
                      const isComplete = idx <= currentIdx;
                      return (
                        <div key={step.status} className="flex flex-col items-center">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              isComplete ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'
                            }`}
                            title={step.label}
                          >
                            <step.icon className="w-5 h-5" />
                          </div>
                          <p className={`text-xs mt-1 ${isComplete ? 'text-green-600' : 'text-gray-400'}`}>
                            {step.label}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="text-center text-sm text-blue-700 bg-blue-50 border border-blue-100 rounded-lg p-3">
                    Order status is updated by supplier only.
                  </div>

                  {/* Order Info */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-500">Supplier/Foreign Bond</p>
                      <p className="font-medium">{orderDetail.foreign_bond_name}</p>
                      <p className="text-xs text-gray-500">{orderDetail.origin_country}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Units Ordered</p>
                      <p className="font-medium text-blue-600">{orderDetail.total_units || 0} units</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Amount</p>
                      <p className="font-medium text-green-600 text-lg">
                        ${(orderDetail.calculated_total_amount || orderDetail.total_amount_usd || 0).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Order Status</p>
                      <p className="font-medium">{orderDetail.order_status}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Created Date</p>
                      <p className="font-medium">{new Date(orderDetail.created_at).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Vehicle Types</p>
                      <p className="font-medium">{orderDetail.vehicles?.length || 0} types</p>
                    </div>
                  </div>

                  {/* Tracking Button */}
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={() => {
                        setTrackingOrderId(selectedOrder.id);
                        setShowTracking(true);
                      }}
                      className="btn btn-primary flex items-center gap-2"
                    >
                      <Navigation className="w-4 h-4" />
                      View Tracking Timeline
                    </button>
                    
                    {['Pending', 'Confirmed'].includes(orderDetail.order_status) && (
                      <>
                        <button
                          onClick={() => handleEditOrder(selectedOrder)}
                          className="btn bg-blue-500 hover:bg-blue-600 text-white flex items-center gap-2"
                        >
                          <Edit className="w-4 h-4" />
                          Edit Order
                        </button>
                        
                        {orderDetail.order_status === 'Pending' && (
                          <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="btn bg-red-500 hover:bg-red-600 text-white flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  {/* Vehicles */}
                  <div>
                    <h3 className="font-semibold mb-3">
                      Ordered Vehicles ({orderDetail.vehicles?.length || 0} types, {orderDetail.total_units || 0} units)
                    </h3>
                    <div className="space-y-2">
                      {orderDetail.vehicles?.map((v) => {
                        const orderedQty = v.ordered_quantity || 1;
                        const unitPrice = v.purchase_price_usd || 0;
                        const totalPrice = unitPrice * orderedQty;
                        
                        return (
                          <div key={v.id} className="flex items-start justify-between p-4 bg-gray-50 rounded-lg border">
                            <div className="flex-1">
                              <p className="font-semibold text-lg">{v.make} {v.model} {v.year}</p>
                              <p className="text-sm text-gray-600 mt-1">
                                {v.color} • {v.engine_cc}cc • {v.transmission}
                              </p>
                              <p className="text-xs text-gray-500 font-mono mt-1">{v.chassis_number}</p>
                              <div className="flex items-center gap-4 mt-2">
                                <span className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded font-medium">
                                  Quantity: {orderedQty}
                                </span>
                                <span className="text-sm text-gray-600">
                                  @ ${unitPrice.toLocaleString()} each
                                </span>
                              </div>
                            </div>
                            <div className="text-right ml-4">
                              <p className="text-xl font-bold text-green-600">
                                ${totalPrice.toLocaleString()}
                              </p>
                              <span className={`inline-block mt-2 px-2 py-1 rounded text-xs font-medium ${
                                v.status === 'In Stock' ? 'bg-green-100 text-green-800' :
                                v.status === 'In Transit' ? 'bg-blue-100 text-blue-800' :
                                v.status === 'ordered' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {v.status}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {orderDetail.notes && (
                    <div>
                      <h3 className="font-semibold mb-2">Notes</h3>
                      <p className="text-sm text-gray-600">{orderDetail.notes}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">Failed to load order details. Please try again.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Create Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b bg-blue-50">
              <h2 className="text-lg font-semibold text-blue-900">Create New Import Order</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-blue-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-auto max-h-[calc(85vh-140px)]">
              {/* Select Foreign Bond */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Foreign Bond (Source)
                </label>
                <select
                  value={selectedBond}
                  onChange={(e) => handleBondSelect(e.target.value)}
                  className="input w-full"
                >
                  <option value="">-- Choose a Foreign Bond --</option>
                  {foreignBonds.map(bond => (
                    <option key={bond.id} value={bond.id}>
                      {bond.name} ({bond.country}) - {bond.specialization}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Available Vehicles */}
              {selectedBond && (
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">
                    Available Vehicles ({bondVehicles.length})
                  </h3>
                  {bondVehicles.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No available vehicles from this bond</p>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-auto border rounded-lg">
                      {Object.entries(groupedVehicles).map(([make, models]) => {
                        const totalUnits = Object.values(models).flat().length;
                        const totalValue = Object.values(models).flat().reduce((sum, v) => sum + (v.purchase_price_usd || 0), 0);
                        
                        return (
                          <div key={make} className="border-b last:border-b-0">
                            {/* Make Header */}
                            <div
                              onClick={() => toggleMake(make)}
                              className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                {expandedMakes[make] ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                                <span className="font-bold text-lg">{make}</span>
                                <span className="text-sm text-gray-600">
                                  ({totalUnits} units, {Object.keys(models).length} models)
                                </span>
                              </div>
                              <span className="text-sm font-semibold text-blue-600">
                                ${totalValue.toLocaleString()}
                              </span>
                            </div>
                            
                            {/* Models - show when make is expanded */}
                            {expandedMakes[make] && (
                              <div className="bg-white">
                                {Object.entries(models).map(([model, vehicles]) => {
                                  const modelKey = `${make}-${model}`;
                                  const modelValue = vehicles.reduce((sum, v) => sum + (v.purchase_price_usd || 0), 0);
                                  
                                  return (
                                    <div key={modelKey} className="border-t">
                                      {/* Model Header */}
                                      <div
                                        onClick={() => toggleModel(make, model)}
                                        className="flex items-center justify-between p-3 pl-8 bg-gray-50/50 hover:bg-gray-100/50 cursor-pointer"
                                      >
                                        <div className="flex items-center gap-2">
                                          {expandedModels[modelKey] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                          <span className="font-semibold">{model}</span>
                                          <span className="text-sm text-gray-600">
                                            ({vehicles.reduce((s,v) => s + (v.quantity||1), 0)} units in stock)
                                          </span>
                                        </div>
                                        <span className="text-sm font-semibold text-blue-600">
                                          ${modelValue.toLocaleString()}
                                        </span>
                                      </div>
                                      
                                      {/* Individual Units - show when model is expanded */}
                                      {expandedModels[modelKey] && (
                                        <div className="divide-y">
                                          {vehicles.map(vehicle => (
                                            <div
                                              key={vehicle.id}
                                              className={`p-3 pl-12 cursor-pointer transition-all ${
                                                selectedVehicles.includes(vehicle.id)
                                                  ? 'bg-blue-50 border-l-4 border-blue-500'
                                                  : 'hover:bg-gray-50'
                                              }`}
                                              onClick={() => toggleVehicle(vehicle.id)}
                                            >
                                              <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3 flex-1">
                                                  <input
                                                    type="checkbox"
                                                    checked={selectedVehicles.includes(vehicle.id)}
                                                    onChange={() => toggleVehicle(vehicle.id)}
                                                    className="w-4 h-4 text-blue-600"
                                                  />
                                                  <div className="flex-1">
                                                    <p className="font-medium text-gray-900">
                                                      {vehicle.year} - {vehicle.color}
                                                    </p>
                                                    <p className="text-sm text-gray-600">
                                                      {vehicle.engine_cc}cc • {vehicle.transmission} • {vehicle.fuel_type}
                                                    </p>
                                                    <p className="text-xs text-gray-500 font-mono mt-1">
                                                      {vehicle.chassis_number}
                                                    </p>
                                                    <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded mt-1 inline-block">
                                                      In Stock: {vehicle.quantity || 1} units
                                                    </span>
                                                  </div>
                                                </div>
                                                <div className="text-right ml-4">
                                                  <p className="text-lg font-bold text-blue-600">
                                                    ${vehicle.purchase_price_usd?.toLocaleString()}
                                                  </p>
                                                  {selectedVehicles.includes(vehicle.id) && (
                                                    <div className="mt-2 flex items-center gap-2">
                                                      <label className="text-xs text-gray-600">Qty:</label>
                                                      <input
                                                        type="number"
                                                        min="1"
                                                        max={vehicle.quantity || 1}
                                                        value={vehicleQuantities[vehicle.id] || 1}
                                                        onChange={(e) => updateVehicleQuantity(vehicle.id, e.target.value, vehicle.quantity || 1)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="w-20 px-2 py-1 border rounded text-sm"
                                                      />
                                                    </div>
                                                  )}
                                                  <span className="text-xs text-green-600 font-medium block mt-1">
                                                    {vehicle.status}
                                                  </span>
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              
              {/* Order Summary */}
              {selectedVehicles.length > 0 && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-2">Order Summary</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Vehicle Types Selected:</span>
                      <span className="font-medium">{selectedVehicles.length}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Total Units:</span>
                      <span className="font-medium">
                        {Object.values(vehicleQuantities).reduce((sum, qty) => sum + qty, 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-gray-700 font-semibold">Total Amount:</span>
                      <span className="text-xl font-bold text-blue-600">
                        $
                        {bondVehicles
                          .filter(v => selectedVehicles.includes(v.id))
                          .reduce((sum, v) => {
                            const qty = vehicleQuantities[v.id] || 1;
                            return sum + (v.purchase_price_usd || 0) * qty;
                          }, 0)
                          .toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50">
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn-secondary"
                disabled={creating}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateOrder}
                className="btn-primary"
                disabled={creating || !selectedBond || selectedVehicles.length === 0}
              >
                {creating ? 'Creating...' : `Create Order (${Object.values(vehicleQuantities).reduce((sum, qty) => sum + qty, 0)} units)`}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Tracking Timeline Modal */}
      {showTracking && trackingOrderId && (
        <TrackingTimeline
          orderId={trackingOrderId}
          onClose={() => {
            setShowTracking(false);
            setTrackingOrderId(null);
          }}
        />
      )}
      
      {/* Edit Order Modal - same structure as Create Modal */}
      {showEditModal && editingOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b bg-blue-50">
              <h2 className="text-lg font-semibold text-blue-900">Edit Order #{editingOrder.order_number}</h2>
              <button onClick={() => { setShowEditModal(false); setEditingOrder(null); }} className="p-2 hover:bg-blue-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-auto max-h-[calc(85vh-140px)]">
              {/* Foreign Bond (Read-Only) */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Foreign Bond (Source)
                </label>
                <input
                  type="text"
                  value={editingOrder.foreign_bond_name}
                  disabled
                  className="input w-full bg-gray-100"
                />
              </div>
              
              {/* Available Vehicles */}
              {selectedBond && (
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">
                    Available Vehicles ({bondVehicles.length})
                  </h3>
                  {bondVehicles.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No available vehicles from this bond</p>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-auto border rounded-lg">
                      {Object.entries(groupedVehicles).map(([make, models]) => {
                        const totalUnits = Object.values(models).flat().length;
                        const totalValue = Object.values(models).flat().reduce((sum, v) => sum + (v.purchase_price_usd || 0), 0);
                        
                        return (
                          <div key={make} className="border-b last:border-b-0">
                            {/* Make Header */}
                            <div
                              onClick={() => toggleMake(make)}
                              className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                {expandedMakes[make] ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                                <span className="font-bold text-lg">{make}</span>
                                <span className="text-sm text-gray-600">
                                  ({totalUnits} units, {Object.keys(models).length} models)
                                </span>
                              </div>
                              <span className="text-sm font-semibold text-blue-600">
                                ${totalValue.toLocaleString()}
                              </span>
                            </div>
                            
                            {/* Models */}
                            {expandedMakes[make] && (
                              <div className="bg-white">
                                {Object.entries(models).map(([model, vehicles]) => {
                                  const modelKey = `${make}-${model}`;
                                  const modelValue = vehicles.reduce((sum, v) => sum + (v.purchase_price_usd || 0), 0);
                                  
                                  return (
                                    <div key={modelKey} className="border-t">
                                      {/* Model Header */}
                                      <div
                                        onClick={() => toggleModel(make, model)}
                                        className="flex items-center justify-between p-3 pl-8 bg-gray-50/50 hover:bg-gray-100/50 cursor-pointer"
                                      >
                                        <div className="flex items-center gap-2">
                                          {expandedModels[modelKey] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                          <span className="font-semibold">{model}</span>
                                          <span className="text-sm text-gray-600">
                                            ({vehicles.reduce((s,v) => s + (v.quantity||1), 0)} units in stock)
                                          </span>
                                        </div>
                                        <span className="text-sm font-semibold text-blue-600">
                                          ${modelValue.toLocaleString()}
                                        </span>
                                      </div>
                                      
                                      {/* Individual Units */}
                                      {expandedModels[modelKey] && (
                                        <div className="divide-y">
                                          {vehicles.map(vehicle => (
                                            <div
                                              key={vehicle.id}
                                              className={`p-3 pl-12 cursor-pointer transition-all ${
                                                selectedVehicles.includes(vehicle.id)
                                                  ? 'bg-blue-50 border-l-4 border-blue-500'
                                                  : 'hover:bg-gray-50'
                                              }`}
                                              onClick={() => toggleVehicle(vehicle.id)}
                                            >
                                              <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3 flex-1">
                                                  <input
                                                    type="checkbox"
                                                    checked={selectedVehicles.includes(vehicle.id)}
                                                    onChange={() => toggleVehicle(vehicle.id)}
                                                    className="w-4 h-4 text-blue-600"
                                                  />
                                                  <div className="flex-1">
                                                    <p className="font-medium text-gray-900">
                                                      {vehicle.year} - {vehicle.color}
                                                    </p>
                                                    <p className="text-sm text-gray-600">
                                                      {vehicle.engine_cc}cc • {vehicle.transmission} • {vehicle.fuel_type}
                                                    </p>
                                                    <p className="text-xs text-gray-500 font-mono mt-1">
                                                      {vehicle.chassis_number}
                                                    </p>
                                                    <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded mt-1 inline-block">
                                                      In Stock: {vehicle.quantity || 1} units
                                                    </span>
                                                  </div>
                                                </div>
                                                <div className="text-right ml-4">
                                                  <p className="text-lg font-bold text-blue-600">
                                                    ${vehicle.purchase_price_usd?.toLocaleString()}
                                                  </p>
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              
              {/* Order Summary */}
              {selectedVehicles.length > 0 && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-2">Order Summary</h3>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">
                      {selectedVehicles.length} vehicle(s) selected
                    </span>
                    <span className="text-xl font-bold text-blue-600">
                      Total: $
                      {bondVehicles
                        .filter(v => selectedVehicles.includes(v.id))
                        .reduce((sum, v) => sum + (v.purchase_price_usd || 0), 0)
                        .toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50">
              <button
                onClick={() => { setShowEditModal(false); setEditingOrder(null); }}
                className="btn-secondary"
                disabled={creating}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateOrder}
                className="btn-primary"
                disabled={creating || selectedVehicles.length === 0}
              >
                {creating ? 'Updating...' : `Update Order (${selectedVehicles.length} vehicles)`}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete Order?</h3>
                  <p className="text-sm text-gray-500">#{selectedOrder.order_number}</p>
                </div>
              </div>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this order? This will restore all vehicles to available inventory. This action cannot be undone.
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteOrder}
                  className="btn bg-red-500 hover:bg-red-600 text-white"
                >
                  Delete Order
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
