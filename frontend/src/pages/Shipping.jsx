import { useState, useEffect } from 'react';
import { getShipments, searchByBL, updateOrderStatus } from '../api';
import { Ship, Search, Anchor, MapPin, Calendar, Package, X, Navigation, Truck, CheckCircle } from 'lucide-react';
import TrackingTimeline from '../components/TrackingTimeline';

export default function Shipping() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [searchBL, setSearchBL] = useState('');
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [showTracking, setShowTracking] = useState(false);
  const [trackingOrderId, setTrackingOrderId] = useState(null);

  useEffect(() => {
    fetchShipments();
  }, [filter]);

  const fetchShipments = async () => {
    setLoading(true);
    try {
      const params = filter ? { status: filter } : {};
      const res = await getShipments(params);
      setShipments(res.data.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchBL = async (e) => {
    e.preventDefault();
    if (!searchBL.trim()) {
      fetchShipments();
      return;
    }
    setLoading(true);
    try {
      const res = await searchByBL(searchBL);
      setShipments(res.data.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const statuses = ['Pending', 'In Transit', 'Arrived', 'Delivered'];

  const getStatusColor = (status) => {
    switch (status) {
      case 'Delivered': return 'badge-green';
      case 'Arrived': return 'badge-blue';
      case 'In Transit': return 'badge-yellow';
      default: return 'badge-gray';
    }
  };
  
  const handleUpdateStatus = async (orderId, newStatus) => {
    if (!confirm(`Update order status to "${newStatus}"? This will update all vehicle statuses.`)) return;
    
    try {
      await updateOrderStatus(orderId, newStatus);
      alert(`Status updated to ${newStatus}!`);
      fetchShipments();
      setSelectedShipment(null);
    } catch (error) {
      console.error('Failed to update status:', error);
      alert(error.response?.data?.error || 'Failed to update status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Shipping</h1>
          <p className="text-gray-500">Track shipments from suppliers to your location</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="card">
        <div className="flex flex-wrap gap-4">
          <form onSubmit={handleSearchBL} className="flex-1 min-w-[250px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by BL number or container..."
                value={searchBL}
                onChange={(e) => setSearchBL(e.target.value)}
                className="input pl-10"
              />
            </div>
          </form>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="input w-40"
          >
            <option value="">All Status</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {shipments.length === 0 ? (
            <div className="col-span-2 card text-center py-12">
              <Ship className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No shipments found</p>
            </div>
          ) : (
            shipments.map((shipment) => (
              <div key={shipment.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Ship className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{shipment.vessel_name}</h3>
                      <p className="text-sm text-gray-500">Order: {shipment.order_number}</p>
                    </div>
                  </div>
                  <span className={`badge ${getStatusColor(shipment.shipping_status)}`}>
                    {shipment.shipping_status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500">BL Number</p>
                    <p className="font-mono text-sm">{shipment.bl_number}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Container</p>
                    <p className="font-mono text-sm">{shipment.container_number}</p>
                  </div>
                </div>

                {/* Route visualization */}
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg mb-4">
                  <div className="text-center flex-1">
                    <Anchor className="w-4 h-4 text-blue-600 mx-auto" />
                    <p className="text-xs font-medium mt-1">{shipment.departure_port?.split(',')[0]}</p>
                    <p className="text-xs text-gray-500">
                      {shipment.departure_date && new Date(shipment.departure_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex-1 border-t-2 border-dashed border-blue-300 relative">
                    <Ship className="w-4 h-4 text-blue-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-50" />
                  </div>
                  <div className="text-center flex-1">
                    <MapPin className="w-4 h-4 text-green-600 mx-auto" />
                    <p className="text-xs font-medium mt-1">{shipment.arrival_port?.split(',')[0]}</p>
                    <p className="text-xs text-gray-500">
                      {shipment.actual_arrival 
                        ? new Date(shipment.actual_arrival).toLocaleDateString()
                        : `ETA: ${shipment.estimated_arrival ? new Date(shipment.estimated_arrival).toLocaleDateString() : 'TBD'}`
                      }
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Package className="w-4 h-4" />
                    <span>{shipment.vehicle_count} vehicles</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setTrackingOrderId(shipment.order_id);
                        setShowTracking(true);
                      }}
                      className="text-sm text-green-600 hover:text-green-800 flex items-center gap-1"
                    >
                      <Navigation className="w-3 h-3" />
                      Track
                    </button>
                    <button
                      onClick={() => setSelectedShipment(shipment)}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Shipment Detail Modal */}
      {selectedShipment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h2 className="text-lg font-semibold">{selectedShipment.vessel_name}</h2>
                <p className="text-sm text-gray-500">BL: {selectedShipment.bl_number}</p>
              </div>
              <button onClick={() => setSelectedShipment(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Container</p>
                  <p className="font-mono">{selectedShipment.container_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className={`badge ${getStatusColor(selectedShipment.shipping_status)}`}>
                    {selectedShipment.shipping_status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Departure</p>
                  <p>{selectedShipment.departure_port}</p>
                  <p className="text-xs text-gray-400">
                    {selectedShipment.departure_date && new Date(selectedShipment.departure_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Arrival</p>
                  <p>{selectedShipment.arrival_port}</p>
                  <p className="text-xs text-gray-400">
                    {selectedShipment.actual_arrival 
                      ? `Arrived: ${new Date(selectedShipment.actual_arrival).toLocaleDateString()}`
                      : `ETA: ${selectedShipment.estimated_arrival ? new Date(selectedShipment.estimated_arrival).toLocaleDateString() : 'TBD'}`
                    }
                  </p>
                </div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Supplier → Dealership</p>
                <p className="font-medium">{selectedShipment.foreign_bond_name} → {selectedShipment.dealership_name}</p>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t">
                {selectedShipment.order_status !== 'At Border' && selectedShipment.order_status !== 'Cleared' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedShipment.order_id, 'At Border')}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                  >
                    <Truck className="w-4 h-4" />
                    Mark at Border
                  </button>
                )}
                {selectedShipment.order_status === 'At Border' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedShipment.order_id, 'Cleared')}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Mark Cleared
                  </button>
                )}
                {selectedShipment.order_status === 'Cleared' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedShipment.order_id, 'Delivered')}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Mark Delivered
                  </button>
                )}
              </div>
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
    </div>
  );
}
