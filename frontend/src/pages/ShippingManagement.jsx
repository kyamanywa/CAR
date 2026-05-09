import { useState, useEffect } from 'react';
import { getShipments, createShipment, updateShipmentStatus, getImportOrders } from '../api';
import { Ship, Plus, Search, Anchor, MapPin, Calendar, X, Edit } from 'lucide-react';

export default function ShippingManagement() {
  const [shipments, setShipments] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [searchBL, setSearchBL] = useState('');
  
  const [formData, setFormData] = useState({
    order_id: '',
    bl_number: '',
    container_number: '',
    vessel_name: '',
    departure_port: '',
    arrival_port: 'Mombasa, Kenya',
    departure_date: '',
    estimated_arrival: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [shipmentsRes, ordersRes] = await Promise.all([
        getShipments({}),
        getImportOrders({ status: 'Shipped' })
      ]);
      setShipments(shipmentsRes.data.data);
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
        await updateShipmentStatus(editing.id, formData);
        alert('Shipment updated!');
      } else {
        await createShipment(formData);
        alert('Shipping record created!');
      }
      setShowForm(false);
      setEditing(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error:', error);
      alert(error.response?.data?.error || 'Failed to save shipment');
    }
  };

  const resetForm = () => {
    setFormData({
      order_id: '',
      bl_number: '',
      container_number: '',
      vessel_name: '',
      departure_port: '',
      arrival_port: 'Mombasa, Kenya',
      departure_date: '',
      estimated_arrival: ''
    });
  };

  const handleEdit = (shipment) => {
    setEditing(shipment);
    setFormData({
      order_id: shipment.order_id,
      bl_number: shipment.bl_number || '',
      container_number: shipment.container_number || '',
      vessel_name: shipment.vessel_name || '',
      departure_port: shipment.departure_port || '',
      arrival_port: shipment.arrival_port || 'Mombasa, Kenya',
      departure_date: shipment.departure_date ? shipment.departure_date.split('T')[0] : '',
      estimated_arrival: shipment.estimated_arrival ? shipment.estimated_arrival.split('T')[0] : ''
    });
    setShowForm(true);
  };

  const filteredShipments = shipments.filter(s =>
    !searchBL || s.bl_number?.toLowerCase().includes(searchBL.toLowerCase()) ||
    s.container_number?.toLowerCase().includes(searchBL.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Shipping Management</h1>
          <p className="text-gray-500">Create and manage shipping records</p>
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
          New Shipment
        </button>
      </div>

      {/* Search */}
      <div className="card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by BL or Container number..."
            value={searchBL}
            onChange={(e) => setSearchBL(e.target.value)}
            className="input pl-10 w-full"
          />
        </div>
      </div>

      {/* Shipments Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 text-left text-sm font-semibold">Order</th>
              <th className="p-4 text-left text-sm font-semibold">BL / Container</th>
              <th className="p-4 text-left text-sm font-semibold">Vessel</th>
              <th className="p-4 text-left text-sm font-semibold">Route</th>
              <th className="p-4 text-left text-sm font-semibold">Dates</th>
              <th className="p-4 text-left text-sm font-semibold">Status</th>
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
            ) : filteredShipments.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-8 text-center text-gray-500">
                  <Ship className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  No shipments found
                </td>
              </tr>
            ) : (
              filteredShipments.map((ship) => (
                <tr key={ship.id} className="hover:bg-gray-50">
                  <td className="p-4">
                    <p className="font-medium">{ship.order_number}</p>
                    <p className="text-xs text-gray-500">{ship.dealership_name}</p>
                  </td>
                  <td className="p-4 font-mono text-sm">
                    <p>{ship.bl_number || '-'}</p>
                    <p className="text-xs text-gray-500">{ship.container_number || '-'}</p>
                  </td>
                  <td className="p-4">{ship.vessel_name || '-'}</td>
                  <td className="p-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Anchor className="w-3 h-3 text-blue-500" />
                      <span>{ship.departure_port?.split(',')[0] || '-'}</span>
                      <span>→</span>
                      <MapPin className="w-3 h-3 text-green-500" />
                      <span>{ship.arrival_port?.split(',')[0] || '-'}</span>
                    </div>
                  </td>
                  <td className="p-4 text-xs">
                    <p>Dep: {ship.departure_date ? new Date(ship.departure_date).toLocaleDateString() : '-'}</p>
                    <p className="text-gray-500">
                      ETA: {ship.estimated_arrival ? new Date(ship.estimated_arrival).toLocaleDateString() : '-'}
                    </p>
                  </td>
                  <td className="p-4">
                    <span className={`badge ${
                      ship.shipping_status === 'Delivered' ? 'badge-green' :
                      ship.shipping_status === 'Arrived' ? 'badge-blue' :
                      ship.shipping_status === 'In Transit' ? 'badge-yellow' : 'badge-gray'
                    }`}>
                      {ship.shipping_status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleEdit(ship)}
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
                {editing ? 'Edit Shipment' : 'Create New Shipment'}
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
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">BL Number</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.bl_number}
                      onChange={(e) => setFormData({ ...formData, bl_number: e.target.value })}
                      className="input flex-1"
                      placeholder="BL-ORD-XXXXX-XXXXXX"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const order = orders.find(o => o.id == formData.order_id);
                        if (order) {
                          const suggested = `BL-${order.order_number}-${Date.now()}`;
                          setFormData({ ...formData, bl_number: suggested });
                        }
                      }}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm whitespace-nowrap"
                      disabled={!formData.order_id}
                    >
                      Generate
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Optional - Click Generate for suggested format</p>
                </div>

                <div>
                  <label className="label">Container Number</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.container_number}
                      onChange={(e) => setFormData({ ...formData, container_number: e.target.value })}
                      className="input flex-1"
                      placeholder="CONT-XXXXXX"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const suggested = `CONT-${Date.now().toString().slice(-6)}`;
                        setFormData({ ...formData, container_number: suggested });
                      }}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm whitespace-nowrap"
                    >
                      Generate
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Optional - Click Generate for suggested format</p>
                </div>
              </div>

              <div>
                <label className="label">Vessel Name</label>
                <input
                  type="text"
                  value={formData.vessel_name}
                  onChange={(e) => setFormData({ ...formData, vessel_name: e.target.value })}
                  className="input"
                  placeholder="Enter vessel/ship name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Departure Port *</label>
                  <input
                    type="text"
                    required
                    value={formData.departure_port}
                    onChange={(e) => setFormData({ ...formData, departure_port: e.target.value })}
                    className="input"
                    placeholder="e.g., Tokyo, Japan"
                  />
                </div>

                <div>
                  <label className="label">Arrival Port *</label>
                  <input
                    type="text"
                    required
                    value={formData.arrival_port}
                    onChange={(e) => setFormData({ ...formData, arrival_port: e.target.value })}
                    className="input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Departure Date</label>
                  <input
                    type="date"
                    value={formData.departure_date}
                    onChange={(e) => setFormData({ ...formData, departure_date: e.target.value })}
                    className="input"
                  />
                </div>

                <div>
                  <label className="label">Estimated Arrival</label>
                  <input
                    type="date"
                    value={formData.estimated_arrival}
                    onChange={(e) => setFormData({ ...formData, estimated_arrival: e.target.value })}
                    className="input"
                  />
                </div>
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
                  {editing ? 'Update Shipment' : 'Create Shipment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
